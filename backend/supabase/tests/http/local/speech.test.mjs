// POST /speech/transcribe (음성 전사). api 함수가 응답해야 한다(backend/README.md "HTTP 시험").
// 순서와 도우미 사용법은 sessions.test.mjs와 같다.
//
// 실패 시험은 가짜 음성(몇 바이트)으로 보낸다. 모두 전사 전에 막히므로 실제 음성이 필요 없다.
// 사용량 소진(429) 시험은 키를 읽는 단계를 지나야 해서 functions/.env에 STT_API_KEY가 있어야 한다.
//
// 실제 전사 시험은 비용이 들어 LIVE_AI=1일 때만 실행한다. 이때 STT_SAMPLE_PATH에 짧은 한국어 음성(webm)의 경로를 준다.
// 음성 파일은 레포에 넣지 않는다.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';

import { assertAppError, assertFunctionsRunning, createLocalClient } from '../lib.mjs';

const local = createLocalClient();
const LIVE_AI = process.env.LIVE_AI === '1';
const SAMPLE_PATH = process.env.STT_SAMPLE_PATH;
const MAX_BYTES = 2 * 1024 * 1024;
let A;
let B;

const audio = (size, type = 'audio/webm;codecs=opus') => new Blob([new Uint8Array(size).fill(1)], { type });

// file이나 duration에 null을 주면 그 필드를 빼고 보낸다.
function speechForm({ file = audio(16), duration = '3000' } = {}) {
  const form = new FormData();
  if (file !== null) form.append('audio', file, 'recording.webm');
  if (duration !== null) form.append('duration_ms', duration);
  return form;
}

const transcribe = (who, body, headers) => local.api(who, '/speech/transcribe', { method: 'POST', body, headers });

// 서버 전용 테이블은 secret key('service')로만 읽고 쓸 수 있다.
const usage = async (user) =>
  (await local.rest('service', 'GET', `ai_usage?user_id=eq.${user.id}&kind=eq.stt&select=count`)).body;
const seoulToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());

before(async () => {
  await assertFunctionsRunning(local);
  A = await local.signup();
  B = await local.signup();
});

after(() => local.deleteCreatedUsers());

test('음성 전사: 사용자 토큰 없이 부르면 401', async () => {
  assertAppError(await transcribe('anon', speechForm()), 401, 'UNAUTHORIZED');
});

test('음성 전사: audio나 duration_ms가 없으면 400이고 사용량을 쓰지 않는다', async () => {
  assertAppError(await transcribe(A, speechForm({ file: null })), 400, 'VALIDATION_FAILED');
  assertAppError(await transcribe(A, speechForm({ duration: null })), 400, 'VALIDATION_FAILED');
  // multipart가 아닌 JSON 본문도 audio가 없는 것과 같다.
  assertAppError(await transcribe(A, { audio: 'x', duration_ms: '3000' }), 400, 'VALIDATION_FAILED');
  assert.deepEqual(await usage(A), []);
});

test('음성 전사: 빈 파일이나 허용하지 않는 형식이면 400이고 사용량을 쓰지 않는다', async () => {
  assertAppError(await transcribe(A, speechForm({ file: audio(0) })), 400, 'VALIDATION_FAILED');
  assertAppError(await transcribe(A, speechForm({ file: audio(16, 'audio/wav') })), 400, 'VALIDATION_FAILED');
  assert.deepEqual(await usage(A), []);
});

test('음성 전사: 2 MiB를 넘으면 413이고 사용량을 쓰지 않는다', async () => {
  // 조금 넘는 경우와 크게 넘는 경우를 모두 본다. 크게 넘어도 본문을 다 읽은 뒤 413으로 응답해야 한다.
  assertAppError(await transcribe(A, speechForm({ file: audio(MAX_BYTES + 1) })), 413, 'FILE_TOO_LARGE');
  assertAppError(await transcribe(A, speechForm({ file: audio(MAX_BYTES * 2) })), 413, 'FILE_TOO_LARGE');
  assert.deepEqual(await usage(A), []);
});

test('음성 전사: duration_ms가 0, 60001, 숫자가 아니면 400이고 사용량을 쓰지 않는다', async () => {
  for (const duration of ['0', '60001', '3초']) {
    assertAppError(await transcribe(A, speechForm({ duration })), 400, 'VALIDATION_FAILED');
  }
  assert.deepEqual(await usage(A), []);
});

test('음성 전사: 오늘 사용량을 다 썼으면 429', async () => {
  // 한도(AI_DAILY_LIMIT)보다 넉넉히 큰 값으로 채운다. 한도 임시값이 바뀌어도 시험이 그대로 맞게 하기 위해서다.
  await local.rest('service', 'POST', 'ai_usage', { user_id: B.id, usage_date: seoulToday(), kind: 'stt', count: 100000 });
  assertAppError(await transcribe(B, speechForm()), 429, 'AI_QUOTA_EXCEEDED');
});

test('음성 전사(실제 STT): 글로 바꾼 결과와 요청한 녹음 시간을 돌려주고 사용량을 하나 쓴다', {
  skip: (!LIVE_AI || !SAMPLE_PATH) && 'LIVE_AI=1과 STT_SAMPLE_PATH가 있을 때만 실행',
}, async () => {
  const file = new Blob([readFileSync(SAMPLE_PATH)], { type: 'audio/webm;codecs=opus' });
  const res = await transcribe(A, speechForm({ file, duration: '3200' }));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(Object.keys(res.body).sort(), ['duration_ms', 'text']);
  assert.equal(res.body.duration_ms, 3200);
  assert.ok(res.body.text.trim().length > 0, '전사문이 비어 있으면 안 된다');
  assert.deepEqual(await usage(A), [{ count: 1 }]);
});
