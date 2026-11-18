// 원격 프로젝트 반영 확인. 로컬 시험과 따로 실행한다(backend/README.md "HTTP 시험").
// 주소와 publishable key는 환경 변수로만 받고, secret key는 쓰지 않는다.
// 그래서 시험 사용자를 지울 수 없다. 끝나면 출력된 사용자 id를 대시보드 → Authentication → Users에서 지운다.

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { assertAppError, createRemoteClient, decodeJwtPart, encodeJwtPart } from '../lib.mjs';

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
  // 인자 이름이 맞아야 Data API가 함수를 찾고 권한 검사까지 간다. 한도 0이면 실행되어도 사용량을 쓰지 않는다.
  const args = { p_user_id: NIL, p_kind: 'analysis', p_daily_limit: 0 };
  let res = await remote.rpc(user, 'consume_ai_quota', args);
  assert.equal(res.status, 403);
  assert.equal(res.body.message, 'permission denied for schema server');

  res = await remote.rpc('anon', 'consume_ai_quota', args);
  assert.equal(res.status, 401);
  assert.equal(res.body.message, 'permission denied for schema server');
});

test('금지된 칸·테이블은 403', async () => {
  await remote.rest(user, 'POST', 'profiles', { id: user.id, display_name: '원격시험' });
  const folder = await remote.rest(user, 'POST', 'folders', { user_id: user.id, name: '원격 폴더', species_id: 'rubber_duck' });
  const session = await remote.rest(user, 'POST', 'sessions', { user_id: user.id, folder_id: folder.body[0].id, goal: '목표' });
  assert.equal(session.body[0].status, 'active');

  // 폴더의 동물은 만든 뒤 바꿀 수 없다.
  let res = await remote.rest(user, 'PATCH', `folders?id=eq.${folder.body[0].id}`, { species_id: 'cat' });
  assert.equal(res.status, 403);
  res = await remote.rest(user, 'PATCH', `sessions?id=eq.${session.body[0].id}`, { status: 'reported' });
  assert.equal(res.status, 403);
  res = await remote.rest(user, 'POST', 'xp_ledger', { user_id: user.id, amount: 9999, reason: 'session_reward' });
  assert.equal(res.status, 403);
  res = await remote.rest(user, 'GET', 'quiz_questions?select=id');
  assert.equal(res.status, 403);
});

// 서버 코드가 service role(adminDb)로 DB에 쓰는 경로가 원격에서 동작하는지 확인한다.
// 원격은 로컬과 기본 권한이 달라, service_role 권한이 빠지면 이 경로만 42501(500)로 실패했다(docs/decisions/0002).
// /finish는 AI를 부르지 않아 비용이 없고, adminDb로 sessions를 수정한다.
test('api 함수: service role 경로(/finish)가 동작한다', async () => {
  const folder = await remote.rest(user, 'POST', 'folders', { user_id: user.id, name: '종료 시험 폴더', species_id: 'cat' });
  const session = await remote.rest(user, 'POST', 'sessions', { user_id: user.id, folder_id: folder.body[0].id, goal: '종료 시험' });
  const sessionId = session.body[0].id;

  const first = await remote.api(user, `/sessions/${sessionId}/finish`, { method: 'POST' });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.session.status, 'finished');
  assert.equal(first.body.review.turn_count, 0);

  // 이미 종료된 세션은 아무것도 바꾸지 않고 같은 응답을 돌려준다.
  const again = await remote.api(user, `/sessions/${sessionId}/finish`, { method: 'POST' });
  assert.equal(again.status, 200);
  assert.deepEqual(again.body, first.body);
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

// #31 2번(db push) 확인: 공부 시작 재시도 키 칸이 원격 DB에 반영됐는지 본다.
// 칸이 없으면 PostgREST가 400(42703)을 준다. authenticated는 sessions에 테이블 단위 SELECT가 있어 조회할 수 있다(#29).
test('sessions.request_id 칸이 원격에 있다', async () => {
  const res = await remote.rest(user, 'GET', 'sessions?select=request_id&limit=1');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body), JSON.stringify(res.body));
});

// #31 4번(api 함수 배포) 확인: 배포 전에는 라우트가 없어 404 NOT_FOUND가 오므로, 400으로 배포 여부를 구분한다.
// request_id를 빼서 요청 검사에서 막히게 한다. 그래서 DB 조회·AI 호출·사용량 차감이 일어나지 않는다.
test('api 함수: POST /sessions/start가 배포돼 있다', async () => {
  const res = await remote.api(user, '/sessions/start', { method: 'POST', body: { folder_id: NIL, goal: '스택' } });
  assertAppError(res, 400, 'VALIDATION_FAILED');
});

// #31 4번(api 함수 배포) 확인: 배포 전에는 404 NOT_FOUND다. multipart 필드가 없는 JSON 본문은 요청 검사에서 400이 된다.
// STT 키는 검사를 통과한 뒤에 읽으므로 이 시험으로 확인할 수 없다. 키와 실제 전사는 #31 6번에서 직접 확인한다.
test('api 함수: POST /speech/transcribe가 배포돼 있다', async () => {
  const res = await remote.api(user, '/speech/transcribe', { method: 'POST', body: {} });
  assertAppError(res, 400, 'VALIDATION_FAILED');
});
