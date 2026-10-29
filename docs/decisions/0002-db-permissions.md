# 0002. DB 권한 설계와 서버용 SQL 함수

- 날짜: 2026-10-29
- 상태: 결정됨
- 담당: BE-A

## 배경

폴더, 자료 목록, 캐릭터 조회, 아이템 장착 같은 단순 CRUD는 Edge Function 없이 앱이 supabase-js로 DB에 직접 쓴다. 앱 코드는 사용자가 고칠 수 있으므로, "자기 데이터만", "바꿔도 되는 칸만", "보상은 서버만"이라는 약속은 앱이 아니라 DB가 강제해야 한다.

경험치·포인트 지급, 아이템 구매, AI 사용량 차감처럼 클라이언트를 믿으면 안 되는 일은 서버(Edge Function)가 한다. 이 일들은 여러 테이블을 한 번에 바꾸고 동시에 들어온 요청에도 틀어지면 안 되는데, supabase-js로는 여러 문장을 묶은 트랜잭션을 실행할 수 없다.

## 결정 요약

권한을 세 겹으로 막는다.

| 장치 | 막는 것 | 예 |
| --- | --- | --- |
| RLS 정책 | 어느 **행**에 접근하는가 | 다른 사용자의 폴더를 조회·수정·삭제할 수 없다 |
| 칸 단위 GRANT | 어느 **칸**을 쓰는가 | 자기 세션이어도 `status`는 바꿀 수 없다 |
| `server` 스키마의 SQL 함수 | 서버만 하는 일 | 보상 지급, 아이템 구매, AI 사용량 차감 |

- 모든 테이블에 RLS를 켜고, 앱 역할(`anon`, `authenticated`)의 테이블 권한을 모두 회수한 뒤 필요한 칸만 다시 GRANT한다. Supabase는 `public`에 새로 만든 테이블에 앱 역할 권한을 넓게 주기 때문에 회수부터 해야 한다.
- 익명 로그인 사용자도 `authenticated` 역할이다. `anon`(로그인 전)에는 아무 권한도 주지 않는다.
- 서버만 쓰는 테이블과 서버용 SQL 함수는 Edge Function이 service role 클라이언트로 쓴다(CLAUDE.md Backend 섹션).

## 앱 역할(`authenticated`) 권한

로컬 DB에서 `information_schema`로 조회한 결과와 같다. 모든 테이블에 "자기 행만" RLS 정책이 함께 걸려 있다.

| 테이블 | 조회 | 추가할 수 있는 칸 | 수정할 수 있는 칸 | 삭제 |
| --- | --- | --- | --- | --- |
| profiles | 자기 행 | `id`, `display_name` | `display_name`, `onboarding_completed_at` | 불가 |
| species, items | 전체 | 불가 | 불가 | 불가 |
| characters | 자기 행 | `user_id`, `species_id` | 불가 | 불가 |
| user_items | 자기 행 | 불가 | `equipped` | 불가 |
| folders | 자기 행 | `user_id`, `name` | `name` | 자기 행 |
| materials | 자기 행 | `user_id`, `folder_id`, `kind`, `title`, `storage_path` | `title` | 자기 행 |
| sessions | 자기 행 | `user_id`, `folder_id`, `goal` | 불가 | 불가 |
| explanation_turns, quizzes, quiz_attempts, reports | 자기 세션의 행 | 불가 | 불가 | 불가 |
| xp_ledger, point_ledger | 자기 행 | 불가 | 불가 | 불가 |
| character_stats (view) | 자기 행 | - | - | - |
| material_contents, quiz_questions, ai_usage | **불가** (서버 전용) | 불가 | 불가 | 불가 |

- `sessions.status`, `materials.status`·`key_concepts`, 보상 관련 행은 서버만 바꾼다. 기본값(`status = 'active'` 등)은 DB가 채운다.
- `quiz_questions`에는 정답이 있어서 앱이 조회조차 할 수 없다. 앱은 API 응답(정답 제외)으로만 문항을 받는다.
- 테이블 조회 권한은 칸이 아니라 테이블 전체에 준다. 그래서 앱이 `reports`를 직접 조회하면 서버용 칸 `xp_before`도 보인다. 지급 당시 경험치라 노출돼도 문제가 없어 그대로 두었다. API 응답에서는 `respond`가 shared 스키마로 걸러 낸다.

## 데이터를 지키는 제약

코드에서 확인하는 방식은 동시에 들어온 두 요청이 함께 통과할 수 있어서, 반드시 지켜야 하는 것은 DB 제약으로 막는다.

| 제약 | 막는 것 |
| --- | --- |
| sessions·materials의 복합 외래키 `(folder_id, user_id)` → `folders (id, user_id)` | 내 `user_id`로 다른 사용자의 폴더에 세션·자료를 만드는 것. RLS는 새 행의 `user_id`만 보기 때문에 이 제약이 필요하다 |
| `characters.user_id` unique | 캐릭터를 두 개 만드는 것 |
| ledger의 부분 unique 인덱스 (`session_id`, `reason = 'session_reward'`일 때) | 같은 세션의 보상을 두 번 지급하는 것. service role도 막힌다 |
| `quiz_attempts.quiz_id` unique | 퀴즈를 두 번 제출하는 것. 다시 풀기는 새 퀴즈를 만든다 |
| `reports.session_id` unique | 세션 하나에 리포트가 두 개 생기는 것 |

**삭제할 때**

- 폴더를 지우면 그 폴더의 자료와 세션이 지워지고, 세션에 딸린 설명·퀴즈·리포트도 함께 지워진다(`on delete cascade`).
- 경험치·포인트 지급 내역은 남고 세션 연결만 비워진다(`on delete set null`). 그래서 폴더를 지워도 레벨과 포인트는 줄지 않는다.
- 보상으로 받은 아이템도 남고 `user_items.session_id`만 비워진다.
- DB cascade는 Storage 파일을 지우지 않는다. 자료 작업 때 따로 정한다.

## `character_stats` view와 `security_invoker`

`character_stats`는 ledger를 합산해 `total_xp`, `points_balance`를 보여 준다. 레벨은 shared의 `levelFromXp`로 계산하고 DB에는 두지 않는다(식이 두 곳으로 갈라지지 않게).

- view는 기본으로 **만든 사람(소유자)의 권한**으로 실행되어 RLS를 건너뛴다. 그러면 다른 사용자의 합계까지 보일 수 있다.
- 그래서 `with (security_invoker = true)`로 만들어 **조회하는 사람의 권한**으로 ledger를 읽게 했다.
- 그 결과 앱 역할에 ledger의 자기 행 조회 권한이 있어야 한다. 쓰기 권한은 없다.

## 서버용 SQL 함수

### 스키마 선택

서버용 함수를 앱이 호출할 수 없게 하면서, Edge Function은 supabase-js `.rpc()`로 부를 수 있어야 했다. `.rpc()`는 Data API를 거치기 때문에 Data API에 노출한 스키마의 함수만 부를 수 있다.

| 안 | 방법 | 판단 |
| --- | --- | --- |
| A | `public`에 두고 EXECUTE만 `service_role`에 | 가장 단순하지만 권한이 한 겹 |
| B | 노출하지 않는 스키마에 두고 Postgres에 직접 연결 | DB 드라이버와 연결 관리가 입문자에게 부담 |
| **C (선택)** | 별도 스키마 `server`를 노출하되 USAGE와 EXECUTE를 `service_role`에만 | `.rpc()` 가능. 앱 역할은 스키마와 함수 두 단계에서 막힌다 |

`config.toml`의 `[api] schemas`(원격은 대시보드 Exposed schemas)에 `server`를 넣었다.

### 함수

| 함수 | 하는 일 |
| --- | --- |
| `consume_ai_quota(user_id, kind, daily_limit)` | 서울 시간 기준 오늘 사용량을 1 올리고 `true`. 한도에 닿았으면 올리지 않고 `false`. 한도 값은 인자로 받는다(D22 결정 전) |
| `grant_session_reward(user_id, session_id, xp, points, item_ids, 리포트 칸들)` | 경험치·포인트 내역, 보상 아이템, 리포트, 세션 상태(`reported`)를 한 트랜잭션으로 기록한다. `finished` 세션에만 지급한다 |
| `purchase_item(user_id, item_id)` | 포인트 확인, 차감(음수 내역), 아이템 추가를 한 트랜잭션으로 처리한다 |
| `lock_user(user_id)` | 아래 사용자별 잠금 |

- 모든 함수에 `set search_path = ''`를 붙이고, 함수 안에서는 `public.xp_ledger`처럼 스키마 이름을 붙여 쓴다.
- 함수는 security invoker(기본값)다. 호출하는 `service_role`이 원래 테이블 권한을 갖고 있어 security definer가 필요 없고, definer는 권한이 잘못 열렸을 때 위험이 더 크다.
- 경험치·포인트 양(D8)과 보상 아이템(D9)은 서비스가 인자로 넘긴다. 함수는 두 결정과 무관하게 동작한다.

### 에러 전달

함수는 shared `ErrorCode` 문자열을 메시지로 `raise exception`한다(`NOT_FOUND`, `INVALID_STATE`, `ALREADY_OWNED`, `INSUFFICIENT_POINTS`). Data API는 이것을 HTTP 400, `code: 'P0001'`, `message: 'ALREADY_OWNED'`로 돌려준다. 서비스는 `message`를 보고 `AppError`로 바꾼다. 서버 코드의 잘못(예: 음수 경험치)은 `ErrorCode`가 아닌 문장으로 raise해서 `INTERNAL_ERROR`가 되게 한다.

### 동시 요청

- `consume_ai_quota`는 `insert … on conflict do update … where count < 한도` 한 문장으로 확인과 증가를 함께 한다.
- 보상 지급과 아이템 구매는 같은 사용자별 잠금(`pg_advisory_xact_lock`)을 쓴다. 잠금이 없으면 동시에 들어온 두 구매가 같은 잔액을 보고 둘 다 통과하거나, 두 세션의 보상이 같은 "지급 전 경험치"를 보게 된다. 잠금은 같은 사용자 안에서만 걸리고 트랜잭션이 끝나면 풀린다.
- 보상 지급은 세션 행도 `for update`로 잠근다. ledger의 부분 unique 인덱스가 마지막 안전장치다.

### 재요청에도 같은 응답

shared 계약은 `/report`를 여러 번 호출해도 첫 응답과 같은 보상을 돌려준다고 약속한다. 이를 위해 칸 두 개를 추가했다.

- `user_items.session_id`: 보상 아이템이 어느 세션에서 왔는지. 구매한 아이템은 null이다. 이미 가진 아이템은 건너뛰므로 session_id가 붙지 않는다.
- `reports.xp_before`: 지급 직전 경험치 합계. `created_at`은 트랜잭션 시작 시각이라 잠금 대기 순서와 어긋날 수 있어서, 나중에 시각으로 "이 보상 이전 합계"를 계산할 수 없다. 지급 시점의 값을 기록하면 나중에 경험치를 쌓는 다른 경로가 생겨도 틀어지지 않는다.

`grant_session_reward`는 첫 지급과 재요청 모두 **저장된 행에서 값을 읽어** `{ granted, report_id, xp, points, xp_before, xp_after, item_ids }`를 돌려준다. 재요청에서 다른 인자를 넘겨도 무시된다.

### 함수 실행 권한의 함정

계획에는 앞으로 추가할 함수도 막기 위해 `alter default privileges in schema server revoke execute on functions from public`을 넣었지만, 효과가 없어 뺐다.

- 확인 방법: 트랜잭션 안에서 `server`에 임시 함수를 만들어 `has_function_privilege('authenticated', …)`를 조회한 뒤 되돌렸다. 결과는 `true`였다.
- 이유: PUBLIC에 함수 실행 권한을 주는 것은 Postgres 전체 기본값이고, 스키마 단위 기본 권한은 그 위에 권한을 더할 수만 있다.
- 그래서 **이 스키마에 함수를 추가하는 마이그레이션은 회수·부여 두 줄을 다시 실행한다**(CLAUDE.md에 규칙으로 넣음). 빠뜨려도 앱 역할은 스키마 USAGE가 없어 호출할 수 없지만, 권한을 두 겹으로 유지하기 위해 지킨다.

## 시험 결과

익명 로그인 사용자를 만들어 앱과 같은 키·토큰으로 Data API에 요청했다. 앱이 쓸 수 없는 준비 데이터(아이템, 세션 상태, ledger)는 service role로 넣었고, 동시 요청은 `Promise.all`로 한꺼번에 보냈다. 시험 스크립트는 아직 레포 밖에 있다(후속 작업 1).

### 로컬: 테이블과 권한 (46개 통과)

| 구분 | 결과 |
| --- | --- |
| 허용: 프로필 생성·이름 수정, 동물 조회, 캐릭터 1회 생성, 폴더 CRUD, 세션 생성(`active`로 시작), 자료 생성·제목 수정, `equipped` 수정 | 통과 |
| 앱이 쓸 수 없는 칸·테이블: `sessions.status`, `materials.status`·`key_concepts`, `user_items` 추가·`source` 수정, ledger·`reports` 추가, 서버 전용 테이블 3개 조회 | 403 (`42501`) |
| A의 토큰 + B의 `folder_id`로 세션·자료 생성 | 409 (`23503`, 복합 외래키) |
| A의 토큰 + `user_id = B`로 세션 생성 | 403 (RLS) |
| 캐릭터 두 번째 생성 | 409 (`23505`) |
| A가 B의 폴더·프로필 조회·수정·삭제 | 0행 처리 |
| 로그인 전 조회 | 401 (`42501`) |
| `character_stats`, ledger 조회 | 각자 자기 행만 |
| 같은 세션 보상 두 번 (service role) | 409 (`23505`) |
| 폴더 삭제 | 세션·자료 삭제, 경험치 내역과 합계는 유지, 내역의 `session_id`만 null |

### 로컬: 서버용 SQL 함수 (40개 통과)

| 구분 | 결과 |
| --- | --- |
| 익명 토큰·로그인 전으로 함수 4개 호출 | 403·401 `permission denied for schema server` |
| 스키마 없이 호출 | 404 (`PGRST202`, 함수 없음) |
| 한도 2로 세 번 / 종류별 따로 / 한도 0 | `true, true, false` / 따로 셈 / `false` |
| 한도 5로 동시에 10번 | 정확히 5번 `true`, 저장된 사용량 5 |
| `active` 세션 보상 | `INVALID_STATE` |
| `finished` 세션 보상 | 내역·리포트(`xp_before=0`)·아이템(`session_id` 기록) 저장, 세션 `reported` |
| 이미 가진 보상 아이템 | 건너뛰고 응답 목록에서도 빠짐 |
| 다른 인자로 재요청 | `granted: false`, 나머지 값은 첫 응답과 같음, 행이 늘지 않음 |
| 다른 사용자의 세션 / 음수 경험치 | `NOT_FOUND` / `ErrorCode`가 아닌 메시지 |
| 같은 세션에 동시에 5번 | 1번만 지급, 모두 같은 리포트 |
| 다른 세션 두 개 동시 | `xp_before`가 130, 140으로 겹치지 않음 |
| 구매: 포인트 부족 / 레벨 아이템 / 없는 아이템 / 이미 보유 | `INSUFFICIENT_POINTS` / `INVALID_STATE` / `NOT_FOUND` / `ALREADY_OWNED` |
| 잔액 50에서 30짜리 두 개 동시 구매 | 하나만 성공, 잔액 20 |
| 앱이 `user_items.session_id`, `reports.xp_before` 수정 | 403 |

5-2 반영 뒤 테이블·권한 시험 46개를 다시 돌려 모두 통과했다.

### 원격 quack-dev (12개 통과)

익명 사용자 1명으로 일부만 확인하고, 시험 사용자는 대시보드에서 지웠다.

| 구분 | 결과 |
| --- | --- |
| 익명 가입 | 200, `is_anonymous: true` |
| 동물 조회 | 3종 |
| 익명 토큰으로 `server.grant_session_reward`, `server.purchase_item` / 로그인 전 | 403 / 401 `permission denied for schema server` (스키마는 노출되어 있고 권한에서 막힘) |
| 프로필·폴더·세션 생성 | 허용 |
| `sessions.status` 수정, `xp_ledger` 추가, `quiz_questions` 조회 | 403 |
| `character_stats` | 자기 행 1개 |

## 원격 반영 절차

`backend/`에서 사용자가 직접 실행한다.

1. `npx supabase@2.122.0 db push --linked --dry-run`으로 적용할 마이그레이션을 확인한 뒤 `npx supabase@2.122.0 db push --linked`
2. 새 스키마를 Data API에 노출해야 하면 대시보드 → Project Settings → Data API → Exposed schemas에 추가한다. 스키마가 먼저 있어야 하므로 1번 다음에 한다.
3. `config.toml`의 auth 설정을 바꿨다면 대시보드에서 같게 바꾼다(이번에는 Authentication → Sign In / Providers → Allow anonymous sign-ins).
4. `npx supabase@2.122.0 config diff`로 로컬과 원격 설정을 비교한다.

### 확인한 CLI 동작 (2.122.0)

- **`--linked`**: 지금은 생략해도 원격에 적용되지만 "다음 메이저 버전부터 기본 대상이 로컬"이라는 경고가 나온다. 항상 붙인다.
- **seed**: `db push`는 seed를 기본으로 적용하지 않는다. `--include-seed`를 주면 원격 `supabase_migrations.seed_files`에 파일 경로와 해시를 기록하고, 해시가 같으면 건너뛴다. **seed 파일을 고치면 해시만 갱신하고 다시 실행하지 않는다**([db push 동작 문서](https://github.com/supabase/cli/blob/v2.122.0/apps/cli/src/commands/db/push/SIDE_EFFECTS.md), [seed.go](https://github.com/supabase/cli/blob/v2.122.0/apps/cli-go/pkg/migration/seed.go)).
- **`config diff`**: 이번 작업과 관련된 항목(`api.schemas`, 익명 로그인)은 차이가 없었다. 남은 13개 차이(이메일 확인·OTP, MFA, `site_url`, 리다이렉트 주소, 연결 풀 크기, storage vector)는 원격 프로젝트 기본값이며 이번 작업과 무관하다.

### 기본 데이터 원칙

위 seed 동작 때문에 seed로는 나중에 추가한 기본 데이터가 원격에 들어가지 않는다. 그래서 **모든 환경에 있어야 하는 기본 데이터(동물, 아이템)는 마이그레이션으로 넣고, `seed.sql`에는 로컬 개발용 샘플 데이터만 둔다**(CLAUDE.md에 규칙으로 넣음). 처음에 `seed.sql`로 넣은 동물 3종은 `20261029124648_seed_species.sql`로 옮겼다. 원격에는 이미 seed로 들어간 행이 있어서 `on conflict (id) do nothing`으로 건너뛰게 했다.

## 알려진 한계와 주의

- **익명 재가입으로 한도 회피**: AI 사용량 한도는 사용자별이다. 앱을 다시 설치해 익명으로 새로 가입하면 한도가 초기화된 새 사용자가 된다(D16). 익명 가입 속도 제한(IP당 시간당 30)만 적용했다.
- **사용량은 호출 직전에 차감된다**: AI 호출이 실패해도 사용량은 돌려주지 않는다.
- **Storage 파일**: DB cascade로 자료 행이 지워져도 Storage 파일은 남는다.
- **`reports.xp_before` 노출**: 위 "앱 역할 권한"의 설명과 같다.

## 후속 작업

1. **권한 시험을 레포로 옮긴다** (`backend/supabase/tests/`, BE-A, 두 커밋)
   - A. pgTAP(`supabase test db`): 권한, RLS, 제약, 함수 동작. `server` 스키마의 **모든 함수를 훑어** `anon`·`authenticated`가 실행할 수 없는지 검사해, 나중에 추가되는 함수도 자동으로 검사되게 한다.
   - B. HTTP 스크립트: 스키마 노출, 401·403, 동시 요청. 키는 `supabase status`에서 읽는다.
2. **SQL 에러 → `AppError`**: `ErrorCode` 목록에 없는 메시지는 `INTERNAL_ERROR`로 처리하고 원문은 앱에 보내지 않는다.
3. **Storage**: 버킷·정책, 그리고 폴더·자료를 지울 때 Storage 파일도 지우는 방법을 자료 작업 때 정한다.
4. **`analysis_results` 테이블**: AI 분석 결과 스키마(commit 3)가 정해진 뒤 만든다. 위 칸 단위 권한 규칙을 따른다.
5. **아이템 기본 데이터**: D9 결정 후 마이그레이션으로 넣는다.
6. **로컬·원격 auth 설정**: `site_url`, 리다이렉트 주소, 이메일 확인을 이메일·소셜 로그인 도입 때 맞춘다.
