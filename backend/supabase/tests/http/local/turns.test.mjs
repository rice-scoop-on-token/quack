// POST /sessions/:id/turns (텍스트 설명 제출). api 함수가 응답해야 한다(backend/README.md "HTTP 시험").
// 순서와 도우미 사용법은 sessions.test.mjs와 같다.
//
// 실제 AI를 부르는 성공 경로 시험은 비용이 들어 LIVE_AI=1일 때만 실행한다.
// 그때는 functions/.env에 LLM_API_KEY, LLM_MODEL이 있어야 한다. 나머지 시험은 AI를 부르지 않는다.

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { assertAppError, assertFunctionsRunning, createLocalClient } from '../lib.mjs';

const local = createLocalClient();
const LIVE_AI = process.env.LIVE_AI === '1';
let A;
let B;

async function makeSession(user) {
  const folder = await local.rest(user, 'POST', 'folders', { user_id: user.id, name: '설명 폴더', species_id: 'rubber_duck' });
  const session = await local.rest(user, 'POST', 'sessions', {
    user_id: user.id, folder_id: folder.body[0].id, goal: '이진 탐색이 왜 빠른지 설명하기',
  });
  return session.body[0].id;
}

const submit = (who, sessionId, body) => local.api(who, `/sessions/${sessionId}/turns`, { method: 'POST', body });
const chat = (text, extra = {}) => ({ trigger: 'self', input_mode: 'chat', text, question_text: null, ...extra });

// 서버 전용 테이블은 secret key('service')로만 읽고 쓸 수 있다.
const savedTurns = async (sessionId) =>
  (await local.rest('service', 'GET', `explanation_turns?session_id=eq.${sessionId}&select=seq,question_text&order=seq`)).body;
const usage = async (user) =>
  (await local.rest('service', 'GET', `ai_usage?user_id=eq.${user.id}&kind=eq.analysis&select=count`)).body;
const seoulToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());

before(async () => {
  await assertFunctionsRunning(local);
  A = await local.signup();
  B = await local.signup();
});

after(() => local.deleteCreatedUsers());

test('설명 제출: 본문이 계약과 다르거나 공백뿐이면 400이고 사용량을 쓰지 않는다', async () => {
  const sessionId = await makeSession(A);
  assertAppError(await submit(A, sessionId, { trigger: 'self', text: '입력 방식 없음', question_text: null }), 400, 'VALIDATION_FAILED');
  assertAppError(await submit(A, sessionId, chat('   ')), 400, 'VALIDATION_FAILED');
  assert.deepEqual(await savedTurns(sessionId), []);
  assert.deepEqual(await usage(A), []);
});

test('설명 제출: 다른 사용자의 세션은 404이고 사용량을 쓰지 않는다', async () => {
  const sessionId = await makeSession(A);
  assertAppError(await submit(B, sessionId, chat('남의 세션에 설명')), 404, 'NOT_FOUND');
  assert.deepEqual(await savedTurns(sessionId), []);
  assert.deepEqual(await usage(B), []);
});

test('설명 제출: 종료된 세션은 409', async () => {
  const sessionId = await makeSession(A);
  await local.api(A, `/sessions/${sessionId}/finish`, { method: 'POST' });
  assertAppError(await submit(A, sessionId, chat('종료 후 설명')), 409, 'INVALID_STATE');
});

test('설명 제출: 오늘 사용량을 다 썼으면 429이고 턴을 저장하지 않는다', async () => {
  const sessionId = await makeSession(B);
  // 한도(AI_DAILY_LIMIT)보다 넉넉히 큰 값으로 채운다. 한도 임시값이 바뀌어도 시험이 그대로 맞게 하기 위해서다.
  await local.rest('service', 'POST', 'ai_usage', { user_id: B.id, usage_date: seoulToday(), kind: 'analysis', count: 100000 });
  assertAppError(await submit(B, sessionId, chat('한도 초과 설명')), 429, 'AI_QUOTA_EXCEEDED');
  assert.deepEqual(await savedTurns(sessionId), []);
});

test('설명 제출(실제 AI): 공개 결과만 응답하고, 턴·분석을 저장하고, 앱의 question_text는 기록만 한다', { skip: !LIVE_AI && 'LIVE_AI=1일 때만 실행' }, async () => {
  const sessionId = await makeSession(A);

  const first = await submit(A, sessionId, chat('이진 탐색은 정렬된 배열에서 가운데 값과 비교해 찾을 범위를 절반씩 줄여서 빠르다.'));
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.deepEqual(Object.keys(first.body).sort(), ['analysis', 'turn']);
  // 내부 분석(근거, 누락·오류 목록)은 응답에 없다.
  assert.deepEqual(Object.keys(first.body.analysis).sort(), [
    'answer_status', 'independent_performance_status', 'response', 'understanding_status',
  ]);
  assert.equal(first.body.turn.seq, 1);

  const second = await submit(A, sessionId, chat('범위를 반으로 줄이니까 비교 횟수가 log n 정도다.', {
    trigger: 'follow_up', question_text: '앱이 바꾼 질문',
  }));
  assert.equal(second.status, 200, JSON.stringify(second.body));
  assert.equal(second.body.turn.seq, 2);
  assert.equal(second.body.turn.question_text, '앱이 바꾼 질문');

  assert.deepEqual(await savedTurns(sessionId), [
    { seq: 1, question_text: null },
    { seq: 2, question_text: '앱이 바꾼 질문' },
  ]);

  // 서버 전용 칸에 AI 출력 전체가 저장된다.
  const analyses = (await local.rest('service', 'GET', `turn_analyses?turn_id=eq.${first.body.turn.id}&select=action,analysis,model`)).body;
  assert.equal(analyses.length, 1);
  assert.equal(analyses[0].action, first.body.analysis.response.action);
  assert.ok(Array.isArray(analyses[0].analysis.omissions));
  assert.ok(analyses[0].model);

  assert.deepEqual(await usage(A), [{ count: 2 }]);
});
