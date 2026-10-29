# 0001. Edge Function에서 shared/ 사용

- 날짜: 2026-10-29
- 상태: 결정됨
- 담당: BE-A

## 배경

앱과 서버가 주고받는 타입과 zod 스키마는 `shared/`에 두기로 했다. 그런데 Edge Function(Deno)은 `backend/supabase/functions` 안에서 실행되고, `shared/`는 그 밖(레포 루트)에 있다. 그래서 다음을 확인하기 전까지 Edge Function에서 `shared/`를 쓰지 않기로 했었다.

1. 로컬에서 `deno check`와 `functions serve`로 api 함수가 `shared/` 코드를 불러와 실행하는가
2. 원격 Supabase 프로젝트에 배포했을 때 `shared/` 파일이 번들에 포함되는가
3. `shared/` 파일이 zod 같은 외부 라이브러리를 import해도 동작하는가

## 검증 환경

| 항목 | 버전 |
| --- | --- |
| Supabase CLI | 2.122.0 (`npx supabase@2.122.0`) |
| 로컬 엣지 런타임 | supabase-edge-runtime 1.77.8 (Deno 2.1.4 호환) |
| 타입 검사용 Deno | 2.9.8 |
| hono / zod | 4.13.14 / 4.6.7 |
| Expo SDK | 58 |
| 원격 프로젝트 | quack-dev |

## 검증 방법

api 함수의 `deno.json`에 shared와 zod를 등록하고, 검증용 라우트 `GET /api/verify-shared`가 아래 값을 돌려주게 했다.

```json
{
  "imports": {
    "@quack/shared": "../../../../shared/src/index.ts",
    "zod": "npm:zod@4.6.7"
  }
}
```

시험한 경우는 다음과 같다.

| 경우 | 내용 |
| --- | --- |
| A | shared의 상수 하나 |
| B1 | shared 내부 import, 확장자 없음 (`./verifyInner`) |
| B2 | shared 내부 import, `.ts` 확장자 (`./verifyInner.ts`) |
| B3 | B1 + 함수 `deno.json`에 `"unstable": ["sloppy-imports"]` |
| C | shared 파일이 `import { z } from 'zod'` (B2 형태와 함께) |

검증용 코드는 모두 되돌렸고, 원격 함수도 health만 있는 코드로 다시 배포했다.

## 결과

| 경우 | `deno check` | `pnpm typecheck` | 로컬 serve | 원격 배포(기본) | Metro(Android·웹) |
| --- | --- | --- | --- | --- | --- |
| A. 상수 | 통과 | 통과 | 통과 | 통과 | 통과 |
| B1. 확장자 없음 | 실패 | 통과 | 실패 (BOOT_ERROR) | 시험 안 함 | - |
| B3. B1 + sloppy imports | 통과 | 통과 | 실패 (BOOT_ERROR) | 시험 안 함 | - |
| B2. `.ts` 확장자 | 통과 | 실패 (TS5097) | 통과 | 통과 | 통과 |
| C. zod | 통과 | B2와 같음 | 통과 | 통과 | 통과 |

- 원격 배포는 기본 방식(`functions deploy api`, Docker 번들링)으로 성공했다. `--use-api`는 필요 없었다.
- 로컬 serve도 CLI가 import map을 따라 `shared/` 파일을 읽어 실행 환경으로 넘긴다. `backend/` 밖에 있어도 문제없다.
- B2의 `pnpm typecheck` 실패는 shared와 frontend 모두에서 났다. 두 tsconfig에 `allowImportingTsExtensions`를 켜면 통과하고, 그 상태에서 `expo export`(Android, 웹) 번들에 shared 내부 파일과 zod가 모두 들어간다.
- B3는 원격에서 시험하지 않았다. 로컬 엣지 런타임이 sloppy imports 설정을 따르지 않아 `deno check`만 통과하고 실행은 실패했다. 원격 결과와 관계없이 "검사는 통과하는데 실행은 실패하는" 조합이라 쓸 수 없다.

## 결정

**shared/를 유지하고, Edge Function에서도 shared를 import해 쓴다.** `functions/_shared`로 옮기지 않는다.

- shared 내부 import에는 반드시 `.ts` 확장자를 붙인다. 앱(Metro)과 함수(Deno) 양쪽에서 동작하는 형태는 이것뿐이다.
- 함수에서 shared를 쓸 때는 함수 `deno.json`의 `imports`에 `"@quack/shared": "../../../../shared/src/index.ts"`를 추가하고 `@quack/shared`로 import한다.
- shared가 쓰는 외부 라이브러리는 shared `package.json`(앱용)과 함수 `deno.json`(함수용) 두 곳에 같은 버전으로 적는다.

## 인증 키와 verify_jwt (auth 미들웨어 설계 참고)

검증하면서 확인한 동작이다. 함수는 `verify_jwt` 기본값(켜짐)으로 배포했다.

| 요청 | 로컬 (CLI 2.122.0) | 원격 (quack-dev) |
| --- | --- | --- |
| `apikey: <publishable key>` | 200 | 200 |
| `Authorization: Bearer <publishable key>` | 401 (Invalid JWT format) | 200 |
| `Authorization: Bearer <legacy anon key>` | 200 | 시험 안 함 |
| 인증 헤더 없음 | 401 | 401 |

공식 문서([Authorization headers](https://supabase.com/docs/guides/functions/auth-headers), [API keys](https://supabase.com/docs/guides/api/api-keys))의 내용은 다음과 같다.

- publishable·secret key는 JWT가 아니다. legacy anon·service_role key는 2026년 말까지 폐지된다.
- API 키는 `apikey` 헤더에 넣고, `Authorization`은 사용자 토큰에만 쓴다. 로그인한 사용자가 supabase-js로 호출하면 `Authorization`에 세션 JWT, `apikey`에 publishable key가 실린다.
- 사용자 JWT로만 호출되는 함수는 `verify_jwt`를 켜 둔다. 웹훅처럼 Authorization 없이 API 키로 호출되는 함수만 끈다.
- `verify_jwt` 검사를 통과했다고 호출자가 인증된 것은 아니다. 인증은 함수 코드에서 하고, 공식 문서는 `@supabase/server` SDK를 권장한다.

그래서 우리 api 함수는 `verify_jwt`를 켜 둔 채로, auth 미들웨어에서 사용자 JWT를 따로 확인해 사용자별 DB 클라이언트를 만든다. 함수 안에서 `getClaims`나 JWKS로 직접 검증하는 방법은 공식 문서에서 확인하지 못했다. 확인 방법(`@supabase/server` 또는 직접 구현)은 auth 미들웨어 작업에서 정한다.

CORS preflight(OPTIONS)는 원격에서는 함수의 CORS 미들웨어가 응답했고, 로컬에서는 게이트웨이가 대신 응답했다. 브라우저(Expo 웹) 동작은 원격 기준으로 확인한다.

## 주의 사항

- **Deno 버전 차이**: 로컬 엣지 런타임은 Deno 2.1.4 호환이고, `deno check`에 쓰는 Deno는 2.9.8이다. 타입 검사를 통과해도 런타임에서 실패할 수 있다(B3가 그 예다). 함수 코드를 바꾸면 `deno check`만 믿지 말고 `functions serve`로 실행까지 확인한다.
- **확장자 없는 import는 검사로 걸러지지 않는다**: B1은 `pnpm typecheck`를 통과하지만 함수에서는 실패한다. 규칙으로 막아야 한다.
- **외부 라이브러리 버전을 두 곳에서 관리한다**: shared `package.json`과 함수 `deno.json`의 버전이 어긋나면 앱과 함수가 서로 다른 버전으로 검증하게 된다.

## 후속 작업

1. **tsconfig 변경**: shared와 frontend tsconfig에 `allowImportingTsExtensions: true`를 켠다. 두 파일을 한 PR로 함께 바꾸고 FE 담당이 리뷰한다. shared가 여러 파일로 나뉘기 전에 반영해야 한다. 그 전에는 shared를 `index.ts` 한 파일로 유지한다.
2. **auth 미들웨어**: **완료** (`functions/api/middleware/auth.ts`). `verify_jwt`는 켜 둔 채로, 미들웨어에서 `@supabase/server`(1.9.2로 고정)의 `createSupabaseContext(request, { auth: 'user' })`로 사용자 JWT를 확인한다.
   - 공식 가이드([Securing Edge Functions](https://supabase.com/docs/guides/functions/auth))가 권장하는 SDK다. JWKS로 서명을 검증하고, 사용자 토큰 클라이언트(RLS 적용)와 service role 클라이언트를 함께 만든다.
   - 같은 SDK의 Hono 어댑터(`@supabase/server/adapters/hono`)는 2026-12-01 삭제 예정(deprecated)이라 쓰지 않고, 공개 함수 하나만 써서 미들웨어를 직접 만들었다. 대안이던 supabase-js 직접 구현(`auth.getClaims`)보다 우리가 관리할 코드가 적다.
   - 이 SDK는 예전 방식(HS256, 헤더에 `kid` 없음) 사용자 JWT를 거부한다. 로컬(CLI 2.122.0)과 원격(quack-dev) 모두 ES256 + `kid`로 발급되는 것을 확인했다.
   - 자주 바뀌는 새 패키지라 정확한 버전으로 고정하고, 올릴 때는 변경 기록을 확인한다.
