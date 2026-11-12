import { analyzeExplanation } from "../../backend/supabase/functions/_ai/openAiClient.ts";
import { analyzeExplanationPrompt } from "../../backend/supabase/functions/_ai/prompts/analyzeExplanation.ts";
import { explanationAnalysisSchema } from "../../shared/src/api.ts";

const model = "gpt-6.1-sol";
const maxOutputTokens = 4096;
const timeoutMs = 30_000;
const repetitions = 3;
const concurrency = 4;
const architecture = Deno.args[0] === "--architecture";
const [mode, outputPath, ...extraArgs] = architecture ? Deno.args.slice(1) : Deno.args;
const live = mode === "--live";
if (extraArgs.length || (live ? !outputPath : mode !== "--plan" || outputPath)) {
  throw new Error("사용법: [--architecture] --plan 또는 [--architecture] --live <새 결과 JSONL 경로>");
}
const inputPath = architecture ? "ai/evals/inputs/csArchitectureCases.json" : "ai/evals/inputs/csSpecializationBatch.json";
const maxCalls = architecture ? 18 : 36;
const extraInstruction = "알고리즘의 종료 조건이나 경계 조건에서 오류가 드러나면, 학습자의 규칙을 적용했을 때 남은 상태를 짧게 보여주고, 그 상태에서 다음에 무엇을 확인할지 학습자가 자기 말로 설명할 수 있게 질문 하나를 한다.";
const insertBefore = "\ncorrect: 개념·접근은 충분하고";
const specializedPrompt = analyzeExplanationPrompt.replace(
  insertBefore,
  `\n${extraInstruction}${insertBefore}`,
);
if (specializedPrompt === analyzeExplanationPrompt) throw new Error("특화 지시 삽입 위치를 찾지 못했습니다.");

type Variant = "baseline" | "specialized";
type CaseSource = { id: string; inputFile: string } | {
  id: string;
  learning_goal: string;
  user_message: string;
};
const sources: CaseSource[] = JSON.parse(await Deno.readTextFile(inputPath));
const cases = await Promise.all(sources.map(async (source) => ({
  id: source.id,
  input: "inputFile" in source ? JSON.parse(await Deno.readTextFile(source.inputFile)) : {
    learning_goal: source.learning_goal,
    user_message: source.user_message,
    reference_materials: [],
    conversation_history: [],
    species_id: "rubber_duck",
  },
})));
const jobs = Array.from({ length: repetitions }, (_, round) =>
  cases.flatMap((item, index) => {
    const variants: Variant[] = (round + index) % 2 === 0
      ? ["specialized", "baseline"]
      : ["baseline", "specialized"];
    return variants.map((variant) => ({ ...item, variant, round: round + 1 }));
  })
).flat();
if (jobs.length !== maxCalls || new Set(cases.map((item) => item.id)).size !== cases.length) {
  throw new Error("사례 ID와 실행 횟수를 확인해 주세요.");
}

const apiKey = live ? Deno.env.get("OPENAI_API_KEY")?.trim() : "offline-plan-key";
if (!apiKey) throw new Error("평가용 API 키가 설정되지 않았습니다.");
if (live) Deno.openSync(outputPath, { write: true, createNew: true }).close();

let calls = 0;
let nextJob = 0;
let completed = 0;
let stop = false;

async function run(job: typeof jobs[number]) {
  let httpStatus: number | null = null;
  let sent = false;
  const result = await analyzeExplanation(job.input, {
    apiKey: apiKey!,
    model,
    maxOutputTokens,
    timeoutMs,
    transport: async (request) => {
      const body = await request.clone().json();
      if (body.input[0]?.role !== "system" || body.input[0].content !== analyzeExplanationPrompt ||
          body.input[1]?.role !== "user" || !body.text?.format?.strict ||
          body.model !== model || body.max_output_tokens !== maxOutputTokens) {
        throw new Error("기존 클라이언트 요청 형식이 달라졌습니다.");
      }
      if (job.variant === "specialized") body.input[0].content = specializedPrompt;
      const outgoing = job.variant === "baseline" ? request : new Request(request, { body: JSON.stringify(body) });
      if (sent || calls >= maxCalls) throw new Error("승인된 호출 범위를 넘었습니다.");
      sent = true;
      calls++;
      const response = live ? await fetch(outgoing) : new Response(null, { status: 418 });
      httpStatus = response.status;
      return response;
    },
  });
  if (!live && (result.ok || httpStatus !== 418)) {
    throw new Error(`오프라인 검증 실패: ${job.id} ${job.variant}`);
  }

  const sharedPass = result.ok && explanationAnalysisSchema.safeParse({
    answer_status: result.output.answer.status,
    understanding_status: result.output.understanding.status,
    independent_performance_status: result.output.independent_performance.status,
    response: result.output.response,
  }).success;
  if (live) {
    Deno.writeTextFileSync(outputPath, JSON.stringify({
      case_id: job.id,
      variant: job.variant,
      round: job.round,
      model,
      max_output_tokens: maxOutputTokens,
      request_attempted: sent,
      http_status: httpStatus,
      shared_contract_pass: sharedPass,
      result,
    }) + "\n", { append: true });
    console.log(`${job.id} ${job.variant} #${job.round}: ${result.ok ? "OK" : result.code}`);
    if (!sent || httpStatus === 401 || httpStatus === 403 || httpStatus === 429) stop = true;
  }
  completed++;
}

async function worker() {
  while (!stop && nextJob < jobs.length) {
    const job = jobs[nextJob++];
    await run(job);
  }
}

await run(jobs[nextJob++]);
await Promise.all(Array.from({ length: concurrency }, worker));
console.log(JSON.stringify({ planned: jobs.length, completed, live_requests: live ? calls : 0, stopped: stop }));
if (stop) Deno.exitCode = 1;
