# backend

Supabase 프로젝트(DB 마이그레이션, seed, Edge Functions)가 있는 폴더다.

## Supabase 명령어는 이 폴더에서 실행한다

Supabase CLI는 명령어를 실행한 위치에서 `supabase/` 폴더(`supabase/config.toml`)를 찾는다. 레포 루트에서 실행하면 `backend/supabase/`를 찾지 못하므로, 반드시 `backend/`로 이동한 뒤 실행한다.

```bash
cd backend
npx supabase@2.122.0 start            # 로컬 Supabase 실행 (Docker 필요)
npx supabase@2.122.0 db reset         # 마이그레이션 + seed 재적용
npx supabase@2.122.0 functions serve  # 함수 로컬 실행
```

CLI는 설치하지 않고 `npx supabase@2.122.0`으로 실행한다. 팀원 모두 같은 버전을 쓰기 위해서다.

## API 함수 로컬 실행

`supabase/functions/api`는 Hono로 라우팅하는 Edge Function 하나다. 주소는 `/functions/v1/api/...` 형태다.

```bash
cd backend
npx supabase@2.122.0 start            # 로컬 Supabase가 꺼져 있으면 먼저 실행
npx supabase@2.122.0 functions serve  # 함수 실행 (코드를 고치면 자동으로 다시 불러온다)
```

다른 터미널에서 health 라우트로 동작을 확인한다. `<anon key>`는 `npx supabase@2.122.0 status -o env`에 나오는 `ANON_KEY` 값이다. 함수 입구에서 JWT를 검사하므로 `sb_publishable_`로 시작하는 키를 Bearer로 넣으면 401이 난다.

```bash
curl -H "Authorization: Bearer <anon key>" http://127.0.0.1:54321/functions/v1/api/health
# {"ok":true} 가 나오면 정상
```

타입 검사는 함수 폴더(`supabase/functions/api`)에서 `deno check index.ts`로 한다. Deno는 실행한 폴더부터 위로 올라가며 `deno.json`을 찾는데, 레포 루트에는 `deno.json`이 없어 hono를 찾지 못하기 때문이다.

## 환경 변수

`supabase/functions/.env.example`을 복사해 `supabase/functions/.env`를 만들고 값을 채운다. `.env`는 커밋하지 않는다.

## 새 라우트 만들기

예시는 `GET /api/me`다. 아래 두 파일을 열어 두고 같은 모양으로 만든다.

- 라우트: `supabase/functions/api/routes/me.ts`
- 서비스: `supabase/functions/api/services/profile.service.ts`

요청은 `auth 미들웨어 → route → service → DB(또는 _ai)` 한 방향으로 흐른다. 아래 경로는 모두 `supabase/functions/api/` 기준이다.

### 1. 계약(스키마)을 확인한다

요청·응답 스키마는 `shared/src/api.ts`에서 가져온다. 필요한 스키마가 없으면 라우트 파일에 임시로 만들지 말고, shared 변경을 별도 PR로 먼저 올린다(CLAUDE.md shared 섹션). `GET /me`는 앱이 프로필을 supabase-js로 직접 읽기 때문에 예외로 라우트 파일 안에 스키마를 두었다.

### 2. service를 만든다

`services/<도메인>.service.ts`에 로직과 DB 접근을 둔다.

- `Context`나 `Request` 같은 HTTP 객체는 받지 않는다. DB 클라이언트, 사용자 id, 검증을 통과한 값만 인자로 받는다.
- DB 에러는 `if (error) throw appErrorFromDb(error);`로 바꿔 던진다. `server` 스키마 함수가 raise한 `NOT_FOUND`, `ALREADY_OWNED` 같은 코드는 그대로 앱에 전달되고, 그 외 에러는 `INTERNAL_ERROR`가 된다.
- 상황에 따른 에러는 `throw new AppError('INVALID_STATE')`처럼 shared의 에러 코드로 던진다.

### 3. route를 만든다

`routes/<도메인>.ts`에 HTTP 입출력만 둔다.

- `new Hono<AuthEnv>()`로 만든다. 그래야 `c.var.userId` 같은 값의 타입이 잡힌다.
- 요청 본문은 `validateJson(스키마)`, 경로 파라미터는 `validateParams(스키마)`를 핸들러 앞에 넣고 `c.req.valid('json')`, `c.req.valid('param')`으로 꺼낸다.
- 사용자 id는 `c.var.userId`만 쓴다. 요청 본문·경로·쿼리로 받은 user_id는 쓰지 않는다.
- 응답은 `respond(c, 응답 스키마, 데이터)`로만 보낸다. `c.json`을 직접 쓰지 않는다.
- 서버 로그에 요청·응답 값을 남기지 않는다.

### 4. index.ts에 등록한다

`index.ts`에서 `app.use('*', authMiddleware)` **아래**에 한 줄을 추가한다. 그 위에 등록하면 인증 없이 열린다.

```ts
app.route('/sessions', sessionsRoute);
```

BE-B는 `index.ts`에서 이 등록 줄만 추가할 수 있다(CLAUDE.md 예외).

### 5. DB 클라이언트를 고른다

| 하려는 일 | 쓸 클라이언트 |
| --- | --- |
| 자기 데이터 조회, 앱도 쓸 수 있는 칸에 쓰기 | `c.var.userDb` (RLS 적용) |
| 서버만 쓰는 테이블·칸에 쓰기 (`explanation_turns`, `quizzes`, `quiz_questions`, `sessions.status` 등) | `c.var.adminDb` |
| `server` 스키마 함수 호출 (`grant_session_reward`, `consume_ai_quota`) | `c.var.adminDb.schema('server').rpc(...)` |

앱이 어떤 테이블·칸을 쓸 수 있는지는 `docs/decisions/0002-db-permissions.md`의 "앱 역할 권한" 표를 본다.

`adminDb`는 RLS를 우회해서 다른 사용자의 행도 읽고 쓸 수 있다. 그래서 쓸 때는 다음을 지킨다.

- 쓰는 곳에 왜 `adminDb`가 필요한지 주석을 단다.
- DB에 쓰는 `user_id`는 `c.var.userId`만 쓴다.
- 세션에 딸린 행(설명, 퀴즈 등)을 `adminDb`로 다루기 전에, 먼저 `userDb`로 그 세션을 조회해 내 세션인지 확인한다. 조회되지 않으면 `NOT_FOUND`다.

### 6. 로컬에서 확인한다

`supabase start`와 `functions serve`는 직접 별도 터미널에서 띄운다. Claude는 실행 중인지 확인하고 요청만 보낸다.

익명 가입으로 사용자 토큰을 받는다. `<publishable key>`는 `npx supabase@2.122.0 status -o env`의 `PUBLISHABLE_KEY` 값이다.

```bash
curl -s -X POST http://127.0.0.1:54321/auth/v1/signup \
  -H "apikey: <publishable key>" -H "Content-Type: application/json" -d '{}'
# 응답의 access_token 값을 복사한다
```

받은 토큰으로 라우트를 부른다.

```bash
curl -H "Authorization: Bearer <access_token>" http://127.0.0.1:54321/functions/v1/api/me
```

`GET /me`는 프로필을 만들기 전에는 404 `NOT_FOUND`가 정상이다. 토큰 없이 부르거나 잘못된 토큰을 넣으면 401이 난다.

### 7. HTTP 시험을 추가한다

`supabase/tests/http/local/`에 시험을 추가한다. 라우트별로 `<도메인>.test.mjs` 파일을 새로 만들고, `quizzes.test.mjs`(BE-B 라우트 시험 예시)를 본보기로 삼는다. 아래 "HTTP 시험"의 도우미(`lib.mjs`)를 쓰고, 도우미가 더 필요하면 BE-A에게 요청한다.

### 8. 검사를 실행한다

- 함수 폴더(`supabase/functions/api`)에서 `deno check index.ts`
- 레포 루트에서 `pnpm typecheck`
- `backend/`에서 HTTP 시험 (아래 "HTTP 시험")
- 마이그레이션을 바꿨다면 `backend/`에서 `npx supabase@2.122.0 db reset` 후 `npx supabase@2.122.0 test db`

## HTTP 시험

DB 권한·제약 시험(`supabase/tests/database`, pgTAP)으로 확인할 수 없는 것을 실제 HTTP 요청으로 확인한다. Node 내장 시험 도구(`node:test`)로 실행하고, 따로 설치할 것은 없다.

| 파일 | 시험 | 필요한 것 |
| --- | --- | --- |
| `local/data-api.test.mjs` | `server` 스키마 노출, 401(로그인 전)·403(권한 없음) 구분, 익명 가입 | `supabase start` |
| `local/concurrency.test.mjs` | 동시 요청: 사용량 한도, 보상 중복 지급, 구매 잔액. `server` 스키마 함수를 바꾸면 먼저 돌린다 | `supabase start` |
| `local/functions.test.mjs` | api 함수 공통 처리: auth 미들웨어, `GET /me` (BE-A) | api 함수가 응답해야 함 |
| `local/quizzes.test.mjs` | 퀴즈 API (BE-B). 라우트 시험 예시 | api 함수가 응답해야 함 |
| `local/sessions.test.mjs` | 세션 종료 API (BE-B) | api 함수가 응답해야 함 |
| `remote/remote.test.mjs` | 원격 프로젝트 반영 확인 | 아래 환경 변수 |

`supabase start`와 `functions serve`는 직접 별도 터미널에서 띄운다. 이 환경(CLI 2.122.0)에서는 `supabase start`만으로도 api 함수가 뜬다. 함수를 개발하거나 PR을 시험할 때는 CLAUDE.md 규칙대로 `functions serve`를 띄운 상태에서 실행한다. api 함수가 응답하지 않으면 해당 시험 파일은 안내 메시지와 함께 멈춘다.

### 로컬

```bash
cd backend
node --test "supabase/tests/http/local/*.test.mjs"
```

- 주소와 키는 시험이 `npx supabase@2.122.0 status`에서 읽는다. 파일에 키를 적지 않는다.
- 시험마다 익명 사용자를 새로 만들고, 끝나면 지운다. 사용자를 지우면 그 사용자의 폴더·세션·퀴즈 등이 함께 지워진다. 시험이 실패해도 지운다.
- 실행을 강제로 멈춰서(Ctrl+C 등) 데이터가 남았다면 `npx supabase@2.122.0 db reset`으로 정리한다.

### 원격

원격 주소와 publishable key(대시보드 → Project Settings → API Keys)를 환경 변수로 넣고 실행한다. secret key는 넣지 않는다.

```powershell
cd backend
$env:REMOTE_SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:REMOTE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_..."
node --test supabase/tests/http/remote/remote.test.mjs
```

원격 시험은 secret key를 쓰지 않아 시험 사용자를 스스로 지우지 못한다. 끝에 출력되는 사용자 id를 대시보드 → Authentication → Users에서 지운다.
