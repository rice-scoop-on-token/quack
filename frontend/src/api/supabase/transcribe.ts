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
    // 한계: RN의 파일 첨부 방식({ uri, name, type })이라 타입을 맞추려고 단언을 쓴다. Expo Go 폰에서 보내 봐야 동작을 확인할 수 있다.
    form.append(SPEECH_AUDIO_FIELD, { uri: audio.uri, name: 'audio.m4a', type: audio.mimeType } as unknown as Blob);
  }
  // 서버는 duration_ms를 문자열로 읽는다
  form.append(SPEECH_DURATION_FIELD, String(durationMs));
  return form;
}

// POST /speech/transcribe. 실패하면 화면에 보여 줄 문장이 담긴 TranscribeRequestError를 던진다.
// 한계: 자동 재시도는 하지 않는다. 이 라우트에는 request_id가 없어서 재시도마다 사용량이 깎인다. 재시도는 사용자가 다시 녹음한다.
export async function transcribeRemote(audio: TranscribeAudio): Promise<TranscribeResponse> {
  try {
    await ensureSignedIn();
  } catch {
    throw new TranscribeRequestError(MESSAGES.unauthorized);
  }

  const form = await buildForm(audio);

  // Content-Type 헤더는 주지 않는다. FormData면 supabase-js가 건드리지 않아서 multipart 경계가 자동으로 붙는다.
  const { data, error } = await getSupabase().functions.invoke('api/speech/transcribe', {
    body: form,
    timeout: TRANSCRIBE_TIMEOUT_MS,
  });

  if (error) {
    if (error instanceof FunctionsFetchError) {
      const aborted = (error.context as Error | undefined)?.name === 'AbortError';
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
