import { validator } from 'hono/validator';

import { SPEECH_AUDIO_FIELD, SPEECH_DURATION_FIELD, speechDurationFieldSchema } from '@quack/shared';

import { AppError, zodIssuesForLog } from './error.ts';

// 음성 파일의 최대 크기(2 MiB). 1분 녹음을 담기에 충분하다(#28에서 AI·FE와 합의).
export const SPEECH_MAX_BYTES = 2 * 1024 * 1024;

// 앱이 녹음하는 형식만 받는다. Chrome은 audio/webm, iOS·Android는 audio/mp4로 보낸다.
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp4'] as const;
export type SpeechAudioType = (typeof ALLOWED_AUDIO_TYPES)[number];

export type SpeechUpload = {
  audio: File;
  // 검사에서 확인한 기본 형식. 'audio/webm;codecs=opus'처럼 붙은 값은 떼어 낸 것이다.
  audioType: SpeechAudioType;
  durationMs: number;
};

function reject(reason: string, code: 'VALIDATION_FAILED' | 'FILE_TOO_LARGE' = 'VALIDATION_FAILED'): never {
  // 파일 이름·내용·형식 원문은 사용자 데이터라 남기지 않고, 어느 검사에서 막혔는지만 남긴다.
  console.warn('[api] 음성 업로드 거절', reason);
  throw new AppError(code);
}

// multipart 폼 값을 검사한다. 사용량을 쓰기 전에 끝나야 해서 middleware에서 부른다.
// 순서: 필드 있음 → 빈 파일 아님 → 허용 형식 → 크기 → 녹음 시간.
// 크기는 본문을 다 읽은 뒤 여기서 확인한다. 다 읽기 전에 응답하면(hono bodyLimit) 로컬에서 연결이 끊겨
// 413 대신 504가 오는 경우가 있었다. 원격의 요청 본문 크기 제한은 원격 설정에서 따로 둔다(#31).
export function checkSpeechUpload(form: Record<string, unknown>): SpeechUpload {
  const audio = form[SPEECH_AUDIO_FIELD];
  const duration = form[SPEECH_DURATION_FIELD];

  if (!(audio instanceof File)) reject('audio 없음');
  if (typeof duration !== 'string') reject('duration_ms 없음');
  if (audio.size === 0) reject('빈 파일');

  // 'audio/webm;codecs=opus'처럼 ';' 뒤에 붙는 값은 비교하지 않는다.
  const baseType = audio.type.split(';')[0].trim().toLowerCase();
  const audioType = ALLOWED_AUDIO_TYPES.find((type) => type === baseType);
  if (!audioType) reject('허용하지 않는 형식');

  if (audio.size > SPEECH_MAX_BYTES) reject('크기 초과', 'FILE_TOO_LARGE');

  // 서버는 파일 길이를 다시 재지 않고 앱이 측정한 값을 믿는다(#28).
  const parsed = speechDurationFieldSchema.safeParse(duration);
  if (!parsed.success) {
    console.warn('[api] 음성 업로드 거절', 'duration_ms', zodIssuesForLog(parsed.error));
    throw new AppError('VALIDATION_FAILED');
  }

  return { audio, audioType, durationMs: parsed.data };
}

// 라우트는 c.req.valid('form')으로 검사를 통과한 값만 꺼내 쓴다.
export const validateSpeechUpload = validator('form', (value) => checkSpeechUpload(value));
