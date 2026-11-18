import type { SupabaseClient } from '@supabase/supabase-js';

import type { TranscribeResponse } from '@quack/shared';

import { transcribeAudio, type TranscribeAudioResult } from '../../_ai/openAiTranscribe.ts';
import { AI_DAILY_LIMIT, readSttApiKey } from '../../_shared/aiConfig.ts';
import { AppError, appErrorFromDb } from '../middleware/error.ts';
import type { SpeechAudioType, SpeechUpload } from '../middleware/speechUpload.ts';

// 서비스가 쓰는 키·DB·STT 작업. 단위 시험에서 가짜로 바꿔 끼워 처리 순서를 확인하기 위해 따로 받는다.
export type SpeechDependencies = {
  readApiKey(): string;
  // 오늘 사용량을 하나 쓴다. 한도를 넘었으면 false다.
  consumeQuota(userId: string): Promise<boolean>;
  transcribe(audio: File, apiKey: string): Promise<TranscribeAudioResult>;
};

const FILE_NAMES: Record<SpeechAudioType, string> = {
  'audio/webm': 'audio.webm',
  'audio/mp4': 'audio.m4a',
};

// 전사 서비스에는 앱이 보낸 파일 이름 대신 서버가 지은 이름과 확인한 기본 형식으로 넘긴다.
// 전사 서비스가 확장자로 형식을 판단할 수 있게 하고, 기기의 파일 이름이 외부로 나가지 않게 하기 위해서다.
export function renameForTranscription(audio: File, audioType: SpeechAudioType): File {
  return new File([audio], FILE_NAMES[audioType], { type: audioType });
}

// POST /speech/transcribe: 검사를 통과한 음성을 글로 바꾼다.
// 전사가 실패해도 차감한 사용량은 돌려주지 않는다(docs/decisions/0002).
export async function transcribeSpeech(
  userId: string,
  upload: SpeechUpload,
  dependencies: SpeechDependencies,
): Promise<TranscribeResponse> {
  // 키가 없으면 사용량을 쓰기 전에 실패하게 먼저 읽는다.
  const apiKey = dependencies.readApiKey();
  if (!(await dependencies.consumeQuota(userId))) throw new AppError('AI_QUOTA_EXCEEDED');

  const result = await dependencies.transcribe(renameForTranscription(upload.audio, upload.audioType), apiKey);

  // 응답의 녹음 시간은 앱이 측정해 검사를 통과한 값을 그대로 돌려준다(#28).
  if (result.ok) return { text: result.text, duration_ms: upload.durationMs };

  // 말소리가 없었던 녹음이다. 실패가 아니라 빈 글로 돌려주고, 앱이 다시 녹음하도록 안내한다(#28).
  if (result.code === 'EMPTY_TRANSCRIPT') return { text: '', duration_ms: upload.durationMs };

  // 실패 코드와 HTTP 상태만 남긴다. 음성과 전사문은 개인 데이터라 로그에 남기지 않는다.
  console.error('[api] 음성 전사 실패', result.code, result.code === 'HTTP_ERROR' ? result.status : '');

  // 키와 빈 파일은 앞 단계에서 이미 막았다. 여기까지 왔다면 서버 버그다.
  if (result.code === 'MISSING_API_KEY' || result.code === 'EMPTY_AUDIO') throw new AppError('INTERNAL_ERROR');

  throw new AppError('STT_FAILED');
}

// 실제 키·DB·STT로 작업을 만든다. adminDb는 service role 클라이언트다.
export function createSpeechDependencies(adminDb: SupabaseClient): SpeechDependencies {
  return {
    readApiKey: readSttApiKey,

    async consumeQuota(userId) {
      // consume_ai_quota는 server 스키마 함수라 service role로만 부를 수 있다. user_id는 auth 미들웨어가 확인한 값이다.
      const { data, error } = await adminDb.schema('server').rpc('consume_ai_quota', {
        p_user_id: userId,
        p_kind: 'stt',
        p_daily_limit: AI_DAILY_LIMIT,
      });

      if (error) throw appErrorFromDb(error);
      return data === true;
    },

    // 용어 힌트(keywords)는 MVP에서 보내지 않는다. 요청에 세션 정보가 없어서다.
    transcribe(audio, apiKey) {
      return transcribeAudio(audio, { apiKey });
    },
  };
}
