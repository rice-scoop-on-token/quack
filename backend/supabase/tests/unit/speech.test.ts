// 음성 전사(POST /speech/transcribe) 검사와 처리 순서 시험
// 실행: backend/에서 deno test --config supabase/functions/api/deno.json supabase/tests/unit/
//
// 업로드 검사(checkSpeechUpload)는 서버 없이 폼 값만으로 확인하고,
// 서비스(transcribeSpeech)는 키·DB·STT를 가짜로 바꿔 끼워 어떤 작업을 어떤 순서로 불렀는지 확인한다.

import assert from 'node:assert/strict';

import type { TranscribeAudioResult } from '../../functions/_ai/openAiTranscribe.ts';
import { AppError } from '../../functions/api/middleware/error.ts';
import { checkSpeechUpload, SPEECH_MAX_BYTES, type SpeechUpload } from '../../functions/api/middleware/speechUpload.ts';
import { type SpeechDependencies, transcribeSpeech } from '../../functions/api/services/speech.service.ts';

const userId = '11111111-1111-4111-8111-111111111111';

const audioFile = (size: number, type: string, name = 'recording.webm') => new File([new Uint8Array(size)], name, { type });
const form = (audio: unknown, duration: unknown = '3000') => ({ audio, duration_ms: duration });

function expectAppError(run: () => unknown, code: AppError['code']) {
  assert.throws(run, (error) => error instanceof AppError && error.code === code);
}

async function expectAppErrorAsync(run: Promise<unknown>, code: AppError['code']) {
  await assert.rejects(run, (error) => error instanceof AppError && error.code === code);
}

// 업로드 검사

Deno.test('검사: Chrome 녹음 형식(audio/webm;codecs=opus)은 기본 형식 audio/webm으로 통과한다', () => {
  const upload = checkSpeechUpload(form(audioFile(10, 'audio/webm;codecs=opus'), '3000'));
  assert.equal(upload.audioType, 'audio/webm');
  assert.equal(upload.durationMs, 3000);
  assert.equal(upload.audio.size, 10);
});

Deno.test('검사: audio/mp4는 통과하고, 대소문자가 달라도 같은 형식으로 본다', () => {
  assert.equal(checkSpeechUpload(form(audioFile(10, 'audio/mp4'))).audioType, 'audio/mp4');
  assert.equal(checkSpeechUpload(form(audioFile(10, 'Audio/WebM'))).audioType, 'audio/webm');
});

Deno.test('검사: audio나 duration_ms가 없거나 audio가 파일이 아니면 400', () => {
  expectAppError(() => checkSpeechUpload({ duration_ms: '3000' }), 'VALIDATION_FAILED');
  expectAppError(() => checkSpeechUpload({ audio: audioFile(10, 'audio/webm') }), 'VALIDATION_FAILED');
  expectAppError(() => checkSpeechUpload(form('파일 아님')), 'VALIDATION_FAILED');
});

Deno.test('검사: 빈 파일이면 400', () => {
  expectAppError(() => checkSpeechUpload(form(audioFile(0, 'audio/webm'))), 'VALIDATION_FAILED');
});

Deno.test('검사: 허용하지 않는 형식이면 400', () => {
  for (const type of ['audio/wav', 'audio/mpeg', 'video/webm', '']) {
    expectAppError(() => checkSpeechUpload(form(audioFile(10, type))), 'VALIDATION_FAILED');
  }
});

Deno.test('검사: 2 MiB까지는 통과하고, 1바이트라도 넘으면 413', () => {
  assert.equal(checkSpeechUpload(form(audioFile(SPEECH_MAX_BYTES, 'audio/webm'))).audio.size, SPEECH_MAX_BYTES);
  expectAppError(() => checkSpeechUpload(form(audioFile(SPEECH_MAX_BYTES + 1, 'audio/webm'))), 'FILE_TOO_LARGE');
});

Deno.test('검사: 형식과 크기가 둘 다 틀리면 형식 오류(400)가 먼저다', () => {
  expectAppError(() => checkSpeechUpload(form(audioFile(SPEECH_MAX_BYTES + 1, 'audio/wav'))), 'VALIDATION_FAILED');
});

Deno.test('검사: 크기와 녹음 시간이 둘 다 틀리면 크기 오류(413)가 먼저다', () => {
  expectAppError(() => checkSpeechUpload(form(audioFile(SPEECH_MAX_BYTES + 1, 'audio/webm'), '0')), 'FILE_TOO_LARGE');
});

Deno.test('검사: duration_ms는 1~60000 정수 문자열만 통과한다', () => {
  assert.equal(checkSpeechUpload(form(audioFile(10, 'audio/webm'), '1')).durationMs, 1);
  assert.equal(checkSpeechUpload(form(audioFile(10, 'audio/webm'), '60000')).durationMs, 60000);
  for (const duration of ['0', '60001', '12a', '', '-1', '1.5']) {
    expectAppError(() => checkSpeechUpload(form(audioFile(10, 'audio/webm'), duration)), 'VALIDATION_FAILED');
  }
});

// 서비스

const upload: SpeechUpload = {
  audio: audioFile(10, 'audio/webm;codecs=opus', '내 녹음 파일.webm'),
  audioType: 'audio/webm',
  durationMs: 3200,
};

function fakeDependencies({
  quotaLeft = true,
  result = { ok: true, text: '스택은 나중에 넣은 것을 먼저 꺼낸다' },
}: { quotaLeft?: boolean; result?: TranscribeAudioResult } = {}) {
  const calls: string[] = [];
  const sent: File[] = [];
  const dependencies: SpeechDependencies = {
    readApiKey: () => {
      calls.push('key');
      return 'fake-key';
    },
    consumeQuota: (actor) => {
      calls.push('quota');
      assert.equal(actor, userId);
      return Promise.resolve(quotaLeft);
    },
    transcribe: (audio, apiKey) => {
      calls.push('transcribe');
      assert.equal(apiKey, 'fake-key');
      sent.push(audio);
      return Promise.resolve(result);
    },
  };
  return { dependencies, calls, sent };
}

Deno.test('서비스: 키 → 사용량 → 전사 순서로 처리하고, 녹음 시간은 요청값을 그대로 돌려준다', async () => {
  const { dependencies, calls } = fakeDependencies();
  const response = await transcribeSpeech(userId, upload, dependencies);
  assert.deepEqual(response, { text: '스택은 나중에 넣은 것을 먼저 꺼낸다', duration_ms: 3200 });
  assert.deepEqual(calls, ['key', 'quota', 'transcribe']);
});

Deno.test('서비스: 전사 서비스에는 서버가 지은 이름과 확인한 기본 형식으로 넘긴다', async () => {
  const { dependencies, sent } = fakeDependencies();
  await transcribeSpeech(userId, upload, dependencies);
  assert.equal(sent[0].name, 'audio.webm');
  assert.equal(sent[0].type, 'audio/webm');
  assert.equal(sent[0].size, 10);

  const mp4 = fakeDependencies();
  await transcribeSpeech(userId, { ...upload, audio: audioFile(10, 'audio/mp4', 'x.mp4'), audioType: 'audio/mp4' }, mp4.dependencies);
  assert.equal(mp4.sent[0].name, 'audio.m4a');
  assert.equal(mp4.sent[0].type, 'audio/mp4');
});

Deno.test('서비스: 오늘 사용량을 다 썼으면 AI_QUOTA_EXCEEDED이고 전사를 부르지 않는다', async () => {
  const { dependencies, calls } = fakeDependencies({ quotaLeft: false });
  await expectAppErrorAsync(transcribeSpeech(userId, upload, dependencies), 'AI_QUOTA_EXCEEDED');
  assert.deepEqual(calls, ['key', 'quota']);
});

Deno.test('서비스: 말소리가 없으면(EMPTY_TRANSCRIPT) 빈 글로 200을 돌려준다', async () => {
  const { dependencies } = fakeDependencies({ result: { ok: false, code: 'EMPTY_TRANSCRIPT' } });
  assert.deepEqual(await transcribeSpeech(userId, upload, dependencies), { text: '', duration_ms: 3200 });
});

const failures: { result: TranscribeAudioResult; code: AppError['code'] }[] = [
  { result: { ok: false, code: 'HTTP_ERROR', status: 500 }, code: 'STT_FAILED' },
  { result: { ok: false, code: 'NETWORK_ERROR' }, code: 'STT_FAILED' },
  { result: { ok: false, code: 'TIMEOUT' }, code: 'STT_FAILED' },
  { result: { ok: false, code: 'INVALID_RESPONSE' }, code: 'STT_FAILED' },
  { result: { ok: false, code: 'MISSING_API_KEY' }, code: 'INTERNAL_ERROR' },
  { result: { ok: false, code: 'EMPTY_AUDIO' }, code: 'INTERNAL_ERROR' },
];

for (const { result, code } of failures) {
  Deno.test(`서비스: 전사 실패 ${result.ok ? '' : result.code}는 ${code}로 바꾼다`, async () => {
    const { dependencies } = fakeDependencies({ result });
    await expectAppErrorAsync(transcribeSpeech(userId, upload, dependencies), code);
  });
}
