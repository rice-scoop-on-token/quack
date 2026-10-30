// 동시 요청 시험. supabase start만 있으면 된다.
// pgTAP은 한 연결·한 트랜잭션 안에서 돌아 동시 요청을 만들 수 없다. 사용자별 잠금(lock_user)과
// 한 문장으로 확인·증가하는 사용량 차감이 실제로 동작하는지는 이 파일로만 확인된다.
// server 스키마 함수를 바꾸면 이 시험을 먼저 돌린다(docs/decisions/0002 후속 작업).

import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { createLocalClient } from '../lib.mjs';

const local = createLocalClient();

after(() => local.deleteCreatedUsers());

// 경험치는 폴더별로 쌓이므로, 폴더와 세션을 따로 만들어 같은 폴더·다른 폴더 경우를 나눠 시험한다.
async function makeFolder(user) {
  const folder = await local.rest(user, 'POST', 'folders', { user_id: user.id, name: '폴더', species_id: 'rubber_duck' });
  return folder.body[0].id;
}

// 사용자 토큰으로 세션을 만들고, 세션 상태는 앱이 바꿀 수 없어서 secret key로 finished로 바꾼다.
async function finishedSession(user, folderId) {
  const session = await local.rest(user, 'POST', 'sessions', { user_id: user.id, folder_id: folderId, goal: '목표' });
  const sessionId = session.body[0].id;
  await local.rest('service', 'PATCH', `sessions?id=eq.${sessionId}`, { status: 'finished' });
  return sessionId;
}

function reward(user, sessionId, xp) {
  return local.rpc('service', 'grant_session_reward', {
    p_user_id: user.id, p_session_id: sessionId, p_xp: xp,
    p_summary: '요약', p_covered_concepts: [], p_weak_concepts: [],
    p_duration_seconds: 60, p_turn_count: 1, p_quiz_correct: null, p_quiz_total: null,
  });
}

test('사용량 한도 5에 동시에 10번 요청하면 정확히 5번만 true', async () => {
  const user = await local.signup();
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      local.rpc('service', 'consume_ai_quota', { p_user_id: user.id, p_kind: 'stt', p_daily_limit: 5 }),
    ),
  );
  assert.equal(results.filter((r) => r.body === true).length, 5);

  const usage = await local.rest('service', 'GET', `ai_usage?user_id=eq.${user.id}&kind=eq.stt&select=count`);
  assert.equal(usage.body[0].count, 5);
});

test('같은 세션 보상을 동시에 5번 요청하면 한 번만 지급되고 모두 같은 리포트를 받는다', async () => {
  const user = await local.signup();
  const sessionId = await finishedSession(user, await makeFolder(user));

  const results = await Promise.all(Array.from({ length: 5 }, () => reward(user, sessionId, 10)));
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(results.filter((r) => r.body.granted === true).length, 1);
  assert.equal(new Set(results.map((r) => r.body.report_id)).size, 1);

  const ledger = await local.rest('service', 'GET', `xp_ledger?session_id=eq.${sessionId}&select=id`);
  assert.equal(ledger.body.length, 1);
});

test('같은 폴더의 두 세션 보상을 동시에 지급해도 지급 전 경험치(xp_before)가 겹치지 않는다', async () => {
  const user = await local.signup();
  const folderId = await makeFolder(user);
  const [s1, s2] = [await finishedSession(user, folderId), await finishedSession(user, folderId)];

  const results = await Promise.all([reward(user, s1, 10), reward(user, s2, 10)]);
  // 잠금이 없으면 둘 다 0을 본다. 잠금이 있으면 한쪽은 0, 다른 쪽은 10을 본다.
  const befores = results.map((r) => r.body.xp_before).sort((a, b) => a - b);
  assert.deepEqual(befores, [0, 10]);
});

test('다른 폴더의 두 세션 보상을 동시에 지급하면 각 폴더가 0부터 쌓인다', async () => {
  const user = await local.signup();
  const [s1, s2] = [
    await finishedSession(user, await makeFolder(user)),
    await finishedSession(user, await makeFolder(user)),
  ];

  const results = await Promise.all([reward(user, s1, 10), reward(user, s2, 10)]);
  assert.deepEqual(results.map((r) => r.body.xp_before), [0, 0]);
});
