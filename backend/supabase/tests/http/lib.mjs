// HTTP 시험 공통 도우미 (담당: BE-A). 도우미가 더 필요하면 BE-A에게 요청한다.
// 시험 파일은 Node 내장 시험 도구(node:test)로 실행한다. 실행 방법은 backend/README.md의 "HTTP 시험"을 본다.

import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Supabase CLI는 실행한 위치에서 supabase/ 폴더를 찾으므로 backend/에서 실행한다.
const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// 응답 본문은 JSON이면 객체로, 아니면 문자열 그대로 돌려준다.
async function send(url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json = text;
  try {
    json = JSON.parse(text);
  } catch {
    // JSON이 아닌 응답(빈 본문 등)은 문자열 그대로 둔다.
  }
  return { status: res.status, body: json };
}

// 로컬 Supabase의 주소와 키를 supabase status에서 읽는다. 키를 파일에 적지 않기 위해서다.
function readLocalStatus() {
  let output;
  try {
    output = execSync('npx supabase@2.122.0 status -o json', {
      cwd: BACKEND_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error('로컬 Supabase가 실행 중이 아니다. backend/에서 npx supabase@2.122.0 start를 먼저 실행한다.');
  }
  const status = JSON.parse(output);
  return {
    apiUrl: status.API_URL,
    functionsUrl: status.FUNCTIONS_URL,
    publishableKey: status.PUBLISHABLE_KEY,
    secretKey: status.SECRET_KEY,
    // 예전 방식(HS256) JWT. auth 미들웨어가 이 토큰을 거절하는지 시험할 때만 쓴다.
    legacyAnonKey: status.ANON_KEY,
  };
}

// who: 'service'(secret key, RLS 우회) | 'anon'(로그인 전) | signup()이 돌려준 사용자
function headersFor(env, who) {
  if (who === 'service') return { apikey: env.secretKey };
  if (who === 'anon') return { apikey: env.publishableKey };
  return { apikey: env.publishableKey, Authorization: `Bearer ${who.token}` };
}

function createClient(env, { canDeleteUsers }) {
  const createdUsers = [];

  return {
    env,
    createdUsers,

    // 익명 가입. 만든 사용자는 기록해 두었다가 deleteCreatedUsers()로 지운다.
    async signup() {
      const res = await send(`${env.apiUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: { apikey: env.publishableKey },
        body: {},
      });
      if (res.status !== 200) throw new Error(`익명 가입 실패: ${res.status}`);
      const user = { id: res.body.user.id, token: res.body.access_token, isAnonymous: res.body.user.is_anonymous };
      createdUsers.push(user.id);
      return user;
    },

    // Data API (PostgREST). 행을 돌려받도록 Prefer 헤더를 붙인다.
    rest(who, method, pathAndQuery, body) {
      return send(`${env.apiUrl}/rest/v1/${pathAndQuery}`, {
        method,
        headers: { ...headersFor(env, who), Prefer: 'return=representation' },
        body,
      });
    },

    // SQL 함수 호출. schema를 null로 주면 Content-Profile 없이(public으로) 부른다.
    rpc(who, fn, args, { schema = 'server' } = {}) {
      const headers = headersFor(env, who);
      if (schema) headers['Content-Profile'] = schema;
      return send(`${env.apiUrl}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: args });
    },

    // api 함수 호출. headers를 주면 who 대신 그 헤더를 그대로 쓴다(잘못된 토큰 시험용).
    api(who, apiPath, { method = 'GET', body, headers } = {}) {
      return send(`${env.functionsUrl}/api${apiPath}`, {
        method,
        headers: headers ?? headersFor(env, who),
        body,
      });
    },

    // 사용자를 지우면 그 사용자의 프로필·폴더·세션·퀴즈 등이 cascade로 함께 지워진다.
    async deleteCreatedUsers() {
      if (!canDeleteUsers) return;
      for (const id of createdUsers) {
        await send(`${env.apiUrl}/auth/v1/admin/users/${id}`, {
          method: 'DELETE',
          headers: { apikey: env.secretKey },
        });
      }
    },
  };
}

export function createLocalClient() {
  return createClient(readLocalStatus(), { canDeleteUsers: true });
}

// 원격은 주소와 publishable key를 환경 변수로만 받는다. secret key는 쓰지 않으므로 사용자를 지울 수 없다.
export function createRemoteClient() {
  const apiUrl = process.env.REMOTE_SUPABASE_URL;
  const publishableKey = process.env.REMOTE_SUPABASE_PUBLISHABLE_KEY;
  if (!apiUrl || !publishableKey) {
    throw new Error('REMOTE_SUPABASE_URL과 REMOTE_SUPABASE_PUBLISHABLE_KEY 환경 변수를 설정한다. 방법은 backend/README.md의 "HTTP 시험"을 본다.');
  }
  return createClient(
    { apiUrl, functionsUrl: `${apiUrl}/functions/v1`, publishableKey },
    { canDeleteUsers: false },
  );
}

// api 함수가 응답하는지 health 라우트로 확인한다.
export async function assertFunctionsRunning(client) {
  let res;
  try {
    res = await client.api('anon', '/health');
  } catch {
    res = null;
  }
  if (res?.status !== 200 || res.body?.ok !== true) {
    throw new Error(`api 함수가 응답하지 않는다(상태 ${res?.status ?? '연결 실패'}). supabase start와 functions serve가 실행 중인지 확인한다.`);
  }
}

// api 함수가 AppError로 보낸 응답({ error: { code, message } })인지 확인한다.
// 게이트웨이(verify_jwt)가 함수 앞에서 막은 응답은 모양이 달라 이 확인을 통과하지 않는다.
export function assertAppError(res, status, code) {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body?.error?.code, code, JSON.stringify(res.body));
}

// base64url 인코딩된 JWT 조각을 다룬다. 위조 토큰 시험용이다.
export const decodeJwtPart = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
export const encodeJwtPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
