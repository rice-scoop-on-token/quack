const TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const TRANSCRIPTION_MODEL = "gpt-transcribe";
const TRANSCRIPTION_TIMEOUT_MS = 30_000;

export type TranscribeAudioOptions = {
  apiKey: string;
  keywords?: readonly string[];
  transport?: (request: Request) => Promise<Response>;
};

export type TranscribeAudioResult =
  | { ok: true; text: string }
  | {
    ok: false;
    code:
      | "MISSING_API_KEY"
      | "EMPTY_AUDIO"
      | "EMPTY_TRANSCRIPT"
      | "INVALID_RESPONSE"
      | "NETWORK_ERROR"
      | "TIMEOUT";
  }
  | { ok: false; code: "HTTP_ERROR"; status: number };

function hasTranscript(value: unknown): value is { text: string } {
  return typeof value === "object" && value !== null &&
    "text" in value && typeof value.text === "string";
}

export async function transcribeAudio(
  audio: File,
  options: TranscribeAudioOptions,
): Promise<TranscribeAudioResult> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) return { ok: false, code: "MISSING_API_KEY" };
  if (!audio.size) return { ok: false, code: "EMPTY_AUDIO" };

  const body = new FormData();
  body.set("model", TRANSCRIPTION_MODEL);
  body.set("file", audio);
  body.append("languages[]", "ko");
  for (const keyword of options.keywords ?? []) {
    body.append("keywords[]", keyword);
  }

  const signal = AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS);
  const request = new Request(TRANSCRIPTION_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
    signal,
    redirect: "error",
  });

  try {
    const response = await (options.transport ?? fetch)(request);
    if (!response.ok) {
      return { ok: false, code: "HTTP_ERROR", status: response.status };
    }

    const payload: unknown = await response.json();
    if (!hasTranscript(payload)) return { ok: false, code: "INVALID_RESPONSE" };
    if (!payload.text.trim()) return { ok: false, code: "EMPTY_TRANSCRIPT" };
    return { ok: true, text: payload.text };
  } catch (error) {
    if (signal.aborted) return { ok: false, code: "TIMEOUT" };
    if (error instanceof SyntaxError) {
      return { ok: false, code: "INVALID_RESPONSE" };
    }
    return { ok: false, code: "NETWORK_ERROR" };
  }
}
