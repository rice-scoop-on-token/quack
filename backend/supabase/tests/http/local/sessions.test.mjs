// BE-B 라우트 시험 (BE-A가 대신 작성)
// POST /sessions/:id/finish (담당: BE-B). api 함수가 응답해야 한다(backend/README.md "HTTP 시험").
// 순서와 도우미 사용법은 quizzes.test.mjs와 같다.

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { assertAppError, assertFunctionsRunning, createLocalClient } from '../lib.mjs';

const local = createLocalClient();
let A;
let B;

// 폴더·세션은 사용자 토큰으로 만든다. 설명 턴(explanation_turns)은 앱이 쓸 수 없어서 secret key('service')로 넣는다.
async function makeSession(user, turns) {
  const folder = await local.rest(user, 'POST', 'folders', { user_id: user.id, name: '세션 폴더', species_id: 'rubber_duck' });
  const session = await local.rest(user, 'POST', 'sessions', { user_id: user.id, folder_id: folder.body[0].id, goal: '목표' });
  const sessionId = session.body[0].id;
  if (turns > 0) {
    await local.rest('service', 'POST', 'explanation_turns', Array.from({ length: turns }, (_, i) => ({
      session_id: sessionId, seq: i + 1, trigger: 'self', input_mode: 'chat', text: `설명 ${i + 1}`,
    })));
  }
  return sessionId;
}

const finish = (who, sessionId) => local.api(who, `/sessions/${sessionId}/finish`, { method: 'POST' });
const savedSession = async (sessionId) =>
  (await local.rest('service', 'GET', `sessions?id=eq.${sessionId}&select=status,ended_at`)).body[0];

before(async () => {
  await assertFunctionsRunning(local);
  A = await local.signup();
  B = await local.signup();
});

after(() => local.deleteCreatedUsers());

test('종료: 진행 중 세션을 finished로 바꾸고 점검 결과를 돌려준다', async () => {
  const sessionId = await makeSession(A, 2);
  const res = await finish(A, sessionId);
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body).sort(), ['review', 'session']);
  assert.equal(res.body.session.id, sessionId);
  assert.equal(res.body.session.status, 'finished');
  assert.ok(res.body.session.ended_at);
  assert.deepEqual(res.body.review, { covered_concepts: [], weak_concepts: [], turn_count: 2, suggested_next: 'quiz' });

  const saved = await savedSession(sessionId);
  assert.equal(saved.status, 'finished');
  assert.equal(new Date(saved.ended_at).getTime(), new Date(res.body.session.ended_at).getTime());
});

test('종료: 같은 요청을 다시 보내면 첫 응답과 같다', async () => {
  const sessionId = await makeSession(A, 1);
  const first = await finish(A, sessionId);
  const again = await finish(A, sessionId);
  assert.equal(again.status, 200);
  assert.deepEqual(again.body, first.body);
});

test('종료: 다른 사용자는 404이고 진행 중 세션은 그대로다', async () => {
  const finishedId = await makeSession(A, 0);
  await finish(A, finishedId);
  assertAppError(await finish(B, finishedId), 404, 'NOT_FOUND');

  const activeId = await makeSession(A, 0);
  assertAppError(await finish(B, activeId), 404, 'NOT_FOUND');
  assert.deepEqual(await savedSession(activeId), { status: 'active', ended_at: null });
});

test('종료: uuid가 아닌 id 400, 없는 세션 404, 토큰 없음 401', async () => {
  const sessionId = await makeSession(A, 0);
  assertAppError(await finish(A, 'not-a-uuid'), 400, 'VALIDATION_FAILED');
  assertAppError(await finish(A, '00000000-0000-4000-8000-000000000000'), 404, 'NOT_FOUND');
  assertAppError(await finish('anon', sessionId), 401, 'UNAUTHORIZED');
  assert.equal((await savedSession(sessionId)).status, 'active');
});

test('종료: 같은 세션을 동시에 두 번 종료해도 둘 다 200이고 ended_at이 같다', async () => {
  // 동시 요청은 한 번에 겹치지 않을 수 있어 여러 번 반복한다.
  for (let i = 0; i < 10; i++) {
    const sessionId = await makeSession(A, 1);
    const [r1, r2] = await Promise.all([finish(A, sessionId), finish(A, sessionId)]);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.deepEqual(r1.body, r2.body);

    const saved = await savedSession(sessionId);
    assert.equal(new Date(saved.ended_at).getTime(), new Date(r1.body.session.ended_at).getTime());
  }
});

test('종료: 설명 없이(0턴) 종료할 수 있다', async () => {
  const sessionId = await makeSession(A, 0);
  const res = await finish(A, sessionId);
  assert.equal(res.status, 200);
  assert.equal(res.body.session.status, 'finished');
  assert.equal(res.body.review.turn_count, 0);
  // 0턴일 때 suggested_next를 무엇으로 할지는 팀 결정 전이라 확인하지 않는다.
});

test('종료: reported 세션을 다시 요청하면 아무것도 바뀌지 않는다', async () => {
  const sessionId = await makeSession(A, 1);
  await finish(A, sessionId);
  // reported는 보상 지급 함수가 바꾸는 상태다. 여기서는 secret key로 직접 바꿔 준비한다.
  await local.rest('service', 'PATCH', `sessions?id=eq.${sessionId}`, { status: 'reported' });
  const saved = await savedSession(sessionId);

  const res = await finish(A, sessionId);
  assert.equal(res.status, 200);
  assert.equal(res.body.session.status, 'reported');
  assert.deepEqual(await savedSession(sessionId), saved);
});
