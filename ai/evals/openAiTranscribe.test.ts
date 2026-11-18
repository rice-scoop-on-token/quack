import { deepStrictEqual, strictEqual } from "node:assert";
import { transcribeAudio } from "../../backend/supabase/functions/_ai/openAiTranscribe.ts";

for (
  const [filename, mimeType] of [
    ["explanation.m4a", "audio/mp4"],
    ["explanation.webm", "audio/webm"],
  ] as const
) {
  Deno.test(`전사 요청에 ${filename} 파일 정보와 용어 힌트를 보존한다`, async () => {
    const result = await transcribeAudio(
      new File([new Uint8Array([1, 2, 3])], filename, { type: mimeType }),
      {
        apiKey: "mock-key",
        keywords: ["이분 탐색", "O(log n)"],
        transport: async (request) => {
          strictEqual(
            request.url,
            "https://api.openai.com/v1/audio/transcriptions",
          );
          strictEqual(request.method, "POST");
          const form = await request.formData();
          strictEqual(form.get("model"), "gpt-transcribe");
          deepStrictEqual(form.getAll("languages[]"), ["ko"]);
          deepStrictEqual(form.getAll("keywords[]"), ["이분 탐색", "O(log n)"]);
          const file = form.get("file");
          if (!(file instanceof File)) throw new Error("파일 필드가 없습니다.");
          strictEqual(file.name, filename);
          strictEqual(file.type, mimeType);
          deepStrictEqual(
            new Uint8Array(await file.arrayBuffer()),
            new Uint8Array([1, 2, 3]),
          );
          return Response.json({
            text: "이분 탐색의 시간 복잡도는 O(log n)이야.",
          });
        },
      },
    );
    deepStrictEqual(result, {
      ok: true,
      text: "이분 탐색의 시간 복잡도는 O(log n)이야.",
    });
  });
}

const audio = new File(["sample"], "explanation.webm", { type: "audio/webm" });

Deno.test("공백뿐인 전사 결과를 빈 전사문으로 반환한다", async () => {
  const result = await transcribeAudio(audio, {
    apiKey: "mock-key",
    transport: () => Promise.resolve(Response.json({ text: "  " })),
  });
  deepStrictEqual(result, { ok: false, code: "EMPTY_TRANSCRIPT" });
});

Deno.test("API의 HTTP 오류를 빈 전사문과 구분한다", async () => {
  const result = await transcribeAudio(audio, {
    apiKey: "mock-key",
    transport: () => Promise.resolve(new Response(null, { status: 429 })),
  });
  deepStrictEqual(result, { ok: false, code: "HTTP_ERROR", status: 429 });
});

Deno.test("전사 필드가 빠진 응답을 잘못된 응답으로 반환한다", async () => {
  const result = await transcribeAudio(audio, {
    apiKey: "mock-key",
    transport: () => Promise.resolve(Response.json({})),
  });
  deepStrictEqual(result, { ok: false, code: "INVALID_RESPONSE" });
});
