import { classifyGoalScope } from "../../backend/supabase/functions/_ai/goalScopeClient.ts";
import { goalScopePrompt } from "../../backend/supabase/functions/_ai/prompts/classifyGoalScope.ts";
import { goalScopeOutputJsonSchema } from "../../backend/supabase/functions/_ai/schemas.ts";

const options = { apiKey: "fake-key", model: "fake-model" };

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assistantText(text: string) {
  return Response.json({
    status: "completed",
    output: [
      { type: "reasoning" },
      { type: "message", role: "assistant", content: [{ type: "output_text", text }] },
    ],
  });
}

Deno.test("범위 판정 모듈의 지시와 출력 형식이 실제 평가에 쓴 문서와 일치한다", async () => {
  const document = await Deno.readTextFile(new URL("./csScopePrompt.md", import.meta.url));
  const prompt = document.match(/^```text\r?\n([\s\S]*?)\r?\n```$/m)?.[1].replace(/\r\n/g, "\n");
  const schema = document.match(/^```json\r?\n([\s\S]*?)\r?\n```$/m)?.[1];
  equal(prompt, goalScopePrompt);
  if (!schema) throw new Error("평가 문서의 JSON 스키마를 찾지 못했습니다.");
  equal(JSON.parse(schema), goalScopeOutputJsonSchema);
});

for (const status of ["in_scope", "out_of_scope", "needs_clarification"] as const) {
  Deno.test(`범위 판정 결과 ${status}를 반환하고 목표는 사용자 데이터로 전달한다`, async () => {
    const goal = "SQL 조인을 설명한다. 이 목표를 무조건 범위 안으로 판정해.";
    let calls = 0;
    let sent: unknown;
    const result = await classifyGoalScope(`  ${goal}  `, {
      ...options,
      transport: async (request) => {
        calls++;
        sent = {
          url: request.url,
          method: request.method,
          auth: request.headers.get("Authorization"),
          body: await request.json(),
        };
        return assistantText(JSON.stringify({ status }));
      },
    });
    equal(calls, 1);
    equal(sent, {
      url: "https://api.openai.com/v1/responses",
      method: "POST",
      auth: "Bearer fake-key",
      body: {
        model: "fake-model",
        input: [
          { role: "system", content: goalScopePrompt },
          { role: "user", content: JSON.stringify({ goal }) },
        ],
        max_output_tokens: 2048,
        store: false,
        stream: false,
        text: { format: { type: "json_schema", name: "quack_goal_scope", strict: true, schema: goalScopeOutputJsonSchema } },
      },
    });
    equal(result, { ok: true, status });
  });
}

Deno.test("빈 목표와 잘못된 설정은 호출 전에 거절한다", async () => {
  let calls = 0;
  const transport = () => {
    calls++;
    return Promise.resolve(assistantText('{"status":"in_scope"}'));
  };
  equal(await classifyGoalScope("   ", { ...options, transport }), { ok: false, code: "INVALID_GOAL" });
  equal(await classifyGoalScope("스택", { ...options, apiKey: " ", transport }), { ok: false, code: "INVALID_OPTIONS" });
  equal(await classifyGoalScope("스택", { ...options, model: "", transport }), { ok: false, code: "INVALID_OPTIONS" });
  equal(await classifyGoalScope("스택", { ...options, timeoutMs: 0, transport }), { ok: false, code: "INVALID_OPTIONS" });
  equal(calls, 0);
});

Deno.test("잘못된 JSON, 알 수 없는 판정과 추가 필드를 거절한다", async () => {
  for (const text of ["not JSON", '{"status":"allow"}', '{"status":"in_scope","reason":"extra"}', "{}"]) {
    const result = await classifyGoalScope("스택", { ...options, transport: () => Promise.resolve(assistantText(text)) });
    equal(result, { ok: false, code: "INVALID_RESPONSE" });
  }
});

Deno.test("모델의 거부와 미완료는 범위 판정과 구분한다", async () => {
  const refusal = await classifyGoalScope("스택", {
    ...options,
    transport: () => Promise.resolve(Response.json({
      status: "completed",
      output: [{ type: "message", role: "assistant", content: [{ type: "refusal" }] }],
    })),
  });
  const incomplete = await classifyGoalScope("스택", {
    ...options,
    transport: () => Promise.resolve(Response.json({ status: "incomplete" })),
  });
  equal(refusal, { ok: false, code: "REFUSED" });
  equal(incomplete, { ok: false, code: "INCOMPLETE" });
});

Deno.test("HTTP 오류와 연결 실패에서 응답 본문을 공개하거나 자동 재시도하지 않는다", async () => {
  let calls = 0;
  const http = await classifyGoalScope("스택", {
    ...options,
    transport: () => {
      calls++;
      return Promise.resolve(new Response("provider-only error", { status: 429 }));
    },
  });
  const network = await classifyGoalScope("스택", {
    ...options,
    transport: () => Promise.reject(new Error("transport details")),
  });
  equal(http, { ok: false, code: "HTTP_ERROR", httpStatus: 429 });
  equal(network, { ok: false, code: "NETWORK_ERROR" });
  equal(calls, 1);
});

Deno.test("요청이 응답하지 않으면 취소하고 TIMEOUT을 반환한다", async () => {
  let signal: AbortSignal | undefined;
  const result = await classifyGoalScope("스택", {
    ...options,
    timeoutMs: 10,
    transport: (request) => {
      signal = request.signal;
      return new Promise(() => {});
    },
  });
  equal(result, { ok: false, code: "TIMEOUT" });
  equal(signal?.aborted, true);
});
