// Data API(PostgREST)를 거쳐야 확인되는 권한 시험. supabase start만 있으면 된다.
// 칸 단위 권한·RLS·제약 대부분은 pgTAP(tests/database)이 맡고, 여기서는 HTTP에서만 보이는 것을 확인한다.
//   - server 스키마가 Data API에 노출되어 있고, 앱 역할은 권한에서 막히는지
//   - 로그인 전(401)과 로그인 후 권한 없음(403)의 구분
//   - 익명 가입

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { createLocalClient } from '../lib.mjs';

const local = createLocalClient();
const NIL = '00000000-0000-4000-8000-000000000000';
let user;

before(async () => {
  user = await local.signup();
});

after(() => local.deleteCreatedUsers());

// 함수마다 인자 이름이 맞아야 Data API가 함수를 찾는다. 값은 아무거나 넣는다(권한에서 먼저 막힌다).
const serverFunctionArgs = {
  consume_ai_quota: { p_user_id: NIL, p_kind: 'analysis', p_daily_limit: 0 },
  grant_session_reward: {
    p_user_id: NIL, p_session_id: NIL, p_xp: 0, p_points: 0, p_item_ids: [],
    p_summary: 'x', p_covered_concepts: [], p_weak_concepts: [],
    p_duration_seconds: 0, p_turn_count: 0, p_quiz_correct: null, p_quiz_total: null,
  },
  purchase_item: { p_user_id: NIL, p_item_id: 'x' },
  lock_user: { p_user_id: NIL },
};

test('익명 가입으로 토큰을 받고 익명 사용자로 표시된다', () => {
  assert.ok(user.token);
  assert.equal(user.isAnonymous, true);
});

test('server 함수: 익명 사용자 토큰은 403, 스키마 권한에서 막힌다', async () => {
  for (const [fn, args] of Object.entries(serverFunctionArgs)) {
    const res = await local.rpc(user, fn, args);
    assert.equal(res.status, 403, fn);
    assert.equal(res.body.code, '42501', fn);
    // "Invalid schema"가 아니라 권한 에러여야 server 스키마가 노출된 상태에서 막힌 것이다.
    assert.equal(res.body.message, 'permission denied for schema server', fn);
  }
});

test('server 함수: 로그인 전(anon)은 401', async () => {
  for (const [fn, args] of Object.entries(serverFunctionArgs)) {
    const res = await local.rpc('anon', fn, args);
    assert.equal(res.status, 401, fn);
    assert.equal(res.body.code, '42501', fn);
  }
});

test('server 함수: 스키마를 지정하지 않으면 public에서 찾지 못한다 (PGRST202)', async () => {
  const res = await local.rpc('service', 'consume_ai_quota', serverFunctionArgs.consume_ai_quota, { schema: null });
  assert.equal(res.status, 404);
  assert.equal(res.body.code, 'PGRST202');
});

test('server 함수: secret key(서버)로는 호출된다', async () => {
  // 한도 0이면 사용량을 쓰지 않고 false만 돌려준다.
  const res = await local.rpc('service', 'consume_ai_quota', serverFunctionArgs.consume_ai_quota);
  assert.equal(res.status, 200);
  assert.equal(res.body, false);
});

test('테이블: 익명 사용자가 금지된 칸·테이블에 쓰면 403', async () => {
  let res = await local.rest(user, 'PATCH', `sessions?id=eq.${NIL}`, { status: 'reported' });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, '42501');

  res = await local.rest(user, 'POST', 'xp_ledger', { user_id: user.id, amount: 9999, reason: 'session_reward' });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, '42501');

  res = await local.rest(user, 'GET', 'quiz_questions?select=id');
  assert.equal(res.status, 403);
  assert.equal(res.body.code, '42501');
});

test('테이블: 로그인 전(anon)이 조회하면 401', async () => {
  for (const table of ['species', 'folders']) {
    const res = await local.rest('anon', 'GET', `${table}?select=*`);
    assert.equal(res.status, 401, table);
    assert.equal(res.body.code, '42501', table);
  }
});
