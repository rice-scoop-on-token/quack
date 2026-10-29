# Quack (꽥)

파인만 학습법과 러버덕 디버깅을 결합한 AI 학습 앱이다. 사용자가 공부한 내용을 AI 동물 캐릭터에게 설명하면, AI가 설명을 분석해 빈 곳을 역질문으로 짚고 다시 설명하도록 유도한다. 학습 결과에 따라 캐릭터가 성장하고 꾸미기 아이템을 얻는다.

## 팀과 작업 방식

- 4명 팀이다: FE 1명, BE 2명(BE-A, BE-B), AI 1명.
- 팀원 대부분이 개발 입문자다. 코드는 단순하고 읽기 쉽게 작성하고, 변경 이유를 PR 설명에 쉬운 말로 남긴다.
- 응답과 설명은 한국어로 한다.

### 작업 단위 규칙 (필수)

- 작업은 한 커밋 단위로만 진행한다. 여러 커밋에 걸치는 작업은 시작하지 않는다.
- 작업 시작 전에 이번 커밋의 범위와 생성·수정할 파일 목록을 먼저 제시하고 승인을 받는다.
- 범위 밖 개선점은 손대지 않고 응답 마지막에 "다음 커밋 후보"로만 기록한다.
- 담당 폴더 밖의 파일을 수정해야 하면 수정하지 말고 먼저 알린다.
- 아래 "미정 사항"에 해당하는 내용은 임의로 정하지 않고 질문한다.
- 작업을 마치면 `pnpm typecheck`를 실행하고, `backend/supabase/functions`를 수정했다면 함수 폴더에서 `deno check`도 실행해 통과를 확인한다.
- 커밋, push, PR 생성은 직접 하지 않는다. 작업을 마치면 Conventional Commits 형식의 커밋 메시지 초안과 변경 요약만 제시한다.
- 전역 도구 설치처럼 레포 밖 환경을 바꾸는 작업은 직접 하지 않고 명령어를 알려준다.
- 승인된 계획과 다른 명령어나 방법을 쓰게 되면 실행하기 전에 알리고 승인을 받는다.

## 기술 스택

- **Frontend**: Expo (React Native), expo-router, TypeScript
- **Backend**: Supabase — Auth, Postgres(+RLS), Storage, Edge Functions(Deno)
- **API 함수**: Edge Function 하나에 Hono로 라우팅한다
- **계약**: `shared/`의 TypeScript 타입과 zod 스키마
- **패키지 관리**: pnpm 워크스페이스

## 레포 구조와 담당

| 경로                                                         | 역할                                   | 담당                   |
| ------------------------------------------------------------ | -------------------------------------- | ---------------------- |
| `frontend/`                                                  | Expo 앱                                | FE                     |
| `backend/supabase/migrations/`, `seed.sql`                   | DB 스키마, RLS, 기본 데이터            | BE-A                   |
| `backend/supabase/functions/api/middleware/`                 | 공통 처리                              | BE-A                   |
| `functions/api` 의 materials, reward (route·service)         | 자료 처리, 보상 지급                   | BE-A                   |
| `functions/api` 의 speech, sessions, quizzes (route·service) | 세션 대화 흐름                         | BE-B                   |
| `backend/supabase/functions/_ai/`                            | 프롬프트, 페르소나, LLM·STT 클라이언트 | AI                     |
| `ai/evals/`                                                  | 프롬프트 평가 (배포되지 않는다)        | AI                     |
| `shared/`                                                    | 앱·서버 계약                           | 공동 (변경 시 별도 PR) |
| `docs/`                                                      | 기획, 설계 결정 기록                   | 공동                   |
| `functions/api/index.ts`, `routes/health.ts`                 | API 함수 진입점, 동작 확인 라우트      | BE-A                   |
| `functions/api/deno.json`, `deno.lock`                       | API 함수 의존성                        | BE-A                   |
| `backend/supabase/functions/_shared/`                        | DB 클라이언트 생성, env                | BE-A                   |
| `backend/supabase/config.toml`, `functions/.env.example`     | Supabase 로컬 설정, 함수 환경 변수 목록 | BE-A                   |
| 루트 설정 파일 (`package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.vscode/`, `README.md`) | 워크스페이스, 에디터 설정, 개발 환경 안내 | 공동 (변경 전에 팀에 공유) |

- 예외: BE-B는 자기 라우트 연결을 위해 `functions/api/index.ts`에 라우트 등록 줄만 추가할 수 있다.
- 예외: BE-B와 AI는 `functions/api/deno.json`과 `deno.lock`에 의존성 추가 줄만 수정할 수 있다.

Supabase CLI 명령어는 `backend/`에서 실행한다. CLI가 `supabase/` 폴더 위치를 고정으로 기대하기 때문이다.

## MVP 흐름

1. 앱 실행 → 첫 방문이면 온보딩(소개 → 동물 선택 → 첫 과목 폴더 생성 → 자료 업로드 선택) → 홈
2. 홈 → 공부 시작 → 과목 폴더 선택 → 오늘의 학습 목표 입력 → 타이머 시작
3. 타이머 진행 중 일정 시간 설명이 없으면 AI가 먼저 질문한다. 사용자는 음성 또는 채팅으로 설명한다.
4. 설명이 부족하거나 모호하면 꼬리 질문 → 재설명 → 재분석을 반복한다. 충분하면 이해를 확인하고 다음 주제를 제안한다.
5. 계속하면 타이머로 돌아가고, 종료하면 세션 점검 → 퀴즈 또는 다시 설명하기 → 학습 결과 리포트 → 경험치·포인트·보상 → 캐릭터 성장·꾸미기 → 홈

음성 설명은 STT로 텍스트로 바꾼 뒤 채팅 설명과 같은 분석 경로로 처리한다. 분석 로직은 하나만 둔다.

### 세션 상태 (`frontend/src/features/session/machine.ts`)

- `timing`: 타이머 진행 중이다. 사용자가 설명을 시작하면 `explaining`, 설명 없이 제한 시간이 지나면 `aiQuestion`으로 간다.
- `aiQuestion`: AI 선제 질문을 표시한다 → `explaining`
- `explaining`: 음성 녹음 또는 채팅 입력을 받는다. 제출하면 `analyzing`
- `analyzing`: 분석을 요청한다. 결과에 따라 `followUp` 또는 `confirmed`
- `followUp`: 꼬리 질문을 표시한다 → `explaining`
- `confirmed`: 이해 확인과 다음 주제를 보여준다. 계속이면 `timing`, 종료면 `finished`
- `finished`: `review` 화면(점검·퀴즈·재설명) → `report` 화면(리포트·보상)

## 아키텍처 원칙

### Frontend

- `src/app/`의 화면 파일은 얇게 유지한다. 상태와 로직은 `src/features/<도메인>/`의 훅과 컴포넌트에 둔다.
- 접근 가드는 라우트 그룹 레이아웃으로 처리한다. `(auth)`는 비로그인, `(onboarding)`은 로그인 후 온보딩 전, `(app)`은 온보딩 완료 사용자만 접근한다. 접근 상태 판단은 `features/auth/useAccessState.ts` 한 곳에서만 한다.
- 화면과 훅은 데이터를 `src/api`의 `QuackApi` 인터페이스로만 가져온다. 화면에서 Supabase 클라이언트를 직접 호출하지 않는다.
- mock 우선으로 개발한다. `EXPO_PUBLIC_USE_MOCK=true`면 `api/mock`, 아니면 `api/supabase` 구현을 쓴다. mock 데이터는 반드시 `shared` 타입을 따른다.
- 분석 결과 mock은 고정값이 아니라 "부족 → 부족 → 충분" 같은 시나리오로 만들어 모든 분기를 화면에서 확인할 수 있게 한다.

### Backend

- 단순 CRUD(폴더, 자료 목록, 캐릭터 조회, 아이템 장착 등)는 Edge Function 없이 앱에서 supabase-js로 직접 처리하고, 권한은 RLS로 강제한다.
- Edge Function은 두 경우에만 쓴다. 비밀 키가 필요한 일(LLM, STT 호출)과 클라이언트를 신뢰하면 안 되는 일(경험치·포인트 지급, 퀴즈 채점)이다.
- 모든 테이블에 RLS를 켠다. RLS 없는 테이블은 만들지 않는다.
- `functions/api`는 Hono 앱 하나다. 요청 흐름은 middleware → route → service → `_ai`/DB 한 방향이다.
    - **middleware**: CORS, 인증, 요청 검증(shared 스키마), 공통 에러 응답을 처리한다.
    - **route**: HTTP 입출력만 처리하고 service를 호출한다. 로직을 두지 않는다.
    - **service**: 비즈니스 로직을 둔다. Request, Context 같은 HTTP 객체를 받지 않는다.
- auth 미들웨어는 요청마다 사용자 토큰을 담은 DB 클라이언트를 만들어 넘긴다. Edge Function 안에서도 RLS가 적용되게 하기 위해서다.
- service role 키는 RLS를 우회한다. `reward.service`처럼 꼭 필요한 곳에서만 쓰고 사용 이유를 주석으로 남긴다.
- 경험치·포인트는 값을 덮어쓰지 않고 지급 내역(ledger)을 쌓는 방식으로 기록한다.

### AI

- 프롬프트와 페르소나는 `_ai/prompts`, `_ai/personas`에만 둔다. service 코드에 프롬프트 문자열을 직접 쓰지 않는다.
- 동물 3종의 말투는 페르소나로 분리한다. 분석·질문 로직은 페르소나와 무관하게 동일하게 동작해야 한다.
- LLM 출력은 JSON으로 받고 `_ai/schemas.ts`로 검증한다. 검증 실패 시 재시도 또는 에러 처리 경로를 둔다.
- 설명 분석 결과는 판정(충분/부족/모호), 빠진 개념, 다음 질문 또는 다음 주제를 구조화해 반환하고 DB에 저장한다. 세션 점검·퀴즈·리포트는 이 데이터를 재료로 쓴다.
- `ai/evals`는 `_ai`를 직접 불러 쓰기 위해 Deno로 실행한다.
- 프롬프트를 바꾸는 PR에는 `ai/evals` 실행 결과 비교를 첨부한다.

### shared (계약)

- 앱과 서버가 주고받는 모든 데이터 타입과 zod 스키마는 `shared/`에 정의한다.
- `shared/` 변경은 기능 PR과 섞지 않고 별도 PR로 올려 전원이 확인한다.

## Git 규칙

팀원은 각자 담당 폴더(위 "레포 구조와 담당" 표)에서만 작업한다. 별도의 브랜치 보호 규칙 없이 아래 약속으로 운영한다.

- 작업을 시작할 때 사용자의 담당 영역(FE, BE-A, BE-B, AI)을 모르면 먼저 묻고, 그 영역의 폴더만 수정한다.
- 급한 수정은 main에 바로 반영할 수 있다. 반영 전에 `pnpm typecheck` 통과를 확인한다.
- 하나의 주제로 작업량이 묶이는 변경은 브랜치를 만들어 작업하고 PR → merge commit으로 반영한다. squash merge는 쓰지 않는다.
- 작업 범위를 제안할 때 main 직접 반영과 브랜치 작업 중 어느 쪽이 맞는지 함께 제시한다.
- 브랜치: `feat/{fe|be|ai}-<설명>`, `fix/...`, `chore/...`, `docs/...` (예: `feat/fe-session-timer`)
- 작업 시작 전 main을 최신으로 받고, 브랜치 작업이 길어지면 main을 merge해 최신 상태를 유지한다.
- 커밋: Conventional Commits 형식, scope는 `fe`, `be`, `ai`, `shared`, `docs`, `ci` 중 하나 (예: `feat(fe): 타이머 화면 추가`)
- 커밋 메시지와 PR 설명은 한국어로 쓴다.
- main에 force push하지 않는다. `.env`는 커밋하지 않는다.

## 코드 컨벤션

- TypeScript strict 모드를 쓴다. `any`는 금지하고, 불가피하면 이유를 주석으로 남긴다.
- 컴포넌트 파일은 `PascalCase.tsx`, 훅은 `useXxx.ts`, 그 외는 `camelCase.ts`로 짓는다. 백엔드 서비스는 `<도메인>.service.ts`로 짓는다.
- 사용자에게 보이는 문구는 한국어로 쓴다.
- 주석은 한국어로, "왜"를 설명할 때만 단다.

## 보안

- 비밀 키와 `.env`는 커밋하지 않는다. 필요한 변수는 `.env.example`에 키 이름만 적는다.
- `EXPO_PUBLIC_` 접두사 변수는 앱 번들에 그대로 노출된다. 여기에 LLM·STT 키나 service role 키를 넣지 않는다.
- LLM·STT 키는 `supabase secrets`로만 관리한다.

## 명령어

```bash
# 루트
pnpm install                          # 의존성 설치
pnpm typecheck                        # 전체 타입 체크
pnpm --filter @quack/frontend start   # 앱 실행

# backend/
supabase start                        # 로컬 Supabase 실행 (Docker 필요)
supabase db reset                     # 마이그레이션 + seed 재적용
supabase functions serve              # 함수 로컬 실행

# backend/supabase/functions/api/ (함수 폴더의 deno.json을 읽어야 하므로 여기서 실행)
deno check index.ts                   # 함수 타입 체크
```

## 미정 사항 (임의로 결정하지 않고 질문한다)

- 꼬리 질문 최대 반복 횟수와 "넘어가기" 허용 여부
- AI와 대화하는 동안 타이머 정지 여부
- "설명 없음"으로 판단하는 시간
- LLM, STT 제공자
- 퀴즈 형식
- SNS 공유 기능의 MVP 포함 여부
- 동물 3종의 종류 (오리를 기본 캐릭터로 둘지 포함)

## 검증 필요 사항

- Edge Function(Deno)에서 `shared/`를 import했을 때 배포 번들에 포함되는지 아직 확인하지 않았다. 확인 전까지 Edge Function에서 `shared/`에 의존하는 코드를 늘리지 않는다. 포함되지 않으면 스키마를 `functions/_shared`로 옮기는 방안으로 전환한다.
