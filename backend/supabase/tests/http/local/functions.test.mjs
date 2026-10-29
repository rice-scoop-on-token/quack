// api 함수의 공통 처리(auth 미들웨어)와 GET /me 시험 (담당: BE-A). api 함수가 응답해야 한다(backend/README.md "HTTP 시험").
// 라우트별 시험은 <도메인>.test.mjs로 따로 만든다(예: quizzes.test.mjs).

import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { after, before, test } from 'node:test';

import { assertAppError, assertFunctionsRunning, createLocalClient, decodeJwtPart, encodeJwtPart } from '../lib.mjs';

const local = createLocalClient();
let A;
let B;

before(async () => {
  await assertFunctionsRunning(local);
  A = await local.signup();
  B = await local.signup();
});

after(() => local.deleteCreatedUsers());

test('health는 사용자 토큰 없이 200', async () => {
  const res = await local.api('anon', '/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test('익명 사용자 토큰은 통과한다 (프로필 전이라 NOT_FOUND)', async () => {
  assertAppError(await local.api(A, '/me'), 404, 'NOT_FOUND');
});

test('토큰 없이(apikey만) 부르면 미들웨어가 UNAUTHORIZED', async () => {
  assertAppError(await local.api('anon', '/me'), 401, 'UNAUTHORIZED');
});

test('예전 방식(HS256) JWT는 게이트웨이는 통과하지만 미들웨어가 UNAUTHORIZED', async () => {
  const headers = { apikey: local.env.publishableKey, Authorization: `Bearer ${local.env.legacyAnonKey}` };
  assertAppError(await local.api(null, '/me', { headers }), 401, 'UNAUTHORIZED');
});

test('sub만 B로 바꾼 토큰은 거절된다', async () => {
  const [header, payload, signature] = A.token.split('.');
  const forged = encodeJwtPart({ ...decodeJwtPart(payload), sub: B.id });
  const headers = { apikey: local.env.publishableKey, Authorization: `Bearer ${header}.${forged}.${signature}` };
  assert.equal((await local.api(null, '/me', { headers })).status, 401);
});

test('다른 키로 서명하고 진짜 kid를 붙인 토큰은 거절된다', async () => {
  const [header, payload] = A.token.split('.');
  const forged = encodeJwtPart({ ...decodeJwtPart(payload), sub: B.id });
  const keys = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keys.privateKey,
    new TextEncoder().encode(`${header}.${forged}`),
  );
  const token = `${header}.${forged}.${Buffer.from(signature).toString('base64url')}`;
  const headers = { apikey: local.env.publishableKey, Authorization: `Bearer ${token}` };
  assert.equal((await local.api(null, '/me', { headers })).status, 401);
});

test('프로필을 만들면 각자 자기 프로필만 받는다', async () => {
  await local.rest(A, 'POST', 'profiles', { id: A.id, display_name: '에이' });
  await local.rest(B, 'POST', 'profiles', { id: B.id, display_name: '비' });

  let res = await local.api(A, '/me');
  assert.equal(res.status, 200);
  assert.equal(res.body.profile.id, A.id);

  res = await local.api(B, '/me');
  assert.equal(res.body.profile.id, B.id);

  // 쿼리에 다른 사용자 id를 넣어도 토큰의 사용자만 쓴다.
  res = await local.api(A, `/me?user_id=${B.id}`);
  assert.equal(res.body.profile.id, A.id);
});
