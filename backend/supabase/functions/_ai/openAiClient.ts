import { z } from "zod";
import {
  buildAnalyzeExplanationMessages,
} from "./prompts/analyzeExplanation.ts";
import {
  type AiAnalysisOutput,
  aiAnalysisOutputJsonSchema,
  validateAiAnalysisOutput,
} from "./schemas.ts";

const text = z.string().refine((value) => value.trim().length > 0);
const inputSchema = z.strictObject({
  learning_goal: text,
  reference_materials: z.array(z.strictObject({
    material_id: text,
    title: text,
    content: text,
  })),
  user_message: text,
  conversation_history: z.array(z.strictObject({
    role: z.enum(["user", "assistant"]),
    content: text,
  })),
  species_id: z.enum(["rubber_duck", "raccoon", "cat"]),
});
const usageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
});
const envelopeSchema = z.object({
  status: z.string(),
  output: z.array(z.object({
    type: z.string(),
    role: z.string().optional(),
    status: z.string().optional(),
    content: z.array(z.discriminatedUnion("type", [
      z.object({ type: z.literal("output_text"), text: z.string() }),
      z.object({ type: z.literal("refusal"), refusal: z.string() }),
    ])).optional(),
  })).optional(),
  usage: usageSchema.nullable().optional(),
});

const errorMessages = {
  MISSING_API_KEY: "AI 호출에 필요한 API 키가 설정되지 않았습니다.",
  INVALID_OPTIONS: "모델·출력 토큰 한도·대기 시간 설정을 확인해 주세요.",
  INVALID_INPUT: "평가 입력의 필드와 내용을 확인해 주세요.",
  HTTP_ERROR: "OpenAI API가 요청을 거절했습니다. 상태 코드를 확인해 주세요.",
  NETWORK_ERROR: "OpenAI API에 연결하지 못했습니다.",
  TIMEOUT: "설정한 응답 대기 시간을 넘었습니다.",
  REFUSED: "모델이 응답을 거부했습니다.",
  INCOMPLETE: "모델 응답이 끝까지 생성되지 않았습니다.",
  INVALID_RESPONSE: "OpenAI 응답 형식을 확인하지 못했습니다.",
  INVALID_JSON: "모델 출력을 JSON으로 읽지 못했습니다.",
  INVALID_ANALYSIS: "모델 출력이 평가용 분석 구조나 조합 규칙에 맞지 않습니다.",
} as const;

export type OpenAiFailureCode = keyof typeof errorMessages;
export type OpenAiTransport = (request: Request) => Promise<Response>;
export interface OpenAiAnalysisOptions {
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  timeoutMs?: number;
  transport?: OpenAiTransport;
}
export type OpenAiAnalysisResult =
  & {
    elapsed_ms: number;
    usage: z.infer<typeof usageSchema> | null;
  }
  & ({ ok: true; output: AiAnalysisOutput } | {
    ok: false;
    code: OpenAiFailureCode;
    message: string;
    http_status?: number;
  });

// zod가 생성한 oneOf는 태그 값이 서로 달라 anyOf로 표현해도 같은 형태를 허용한다.
// API 요청용 스키마만 조정하고 수신 후에는 기존의 엄격한 검증을 그대로 사용한다.
function structuredOutputSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(structuredOutputSchema);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "$schema")
      .map(([key, child]) =>
        key === "const"
          ? ["enum", [child]]
          : [key === "oneOf" ? "anyOf" : key, structuredOutputSchema(child)]
      ),
  );
}

export async function analyzeExplanation(
  input: unknown,
  options: OpenAiAnalysisOptions,
): Promise<OpenAiAnalysisResult> {
  const started = performance.now();
  let usage: z.infer<typeof usageSchema> | null = null;
  const fail = (
    code: OpenAiFailureCode,
    httpStatus?: number,
  ): OpenAiAnalysisResult => ({
    ok: false,
    code,
    message: errorMessages[code],
    usage,
    elapsed_ms: Math.round(performance.now() - started),
    ...(httpStatus === undefined ? {} : { http_status: httpStatus }),
  });
  if (!options.apiKey.trim()) return fail("MISSING_API_KEY");
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (
    !options.model.trim() || !Number.isSafeInteger(options.maxOutputTokens) ||
    options.maxOutputTokens < 1 || !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 || timeoutMs > 120_000
  ) return fail("INVALID_OPTIONS");
  const validatedInput = inputSchema.safeParse(input);
  if (!validatedInput.success) return fail("INVALID_INPUT");

  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<OpenAiAnalysisResult>((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      resolve(fail("TIMEOUT"));
    }, timeoutMs);
  });
  const requestOnce = async (): Promise<OpenAiAnalysisResult> => {
    try {
      const request = new Request("https://api.openai.com/v1/responses", {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${options.apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.model.trim(),
          input: buildAnalyzeExplanationMessages(validatedInput.data),
          max_output_tokens: options.maxOutputTokens,
          store: false,
          stream: false,
          truncation: "disabled",
          text: {
            format: {
              type: "json_schema",
              name: "quack_analysis_draft",
              strict: true,
              schema: structuredOutputSchema(aiAnalysisOutputJsonSchema),
            },
          },
        }),
      });
      const response = await (options.transport ?? fetch)(request);
      // 제공자 오류 본문·키·학습 자료는 반환하거나 로그에 남기지 않는다.
      if (!response.ok) return fail("HTTP_ERROR", response.status);
      let raw: unknown;
      try {
        raw = await response.json();
      } catch {
        return fail("INVALID_RESPONSE");
      }
      const parsed = envelopeSchema.safeParse(raw);
      if (!parsed.success) return fail("INVALID_RESPONSE");
      usage = parsed.data.usage ?? null;
      if (parsed.data.status === "incomplete") return fail("INCOMPLETE");
      if (parsed.data.status !== "completed" || !parsed.data.output) {
        return fail("INVALID_RESPONSE");
      }
      const messages = parsed.data.output.filter((item) =>
        item.type === "message"
      );
      if (
        messages.some((item) =>
          item.content?.some((part) => part.type === "refusal")
        )
      ) return fail("REFUSED");
      if (
        messages.length !== 1 || messages[0].role !== "assistant" ||
        messages[0].status !== "completed" || !messages[0].content
      ) return fail("INVALID_RESPONSE");
      const contents = messages[0].content;
      if (contents.length !== 1 || contents[0].type !== "output_text") {
        return fail("INVALID_RESPONSE");
      }
      let analysis: unknown;
      try {
        analysis = JSON.parse(contents[0].text);
      } catch {
        return fail("INVALID_JSON");
      }
      const validated = validateAiAnalysisOutput(analysis);
      if (!validated.success) return fail("INVALID_ANALYSIS");
      return {
        ok: true,
        output: validated.data,
        usage,
        elapsed_ms: Math.round(performance.now() - started),
      };
    } catch {
      return fail(timedOut ? "TIMEOUT" : "NETWORK_ERROR");
    }
  };
  try {
    return await Promise.race([requestOnce(), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
