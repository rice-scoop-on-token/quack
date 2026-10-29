// 원격 프로젝트 반영 확인. 로컬 시험과 따로 실행한다(backend/README.md "HTTP 시험").
// 주소와 publishable key는 환경 변수로만 받고, secret key는 쓰지 않는다.
// 그래서 시험 사용자를 지울 수 없다. 끝나면 출력된 사용자 id를 대시보드 → Authentication → Users에서 지운다.

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { createRemoteClient, decodeJwtPart, encodeJwtPart } from '../lib.mjs';

const remote = createRemoteClient();
const NIL = '00000000-0000-4000-8000-000000000000';
let user;

before(async () => {
  user = await remote.signup();
});

after(() => {
  console.log(`\n[원격 시험] 대시보드에서 지울 시험 사용자 id: ${remote.createdUsers.join(', ')}`);
});

test('익명 가입', () => {
  assert.ok(user.token);
  assert.equal(user.isAnonymous, true);
});

test('동물 3종이 있다', async () => {
  const res = await remote.rest(user, 'GET', 'species?select=id&order=id');
  assert.deepEqual(res.body.map((row) => row.id), ['cat', 'raccoon', 'rubber_duck']);
});

test('server 함수: 노출되어 있고, 익명 토큰 403·로그인 전 401로 막힌다', async () => {
  const args = { p_user_id: NIL, p_item_id: 'x' };
  let res = await remote.rpc(user, 'purchase_item', args);
  assert.equal(res.status, 403);
  assert.equal(res.body.message, 'permission denied for schema server');

  res = await remote.rpc('anon', 'purchase_item', args);
  assert.equal(res.status, 401);
  assert.equal(res.body.message, 'permission denied for schema server');
});

test('금지된 칸·테이블은 403', async () => {
  await remote.rest(user, 'POST', 'profiles', { id: user.id, display_name: '원격시험' });
  const folder = await remote.rest(user, 'POST', 'folders', { user_id: user.id, name: '원격 폴더' });
  const session = await remote.rest(user, 'POST', 'sessions', { user_id: user.id, folder_id: folder.body[0].id, goal: '목표' });
  assert.equal(session.body[0].status, 'active');

  let res = await remote.rest(user, 'PATCH', `sessions?id=eq.${session.body[0].id}`, { status: 'reported' });
  assert.equal(res.status, 403);
  res = await remote.rest(user, 'POST', 'xp_ledger', { user_id: user.id, amount: 9999, reason: 'session_reward' });
  assert.equal(res.status, 403);
  res = await remote.rest(user, 'GET', 'quiz_questions?select=id');
  assert.equal(res.status, 403);
});

test('api 함수: health 200, /me는 토큰이 있을 때만 자기 프로필', async () => {
  let res = await remote.api('anon', '/health');
  assert.equal(res.status, 200);

  res = await remote.api(user, '/me');
  assert.equal(res.status, 200);
  assert.equal(res.body.profile.id, user.id);

  res = await remote.api('anon', '/me');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'UNAUTHORIZED');

  const [header, payload, signature] = user.token.split('.');
  const forged = encodeJwtPart({ ...decodeJwtPart(payload), sub: NIL });
  res = await remote.api(null, '/me', {
    headers: { apikey: remote.env.publishableKey, Authorization: `Bearer ${header}.${forged}.${signature}` },
  });
  assert.equal(res.status, 401);
});
