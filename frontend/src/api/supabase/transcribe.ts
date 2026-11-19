import { SPEECH_AUDIO_FIELD, SPEECH_DURATION_FIELD, SPEECH_MAX_DURATION_MS, transcribeResponseSchema, type TranscribeResponse } from '@quack/shared';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { TranscribeAudio } from '@/api/tempContract';
import { ensureSignedIn, getSupabase } from '@/api/supabase/client';
import { readServerError } from '@/api/supabase/turns';

// 발표용 임시 연결. 음성 → 글 변환(POST /speech/transcribe)만 실제 서버로 보낸다. RemoteTurnsProvider가 mock의 transcribe 대신 이 함수를 쓴다.

// 서버의 STT 대기(30초)보다 길게 둔다. 앱이 먼저 포기하면 서버는 계속 처리 중이라 사용량이 이미 차감된다.
const TRANSCRIBE_TIMEOUT_MS = 45_000;

// 화면에 그대로 보여 줄 문장을 담은 에러. 다시 시도해도 풀리지 않는 오류는 문구가 재시도를 권하지 않는다.
export class TranscribeRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscribeRequestError';
  }
}

const MESSAGES = {
  unreadable: '녹음을 읽지 못했어요. 다시 녹음해 주세요.',
  unauthorized: '로그인 정보를 확인하지 못했어요. 앱을 다시 열어 주세요. 글로 설명해도 돼요.',
  tooLarge: '녹음이 너무 길어요. 짧게 나눠서 녹음해 주세요.',
  quota: '오늘 쓸 수 있는 음성 변환 횟수를 모두 썼어요. 글로 설명해 주세요.',
  server: '서버 설정에 문제가 있어요. 글로 설명해 주세요.',
  failed: '음성을 글로 바꾸지 못했어요. 다시 녹음하거나 글로 설명해 주세요.',
  network: '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.',
  timeout: '변환이 너무 오래 걸려요. 다시 녹음하거나 글로 설명해 주세요.',
} as const;

// 상태 코드를 먼저 본다. 게이트웨이·플랫폼 오류처럼 본문이 우리 오류 모양이 아니어도 상태로 나눈다.
function messageForStatus(status: number | undefined): string {
  switch (status) {
    case 400:
      return MESSAGES.unreadable;
    case 401:
      return MESSAGES.unauthorized;
    case 413:
      return MESSAGES.tooLarge;
    case 429:
      return MESSAGES.quota;
    case 500:
      return MESSAGES.server;
    default:
      // 502(STT 실패)와, 상태를 읽지 못했거나 목록에 없는 상태
      return MESSAGES.failed;
  }
}

const NATIVE_AUDIO_TYPE = 'audio/mp4';

// 네이티브 녹음 파일을 바이트로 읽는다. expo-file-system은 읽을 때 불러온다(지연 로드).
// 파일이 없거나 비었거나 읽기에 실패하면 서버를 부르기 전에 "녹음을 읽지 못했어요"로 처리한다.
async function readNativeBytes(uri: string): Promise<Uint8Array> {
  try {
    const { File } = await import('expo-file-system');
    const file = new File(uri);
    if (!file.exists) {
      throw new Error('녹음 파일이 없다');
    }
    const bytes = await file.bytes();
    if (bytes.length === 0) {
      throw new Error('녹음 파일이 비어 있다');
    }
    return bytes;
  } catch (e) {
    if (__DEV__) {
      console.warn('[transcribe] 녹음 파일을 읽지 못했어요:', e instanceof Error ? e.message : String(e));
    }
    throw new TranscribeRequestError(MESSAGES.unreadable);
  }
}

// 서버가 파트의 Content-Type만 보고(audio/webm, audio/mp4), 파일 이름은 보지 않는다.
// RN이 자동으로 붙이는 audio/x-m4a는 400이 나므로 type을 직접 지정한다.
async function buildForm(audio: TranscribeAudio): Promise<FormData> {
  const form = new FormData();
  const durationMs = Math.min(SPEECH_MAX_DURATION_MS, Math.max(1, Math.round(audio.durationMs)));

  if (Platform.OS === 'web') {
    // 웹의 uri는 blob 주소다. 녹음기가 준 형식(blob.type)을 그대로 쓰고, 비어 있으면 보내지 않는다.
    const blob = await (await fetch(audio.uri)).blob();
    if (!blob.type) {
      throw new TranscribeRequestError(MESSAGES.unreadable);
    }
    form.append(SPEECH_AUDIO_FIELD, blob, blob.type.startsWith('audio/mp4') ? 'audio.m4a' : 'audio.webm');
  } else {
    if (!audio.mimeType) {
      throw new TranscribeRequestError(MESSAGES.unreadable);
    }
    // 한계: SDK 58의 전역 fetch(expo/fetch)는 RN 파일 첨부({ uri, name, type })를 지원하지 않아서(convertFormData가 문자열·Blob·bytes()가 있는 객체만 받는다),
    // 파일을 바이트로 읽어 bytes()를 가진 파트로 보낸다. 파일 전체를 메모리로 읽는다(60초 m4a는 약 1MB).
    // 서버는 파트의 type만 보므로 type은 'audio/mp4'로 직접 지정한다. 타입을 맞추려고 단언을 쓴다. 폰(Expo Go)에서 보내 봐야 동작을 확인할 수 있다.
    const bytes = await readNativeBytes(audio.uri);
    form.append(SPEECH_AUDIO_FIELD, { name: 'audio.m4a', type: NATIVE_AUDIO_TYPE, bytes: () => Promise.resolve(bytes) } as unknown as Blob);
  }
  // 서버는 duration_ms를 문자열로 읽는다
  form.append(SPEECH_DURATION_FIELD, String(durationMs));
  return form;
}

// 전송 실패 원인 진단용(개발 중에만). 음성·전사문·키·토큰·헤더·전체 경로는 남기지 않는다.
async function logAudioDiagnostics(audio: TranscribeAudio) {
  const ext = audio.uri.split('?')[0].split('.').pop();
  const info: Record<string, unknown> = {
    os: Platform.OS,
    uriStartsWithFile: audio.uri.startsWith('file://'),
    uriExtension: ext,
    mimeType: audio.mimeType,
    durationMs: audio.durationMs,
  };
  if (Platform.OS !== 'web') {
    // 파일이 비어 있지 않은지 읽어서 크기(바이트)만 본다. 읽기에 실패하면 예외 메시지만 남긴다.
    try {
      info.blobSizeBytes = (await (await fetch(audio.uri)).blob()).size;
    } catch (e) {
      info.readError = e instanceof Error ? e.message : String(e);
    }
  }
  console.warn('[transcribe] 보내기 전 점검:', info);
}

// POST /speech/transcribe. 실패하면 화면에 보여 줄 문장이 담긴 TranscribeRequestError를 던진다.
// 한계: 자동 재시도는 하지 않는다. 이 라우트에는 request_id가 없어서 재시도마다 사용량이 깎인다. 재시도는 사용자가 다시 녹음한다.
export async function transcribeRemote(audio: TranscribeAudio): Promise<TranscribeResponse> {
  try {
    await ensureSignedIn();
  } catch {
    throw new TranscribeRequestError(MESSAGES.unauthorized);
  }

  if (__DEV__) {
    await logAudioDiagnostics(audio);
  }
  const form = await buildForm(audio);

  // Content-Type 헤더는 주지 않는다. FormData면 supabase-js가 건드리지 않아서 multipart 경계가 자동으로 붙는다.
  const { data, error } = await getSupabase().functions.invoke('api/speech/transcribe', {
    body: form,
    timeout: TRANSCRIBE_TIMEOUT_MS,
  });

  if (error) {
    if (error instanceof FunctionsFetchError) {
      const original = error.context as Error | undefined;
      const aborted = original?.name === 'AbortError';
      if (__DEV__) {
        // context가 fetch가 던진 원래 예외다(예: "Network request failed")
        console.warn('[transcribe] fetch 자체가 실패했어요:', {
          os: Platform.OS,
          name: error.name,
          message: error.message,
          contextName: original?.name,
          contextMessage: original?.message,
        });
      }
      throw new TranscribeRequestError(aborted ? MESSAGES.timeout : MESSAGES.network);
    }
    const status = error instanceof FunctionsHttpError ? (error.context as Response).status : undefined;
    if (__DEV__) {
      // 음성·전사문·키·토큰은 남기지 않는다. 상태와 오류 코드만 남긴다.
      const server = error instanceof FunctionsHttpError ? await readServerError(error) : null;
      console.warn('[transcribe] 서버가 거절했어요:', { status, code: server?.code ?? null });
    }
    throw new TranscribeRequestError(messageForStatus(status));
  }

  const parsed = transcribeResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new TranscribeRequestError(MESSAGES.failed);
  }
  return parsed.data;
}
