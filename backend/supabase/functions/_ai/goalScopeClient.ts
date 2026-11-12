import { z } from "zod";

import type { OpenAiTransport } from "./openAiClient.ts";
import { goalScopePrompt } from "./prompts/classifyGoalScope.ts";
import {
  goalScopeOutputJsonSchema,
  goalScopeOutputSchema,
  type GoalScopeStatus,
} from "./schemas.ts";

export type GoalScopeOptions = {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  transport?: OpenAiTransport;
};

type GoalScopeFailureCode =
  | "INVALID_GOAL"
  | "INVALID_OPTIONS"
  | "HTTP_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INCOMPLETE"
  | "REFUSED"
  | "INVALID_RESPONSE";

type GoalScopeFailure = { ok: false; code: GoalScopeFailureCode; httpStatus?: number };
export type GoalScopeResult = { ok: true; status: GoalScopeStatus } | GoalScopeFailure;

const responseEnvelope = z.object({
  status: z.string(),
  output: z.array(z.object({
    type: z.string(),
    role: z.string().optional(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
  })).optional(),
});

// 범위 확인 실패를 정상 판정으로 처리하면 확인 없이 세션을 만들 수 있다.
export async function classifyGoalScope(goal: string, options: GoalScopeOptions): Promise<GoalScopeResult> {
  const normalizedGoal = goal.trim();
  const apiKey = options.apiKey.trim();
  const model = options.model.trim();
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!normalizedGoal) return { ok: false, code: "INVALID_GOAL" };
  if (!apiKey || !model || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    return { ok: false, code: "INVALID_OPTIONS" };
  }

  const controller = new AbortController();
  const timeoutResult = { ok: false, code: "TIMEOUT" } as const;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<GoalScopeFailure>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(timeoutResult);
    }, timeoutMs);
  });

  async function requestOnce(): Promise<GoalScopeResult> {
    let response: Response;
    try {
      const request = new Request("https://api.openai.com/v1/responses", {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          input: [
            { role: "system", content: goalScopePrompt },
            { role: "user", content: JSON.stringify({ goal: normalizedGoal }) },
          ],
          max_output_tokens: 2048,
          store: false,
          stream: false,
          text: {
            format: { type: "json_schema", name: "quack_goal_scope", strict: true, schema: goalScopeOutputJsonSchema },
          },
        }),
      });
      response = await (options.transport ?? fetch)(request);
    } catch {
      return controller.signal.aborted ? timeoutResult : { ok: false, code: "NETWORK_ERROR" };
    }
    if (!response.ok) return { ok: false, code: "HTTP_ERROR", httpStatus: response.status };

    try {
      const envelope = responseEnvelope.safeParse(await response.json());
      if (!envelope.success) return { ok: false, code: "INVALID_RESPONSE" };
      if (envelope.data.status === "incomplete") return { ok: false, code: "INCOMPLETE" };
      const messages = envelope.data.output?.filter((item) => item.type === "message") ?? [];
      if (messages.some((item) => item.content?.some((part) => part.type === "refusal"))) {
        return { ok: false, code: "REFUSED" };
      }
      const message = messages[0];
      const part = message?.content?.[0];
      if (envelope.data.status !== "completed" || messages.length !== 1 || message.role !== "assistant" ||
          message.content?.length !== 1 || part?.type !== "output_text" || part.text === undefined) {
        return { ok: false, code: "INVALID_RESPONSE" };
      }

      const parsed = goalScopeOutputSchema.safeParse(JSON.parse(part.text));
      return parsed.success ? { ok: true, status: parsed.data.status } : { ok: false, code: "INVALID_RESPONSE" };
    } catch {
      return controller.signal.aborted ? timeoutResult : { ok: false, code: "INVALID_RESPONSE" };
    }
  }

  try {
    return await Promise.race([requestOnce(), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
