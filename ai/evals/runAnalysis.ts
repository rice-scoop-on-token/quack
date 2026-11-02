import { z } from "zod";
import {
  analyzeExplanation,
  type OpenAiAnalysisOptions,
  type OpenAiFailureCode,
  type OpenAiTransport,
} from "../../backend/supabase/functions/_ai/openAiClient.ts";
import type { AnalyzeExplanationInput } from "../../backend/supabase/functions/_ai/prompts/analyzeExplanation.ts";
import { aiAnalysisOutputSchema } from "../../backend/supabase/functions/_ai/schemas.ts";

const sampleFileSchema = z.object({
  cases: z.array(z.object({
    id: z.string(),
    input: z.object({
      learning_goal: z.string(),
      learner_explanation: z.string(),
      reference_material: z.object({ kind: z.string(), text: z.string() })
        .nullable(),
    }),
  })),
});

async function mockInput(): Promise<AnalyzeExplanationInput> {
  const raw: unknown = JSON.parse(
    await Deno.readTextFile(new URL("./cases.json", import.meta.url)),
  );
  const sample = sampleFileSchema.parse(raw).cases.find((item) =>
    item.id === "binary-search-03-wrong-direction"
  );
  if (!sample) throw new Error("대표 입력을 찾지 못했습니다.");
  return {
    learning_goal: sample.input.learning_goal,
    user_message: sample.input.learner_explanation,
    reference_materials: sample.input.reference_material
      ? [{
        material_id: "binary-search-fixture",
        title: sample.input.reference_material.kind,
        content: sample.input.reference_material.text,
      }]
      : [],
    conversation_history: [],
    species_id: "rubber_duck",
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
        .join(",")
    }}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

export async function runMockChecks(): Promise<number> {
  const input = await mockInput();
  const document = await Deno.readTextFile(
    new URL("./outputDraft.md", import.meta.url),
  );
  const first = [...document.matchAll(/```json\s*([\s\S]*?)```/g)][0];
  if (!first) throw new Error("대표 출력 예시를 찾지 못했습니다.");
  const example: unknown = JSON.parse(first[1]);
  const output = aiAnalysisOutputSchema.parse(example);
  const completed = (value: string) => ({
    status: "completed",
    output: [{
      type: "message",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: value }],
    }],
    usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
  });
  const response = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status });
  const scenarios: {
    name: string;
    expected: OpenAiFailureCode | "success";
    transport: OpenAiTransport;
    options?: Partial<OpenAiAnalysisOptions>;
  }[] = [
    {
      name: "정상 출력",
      expected: "success",
      transport: async () => response(completed(JSON.stringify(output))),
    },
    {
      name: "키 누락",
      expected: "MISSING_API_KEY",
      options: { apiKey: "" },
      transport: async () => {
        throw new Error("호출하면 안 됨");
      },
    },
    {
      name: "잘못된 출력 한도",
      expected: "INVALID_OPTIONS",
      options: { maxOutputTokens: 0 },
      transport: async () => {
        throw new Error("호출하면 안 됨");
      },
    },
    {
      name: "HTTP 오류",
      expected: "HTTP_ERROR",
      transport: async () => response({ error: "표시하지 않을 원문" }, 429),
    },
    {
      name: "거부",
      expected: "REFUSED",
      transport: async () =>
        response({
          status: "completed",
          output: [{
            type: "message",
            content: [{ type: "refusal", refusal: "원문" }],
          }],
        }),
    },
    {
      name: "출력 중단",
      expected: "INCOMPLETE",
      transport: async () =>
        response({
          ...completed(JSON.stringify(output)),
          status: "incomplete",
        }),
    },
    {
      name: "응답 본문 JSON 오류",
      expected: "INVALID_RESPONSE",
      transport: async () => new Response("not-json"),
    },
    {
      name: "응답 구조 오류",
      expected: "INVALID_RESPONSE",
      transport: async () => response({ status: "completed", output: [] }),
    },
    {
      name: "모델 JSON 오류",
      expected: "INVALID_JSON",
      transport: async () => response(completed("not-json")),
    },
    {
      name: "분석 구조 오류",
      expected: "INVALID_ANALYSIS",
      transport: async () =>
        response(
          completed(
            JSON.stringify({
              ...output,
              response: { ...output.response, question: null },
            }),
          ),
        ),
    },
    {
      name: "연결 오류",
      expected: "NETWORK_ERROR",
      transport: async () => {
        throw new Error("표시하지 않을 연결 오류");
      },
    },
    {
      name: "시간 초과",
      expected: "TIMEOUT",
      options: { timeoutMs: 20 },
      transport: () => new Promise<Response>(() => {}),
    },
  ];

  for (const scenario of scenarios) {
    let calls = 0;
    let checkedRequests = 0;
    const result = await analyzeExplanation(input, {
      apiKey: "mock-only-key",
      model: "mock-model",
      maxOutputTokens: 256,
      ...scenario.options,
      transport: async (request) => {
        calls++;
        const body: unknown = await request.json();
        const wire = z.object({
          model: z.literal("mock-model"),
          store: z.literal(false),
          stream: z.literal(false),
          truncation: z.literal("disabled"),
          max_output_tokens: z.literal(256),
          input: z.array(
            z.object({ role: z.enum(["system", "user"]), content: z.string() }),
          ).length(2),
          text: z.object({
            format: z.object({
              type: z.literal("json_schema"),
              strict: z.literal(true),
              schema: z.unknown(),
            }),
          }),
        }).parse(body);
        if (
          request.url !== "https://api.openai.com/v1/responses" ||
          request.method !== "POST" ||
          request.redirect !== "error" ||
          request.headers.get("Authorization") !== "Bearer mock-only-key" ||
          JSON.stringify(wire.text.format.schema).includes('"oneOf"') ||
          canonicalJson(JSON.parse(wire.input[1].content)) !==
            canonicalJson(input)
        ) {
          throw new Error("요청 형식 검사 실패");
        }
        checkedRequests++;
        return await scenario.transport(request);
      },
    });
    const actual = result.ok ? "success" : result.code;
    const expectedCalls =
      ["MISSING_API_KEY", "INVALID_OPTIONS"].includes(scenario.expected)
        ? 0
        : 1;
    if (
      actual !== scenario.expected || calls !== expectedCalls ||
      checkedRequests !== calls ||
      (!result.ok && JSON.stringify(result).includes("표시하지 않을")) ||
      (result.ok &&
        (result.usage?.total_tokens !== 150 ||
          result.output.response.action !== "ask"))
    ) {
      throw new Error(
        `가짜 응답 검사 실패: ${scenario.name}, ${actual}, 요청 ${calls}회·형식 확인 ${checkedRequests}회`,
      );
    }
    console.log(`통과: ${scenario.name}`);
  }
  console.log(
    `가짜 응답 검사 ${scenarios.length}개 통과. 실제 모델 호출 없음.`,
  );
  return scenarios.length;
}

const help =
  "기본 실행 또는 --mock: 가짜 응답 검사. 실제 호출: --live --input <JSON 파일> --model <모델 ID> --max-output-tokens <양의 정수>. 실제 호출은 별도 승인 후 실행하세요.";

export async function runAnalysis(args: string[]): Promise<number> {
  if (args.length === 0 || (args.length === 1 && args[0] === "--mock")) {
    await runMockChecks();
    return 0;
  }
  if (args.length === 1 && args[0] === "--help") {
    console.log(help);
    return 0;
  }
  if (args[0] !== "--live") {
    console.error(help);
    return 1;
  }
  const flags = new Map<string, string>();
  for (let i = 1; i < args.length; i += 2) {
    if (
      !["--input", "--model", "--max-output-tokens"].includes(args[i]) ||
      !args[i + 1] || flags.has(args[i])
    ) {
      console.error(help);
      return 1;
    }
    flags.set(args[i], args[i + 1]);
  }
  const inputPath = flags.get("--input");
  const model = flags.get("--model")?.trim();
  const maxOutputTokens = Number(flags.get("--max-output-tokens"));
  if (
    !inputPath || !model || !Number.isSafeInteger(maxOutputTokens) ||
    maxOutputTokens < 1
  ) {
    console.error(help);
    return 1;
  }
  const apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!apiKey.trim()) {
    console.error(
      "OPENAI_API_KEY가 없습니다. 키를 채팅이나 커밋에 넣지 마세요.",
    );
    return 1;
  }
  let input: unknown;
  try {
    input = JSON.parse(await Deno.readTextFile(inputPath));
  } catch {
    console.error("평가 입력 JSON 파일을 읽지 못했습니다.");
    return 1;
  }
  // 클라이언트의 런타임 입력 검증을 통과하기 전에는 요청하지 않는다.
  const result = await analyzeExplanation(input, {
    apiKey,
    model,
    maxOutputTokens,
  });
  if (!result.ok) {
    console.error(JSON.stringify(result));
    return 1;
  }
  // 학습 자료·발화·모델 원문은 기본 실행 로그에서 제외한다.
  console.log(
    JSON.stringify({
      ok: true,
      model,
      elapsed_ms: result.elapsed_ms,
      usage: result.usage,
      answer: result.output.answer.status,
      understanding: result.output.understanding.status,
      independent_performance: result.output.independent_performance.status,
      action: result.output.response.action,
    }),
  );
  return 0;
}

if (import.meta.main) {
  try {
    Deno.exitCode = await runAnalysis(Deno.args);
  } catch {
    console.error(
      "평가 실행에 실패했습니다. 입력 파일·실행 권한·설정을 확인해 주세요.",
    );
    Deno.exitCode = 1;
  }
}
