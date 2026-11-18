// POST /sessions/start (공부 시작). api 함수가 응답해야 한다(backend/README.md "HTTP 시험").
// 순서와 도우미 사용법은 sessions.test.mjs와 같다.
//
// 실제 AI를 부르는 시험은 비용이 들어 LIVE_AI=1일 때만 실행한다.
// 사용량 소진(429) 시험은 AI를 부르지 않지만 키를 읽는 단계를 지나야 해서, functions/.env에 LLM_API_KEY, LLM_MODEL이 있어야 한다.

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

import { assertAppError, assertFunctionsRunning, createLocalClient } from '../lib.mjs';

const local = createLocalClient();
const LIVE_AI = process.env.LIVE_AI === '1';
let A;
let B;

async function makeFolder(user) {
  const folder = await local.rest(user, 'POST', 'folders', { user_id: user.id, name: '공부 시작 폴더', species_id: 'rubber_duck' });
  return folder.body[0].id;
}

// 앱 역할에는 request_id 추가 권한이 없어, 이미 만든 세션은 secret key('service')로 넣는다.
async function makeSavedSession(user, folderId, goal, requestId) {
  const res = await local.rest('service', 'POST', 'sessions', { user_id: user.id, folder_id: folderId, goal, request_id: requestId });
  return res.body[0].id;
}

const start = (who, body) => local.api(who, '/sessions/start', { method: 'POST', body });

// 서버 전용 테이블은 secret key('service')로만 읽을 수 있다.
const usage = async (user) =>
  (await local.rest('service', 'GET', `ai_usage?user_id=eq.${user.id}&kind=eq.analysis&select=count`)).body;
const sessionsWithKey = async (user, requestId) =>
  (await local.rest('service', 'GET', `sessions?user_id=eq.${user.id}&request_id=eq.${requestId}&select=id,folder_id,goal`)).body;
const seoulToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());

before(async () => {
  await assertFunctionsRunning(local);
  A = await local.signup();
  B = await local.signup();
});

after(() => local.deleteCreatedUsers());

test('공부 시작: 본문이 계약과 다르면 400이고 사용량을 쓰지 않는다', async () => {
  const folderId = await makeFolder(A);
  assertAppError(await start(A, { folder_id: folderId, goal: '스택' }), 400, 'VALIDATION_FAILED');
  assertAppError(await start(A, { folder_id: folderId, goal: '   ', request_id: randomUUID() }), 400, 'VALIDATION_FAILED');
  assertAppError(await start(A, { folder_id: folderId, goal: '스택', request_id: randomUUID(), extra: 1 }), 400, 'VALIDATION_FAILED');
  assert.deepEqual(await usage(A), []);
});

test('공부 시작: 다른 사용자의 폴더는 404이고 세션을 만들지 않고 사용량을 쓰지 않는다', async () => {
  const folderId = await makeFolder(A);
  const requestId = randomUUID();
  assertAppError(await start(B, { folder_id: folderId, goal: '스택의 push와 pop', request_id: requestId }), 404, 'NOT_FOUND');
  assert.deepEqual(await sessionsWithKey(B, requestId), []);
  assert.deepEqual(await usage(B), []);
});

test('공부 시작: 같은 재시도 키와 같은 입력이면 AI를 부르지 않고 이미 만든 세션을 돌려준다', async () => {
  const folderId = await makeFolder(A);
  const requestId = randomUUID();
  const goal = '스택의 push와 pop';
  const sessionId = await makeSavedSession(A, folderId, goal, requestId);

  const res = await start(A, { folder_id: folderId, goal, request_id: requestId });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.status, 'in_scope');
  assert.equal(res.body.session.id, sessionId);
  // request_id는 응답 계약(sessionSchema)에 없다.
  assert.deepEqual(Object.keys(res.body.session).sort(), ['ended_at', 'folder_id', 'goal', 'id', 'started_at', 'status', 'user_id']);
  assert.equal((await sessionsWithKey(A, requestId)).length, 1);
  assert.deepEqual(await usage(A), []);
});

test('공부 시작: 같은 재시도 키에 다른 목표나 다른 폴더면 409이고 사용량을 쓰지 않는다', async () => {
  const folderId = await makeFolder(A);
  const otherFolderId = await makeFolder(A);
  const requestId = randomUUID();
  await makeSavedSession(A, folderId, '스택의 push와 pop', requestId);

  assertAppError(await start(A, { folder_id: folderId, goal: '큐의 enqueue와 dequeue', request_id: requestId }), 409, 'INVALID_STATE');
  assertAppError(await start(A, { folder_id: otherFolderId, goal: '스택의 push와 pop', request_id: requestId }), 409, 'INVALID_STATE');
  assert.equal((await sessionsWithKey(A, requestId)).length, 1);
  assert.deepEqual(await usage(A), []);
});

test('공부 시작: 오늘 사용량을 다 썼으면 429이고 세션을 만들지 않는다', async () => {
  const folderId = await makeFolder(B);
  const requestId = randomUUID();
  // 한도(AI_DAILY_LIMIT)보다 넉넉히 큰 값으로 채운다. 한도 임시값이 바뀌어도 시험이 그대로 맞게 하기 위해서다.
  await local.rest('service', 'POST', 'ai_usage', { user_id: B.id, usage_date: seoulToday(), kind: 'analysis', count: 100000 });
  assertAppError(await start(B, { folder_id: folderId, goal: '스택의 push와 pop', request_id: requestId }), 429, 'AI_QUOTA_EXCEEDED');
  assert.deepEqual(await sessionsWithKey(B, requestId), []);
});

test('공부 시작(실제 AI): 범위 안의 목표는 세션을 하나 만들고, 다시 보내도 같은 세션이다', { skip: !LIVE_AI && 'LIVE_AI=1일 때만 실행' }, async () => {
  const folderId = await makeFolder(A);
  const requestId = randomUUID();
  const body = { folder_id: folderId, goal: '스택의 push와 pop이 왜 O(1)인지', request_id: requestId };

  const first = await start(A, body);
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.status, 'in_scope');
  assert.equal(first.body.session.folder_id, folderId);
  assert.equal(first.body.session.status, 'active');

  const again = await start(A, body);
  assert.equal(again.status, 200);
  assert.equal(again.body.session.id, first.body.session.id);

  const saved = await sessionsWithKey(A, requestId);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, first.body.session.id);
});

test('공부 시작(실제 AI): 범위 밖의 목표는 상태값만 돌려주고 세션을 만들지 않는다', { skip: !LIVE_AI && 'LIVE_AI=1일 때만 실행' }, async () => {
  const folderId = await makeFolder(A);
  const requestId = randomUUID();

  const res = await start(A, { folder_id: folderId, goal: '김치찌개 맛있게 끓이는 법', request_id: requestId });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body, { status: 'out_of_scope' });
  assert.deepEqual(await sessionsWithKey(A, requestId), []);
});
