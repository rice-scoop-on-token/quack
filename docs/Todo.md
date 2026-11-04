# 백엔드 할 일 정리 (BE-A·BE-B)

- 기준: 2026-11-04, 브랜치 `feat/be-text-turns` (main `bb151a0` PR #17 머지 이후, 텍스트 시연 작업)
- 이전 판: 2026-11-04, main `ceeacd5` (PR #18 머지 시점)
- 작성: BE-A

BE-A와 BE-B의 할 일을 MVP 흐름 기준으로 정리한다. 가장 가까운 목표는 PR #17이 제안한 **텍스트 시연: 설명 → AI 역질문 → 재설명 → 이해 확인**이며, 1단계가 이 목표를 위한 작업이다.

담당 구분은 CLAUDE.md "레포 구조와 담당" 표를 따른다. BE-B 몫은 BE-A의 제안이므로 BE-B의 확인이 필요하다.

## 요약: BE-A가 지금 할 일

텍스트 시연(1단계 서버 부분)은 2026-11-04에 원격까지 동작을 확인했다. 아래 "텍스트 시연 결과와 생략 항목"을 본다.

| 순서 | 할 일 | 상태 |
| ---- | ----- | ---- |
| 1 | **`feat/be-text-turns` PR**: A2·A3·B1과 service_role 권한 수정. BE-B·AI 확인을 받는다(A2 설계, B1은 BE-A가 대신 구현) | PR 작성 전 |
| 2 | **FE 질문 답하기** (#17 댓글): 여러 세션 집계 화면이 `reports`의 개념 목록을 앱에서 직접 읽어도 되는지, 리포트 전 세션을 집계에서 뺄지 | 답 필요 |
| 3 | **원격 HTTP 시험에 `adminDb` 경로 추가**: 0턴 세션 `/finish` 등 AI 비용 없는 요청 | 다음 커밋 후보 |
| 4 | **A14 작은 정리** | 지금 가능 |

## 현재 위치

### shared에 적힌 API의 구현 상태

| API                                            | 담당 | 상태                                          |
| ---------------------------------------------- | ---- | --------------------------------------------- |
| `GET /health`, `GET /me`                       | BE-A | ✅                                            |
| `GET /quizzes/:id`, `POST /quizzes/:id/submit` | BE-B | ✅                                            |
| `POST /sessions/:id/finish`                    | BE-B | ✅ 단, 공부 시간과 분석 결과 반영이 아직 없음 |
| `POST /sessions/:id/turns` (설명 제출·분석)    | BE-B | ✅ `feat/be-text-turns`(BE-A가 대신 구현), 원격 배포됨. 자료 없이 분석 |
| `POST /sessions/:id/ai-question` (선제 질문)   | BE-B | ❌ 계약도 없음                                |
| `POST /sessions/:id/quiz` (퀴즈 출제)          | BE-B | ❌ 퀴즈 형식은 미정 사항                      |
| `POST /speech/transcribe` (STT)                | BE-B | ❌ STT 제공자는 미정 사항                     |
| `POST /sessions/:id/report` (리포트·보상)      | BE-A | ❌ DB 함수 `grant_session_reward`만 있음      |
| `POST /materials/:id/process` (자료 읽기)      | BE-A | ❌ Storage도 없음                             |

분석 결과와 AI 발화는 `turn_analyses`에 저장한다(A2 최소안). 리포트, 점검, 퀴즈, 보상은 아직 이 데이터를 쓰지 않는다(A8, B2, B4).

### 열린 PR

없음. `feat/be-text-turns`의 PR을 올릴 예정이다.

### 최근 반영된 것

- **#16 (AI)**: `_ai/openAiClient.ts`의 `analyzeExplanation()`, 프롬프트, 내부 분석 스키마(`_ai/schemas.ts`). 11-04 머지.
- **#17 (shared)**: `/turns` 응답 계약(`createTurnResponseSchema`, 공개 조합 표). 11-04 머지. FE는 `action` 기준으로 화면을 바꾸기로 답했다.
- **#14 (FE)**: `QuackApi` 인터페이스와 mock 구현. 서버가 할 계산(분석, 채점, 리포트, XP)은 mock 안에서만 한다. supabase 구현은 아직 없다.
- **#15 (AI)**: 설명 분석 기준, 평가 사례, 입출력 계약 검토안. CLAUDE.md에 "사용자 승인 후 커밋·push·PR 생성" 규칙과 "PR 작성 형식"이 추가됐다.
- **#18 (FE)**: 시연용 화면(친구, 통화방, 팟캐스트, 오늘의 퀴즈, 잠금화면 퀴즈, 조용히 공부하기, 학습 기록·분석)과 캐릭터 에셋. 모두 mock이며, 서버 범위는 아래 A15~A17로 팀 결정 후 정한다.

## 진행 순서

| 단계  | 목표        | 핵심 작업                                                                           |
| ----- | ----------- | ----------------------------------------------------------------------------------- |
| **1** | 텍스트 시연 | #17 계약 확정 → 분석 저장 테이블 → AI #16 → `/turns` → 원격 반영 → FE supabase 구현 |
| **2** | 세션 마무리 | 종료(공부 시간, 분석 반영) → 선제 질문 → 퀴즈 출제 → 리포트·보상                    |
| **3** | 자료와 음성 | Storage와 자료 처리 → STT                                                           |
| **4** | 운영 정리   | CI, 문서, 설정 맞추기                                                               |
| 별도  | PR #18 기능 | 조용히 공부하기, 오늘의 퀴즈, 친구·통화방·팟캐스트. 팀 결정 후 범위를 정한다       |

## BE-A 할 일

| #   | 할 일 | 단계 | 먼저 필요한 것 | 상태 |
| --- | ----- | ---- | -------------- | ---- |
| A1  | **#17 shared 계약 리뷰**: 저장할 칸, 앱에 공개할 범위, `respond` 필터와 맞는지 확인 | 1 | 없음 | 완료. #17 머지됨(11-04) |
| A2  | **대화·분석 결과 저장 마이그레이션**: 아래 설명 참고 | 1 | 설계 초안 확인(BE-B·AI), #17 머지, #16 내부 스키마 | 최소안 구현(`turn_analyses`, `server.save_turn`). **설계 확인은 PR에서 BE-B·AI에게 받는다** |
| A3  | **AI 설정 읽기**: 아래 설명 참고 | 1 | 없음 | 완료(`_shared/aiConfig.ts`) |
| A4  | **AI 사용량 한도 연결 기준**: `consume_ai_quota`를 어디서, 어떤 종류(`kind`)로 부를지, 한도 값 정하기 | 1 | 한도 값 팀 결정 (임시값으로 먼저 진행 가능) | `/turns`에서 `analysis` 종류로 연결. 한도 30은 임시값 |
| A5  | **원격 반영**: 마이그레이션 push, 함수 배포, secrets(`LLM_API_KEY`, `LLM_MODEL`) 등록 절차를 정리하고 명령어 제공 | 1·2 | A2, B1 | 1단계 완료(11-04). 이후 단계마다 반복 |
| A6  | **shared 별도 PR**: 아래 설명 참고 | 2 | 성장 단계 팀 결정 | 대기 |
| A7  | **`sessions.study_seconds` 마이그레이션** (서버가 범위 검사 후 저장) | 2 | A6 | 대기 |
| A8  | **`POST /sessions/:id/report` 라우트·서비스**: 분석 결과로 이해한·보완할 개념 계산, XP 계산, `grant_session_reward` 호출, 같은 세션 재요청 처리, HTTP 시험(DB 에러 변환 경로 포함) | 2 | A2, A6, **XP 양(미정 사항)**, 리포트 요약 문구를 AI가 쓸지 | 대기 |
| A9  | **입력 제한 DB 제약**: 목표 140자, 과목 이름 30자, 같은 이름 금지 | 2 | FE 답변(제품 규칙인지) | 대기 |
| A10 | **Storage 버킷·정책** (사용자별 경로, RLS), 폴더·자료 삭제 시 파일도 지우기 | 3 | 없음 | 대기 |
| A11 | **`POST /materials/:id/process`**: 텍스트 추출, `material_contents`, 핵심 개념, 상태 변경, 실패 처리 | 3 | A10, AI(추출·핵심 개념 방식) | 대기 |
| A12 | **CI에 시험 추가**: pgTAP, HTTP, shared 계약 시험(#17의 `shared/tests`) | 4 | 공동 파일이라 팀 공유 | 대기 |
| A13 | **로컬·원격 auth 설정 맞추기**: 익명 로그인 등 | 4 | 없음 | 대기 |
| A14 | **작은 정리**: README health 예시를 `apikey` 방식으로, `services/.gitkeep`·`SHARED_CHECK_MESSAGE` 삭제, `@supabase/server` 올리기 기준, 로그 정리, 게이트웨이 401과 앱 에러 형식 차이 안내 | 4 | 없음 | 지금 가능 |
| A15 | **조용히 공부하기 저장 (PR #18)**: 아래 설명 참고 | 별도 | 시간 기반 XP를 둘지(0003 변경 여부), 최소 기록 시간 | 팀 결정 대기 |
| A16 | **오늘의 퀴즈·잠금화면 퀴즈 기록 저장 (PR #18)**: 지금 DB의 퀴즈는 세션에 묶여 있어(`session_id` 필수) 세션과 분리된 기록 테이블이 필요하다 | 별도 | 퀴즈 형식(미정 사항), 출제 단위(과목별 / 전체) | 팀 결정 대기 |
| A17 | **친구·통화방·팟캐스트 서버 범위 설계 (PR #18)**: 친구 관계와 공개 범위, 실시간 음성, LLM 대본·TTS·Storage | 별도 | MVP 포함 여부(SNS 미정 사항 포함), 익명 로그인과 친구 기능을 어떻게 맞출지 | 팀 결정 대기. BE-A 의견은 MVP 1·2단계 뒤로 미루기 |

**A2 대화·분석 결과 저장 마이그레이션**

- 설명 턴마다 공개 결과를 저장한다: `answer_status`, `understanding_status`, `independent_performance_status`
- **AI 발화**(`action`, `message`, `question`)를 저장한다. 다음 턴의 이전 대화를 서버가 만들기 위해서다(PR #17 BE-B 2번 요청).
- 서버 전용 내부 분석을 저장한다: 근거, 개념 목록, 누락·오류, 도움 이력. 리포트·퀴즈·보상의 재료다.
- 선제 질문(`/ai-question`)의 AI 발화도 같은 저장 구조에서 다룬다.
- **내부 분석은 앱이 읽을 수 없게** 칸 단위 권한이나 서버 전용 테이블로 나눈다. 앱이 supabase-js로 지난 기록을 직접 조회하기 때문이다.
- 이전 대화의 기준은 서버에 저장된 AI 질문이다. 앱이 보낸 `question_text`는 기록용으로만 둔다(PR #17 1번).
- **A2 인수 조건**: 사용자 설명과 실제 AI `message`·`question`을 연결해 저장하고 순서대로 복원할 수 있어야 한다. 앱의 `question_text`는 표시·요청 기록용이며 분석 이력을 대체하지 않는다. 내부 근거는 대화 본문에 섞지 않는다.
- 설계 초안을 먼저 제안해 BE-B·AI 확인을 받은 뒤 구현한다.
- RLS, pgTAP, HTTP 데이터 시험, 0002 표도 함께 고친다.

**A3 AI 설정 읽기**

- 서버 설정 이름은 AI 담당 결정에 따른다: `LLM_API_KEY`, `LLM_MODEL` (예: `LLM_MODEL=gpt-6.1-sol`). 로컬 평가 도구(`ai/evals`)는 `OPENAI_API_KEY`를 그대로 쓴다.
- `functions/.env.example`에 `LLM_MODEL`을 추가한다(`LLM_API_KEY`는 이미 있다).
- `_shared`에 두 값을 읽는 함수를 둔다. 값이 없으면 명확한 에러를 낸다. 서버는 이 값을 `analyzeExplanation()`의 `apiKey`·`model` 인자로 넘긴다.
- AI 사용량 하루 한도(A4)를 둘 자리도 함께 마련한다. 값은 팀 결정 전 임시값이다.
- LLM 제공자 확정(OpenAI)은 팀 결정으로 남아 있다.

**A6 shared 별도 PR**

- 세션 종료 요청에 `study_seconds`
- 보상 응답에 `xp_before`/`xp_after` (레벨 대신 성장 단계로 갈지는 팀 결정)
- 리포트 응답 정리. FE의 `TempReportResponse`를 대체한다.

**A15 조용히 공부하기 저장**

- `sessions`에 세션 종류 칸(설명 공부 / 조용히 공부)을 두고, 조용히 공부에는 목표가 없으므로 `goal` 필수 조건을 종류별로 나눈다.
- "공부 시작" 때 서버 세션을 만들고 끝날 때 종료한다. 그래야 서버가 `study_seconds ≤ 실제 경과 시간`을 확인할 수 있다.
- 공부 시간으로 XP를 주는 것은 0003의 지급 기준(서버가 확인할 수 있는 활동)과 다르다. 팀이 0003을 바꾸기로 해야 넣는다. FE mock은 "5분에 1 XP"를 팀 결정 전 임시값으로 두었다.

## 텍스트 시연 결과와 생략 항목 (2026-11-04)

브랜치 `feat/be-text-turns`. 이번 작업 한정으로 BE-A가 BE-B 영역(B1)도 맡았다.

**원격에서 확인한 것** (시연 스크립트, 실제 AI 3번 호출)

| 턴 | 설명 | 행동 | 이해 판정 |
| -- | ---- | ---- | --------- |
| 1 | "가운데를 보고 찾아서 빠르다" | `ask` (범위가 어떻게 바뀌는지) | `unverified` |
| 2 | 절반씩 남기는 과정 | `ask` (왜 비교 횟수가 줄어드는지) | `insufficient` |
| 3 | log₂ n번, 선형 탐색과 비교, 정렬 조건 | `acknowledge` | `sufficient` |

- 앱 토큰으로 `turn_analyses` 공개 칸은 조회되고(3행), 내부 분석 `analysis`는 403(`42501`)이다.
- 같은 세션 `/finish`가 `turn_count: 3`을 돌려준다.
- 턴마다 응답 시간은 8~15초다.

**생략·임시값** (팀 결정이나 후속 작업 필요)

| 항목 | 지금 | 후속 |
| ---- | ---- | ---- |
| 자료 내용 | AI에 넘기지 않는다(`reference_materials: []`) | A11이 `material_contents`를 채우면 연결 |
| AI 하루 한도 | 30 (`_shared/aiConfig.ts`의 `AI_DAILY_LIMIT`, 임시값) | 팀 결정(미정 사항) |
| 최대 출력 토큰 | 4096 (`LLM_MAX_OUTPUT_TOKENS`, AI 담당 첫 실제 실행 값, 임시값) | AI 담당 확인 |
| 꼬리 질문 최대 횟수 | 서버 상한 없음. '넘어가기'로 멈춘다(#17에서 AI·FE·BE-B 동의, 시연 범위) | 팀 결정(미정 사항) |
| 다음 주제 제안 | 제외(#17 결정. CLAUDE.md MVP 흐름 4번과 다름) | 팀 확인 |
| 선제 질문 `/ai-question` | 없음 | B3 |
| 이전 대화 길이 | 제한 없음 | 턴이 많아지면 토큰 비용·한도 문제. 자르는 기준 필요 |
| B1 인수 조건 "앱이 다른 질문을 보내도 서버 이력을 대체하지 않는 HTTP 시험" | AI에 보낸 이력은 밖에서 볼 수 없어 둘로 나눴다. 이력 구성은 순수 함수 시험(`tests/unit/turnHistory.test.ts`), HTTP 시험은 `question_text`가 받은 그대로 기록되는지만 확인 | 가짜 AI transport로 HTTP 수준 시험을 할지 B6에서 정한다 |
| 실제 AI 성공 경로 HTTP 시험 | 비용 때문에 `LIVE_AI=1`일 때만 실행 | B6 |

**원격에서 발견한 문제** (수정함)

- 원격 프로젝트는 `postgres`가 만든 테이블에 `service_role`의 SELECT·INSERT·UPDATE를 기본으로 주지 않는다. 그래서 `adminDb`를 쓰는 `/finish`·`/turns`(그리고 퀴즈 채점·보상 지급도)가 42501로 실패했다. 마이그레이션 `20261104150000_service_role_grants.sql`로 명시했다(0002).
- 원격 HTTP 시험은 `adminDb` 경로를 시험하지 않아 이를 잡지 못했다. 원격 시험에 AI 비용 없는 `adminDb` 경로를 추가해야 한다(요약 3번).

## PR #17 논의에서 정한 것 (2026-11-04)

BE-B가 `/turns` 구현 전에 정할 것으로 올린 질문 6개와 현재 결론이다. 4번만 계약 머지와 관련 있고, 나머지는 A2·B1 구현 때 반영한다.

| # | 질문 | 결론·의견 | 반영 위치 |
| - | ---- | --------- | --------- |
| 1 | 요청의 `question_text`를 어떻게 쓸지 | 서버에 저장된 이전 AI 질문만 기준으로 쓴다. 앱이 보낸 값은 기록용이다. 앱 값으로 이력을 만들면 앱이 가짜 질문을 끼워 넣을 수 있기 때문이다 | A2, B1 |
| 2 | AI 발화 저장 | A2 테이블에 AI의 `message`·`question`을 함께 저장한다. 선제 질문도 같은 구조에서 다룬다 | A2 |
| 3 | AI 실패 때 턴 저장과 사용량 복구 | 0002대로 사용량은 호출 직전에 차감하고 실패해도 돌려주지 않는다. 실패하면 턴을 저장하지 않고 `AI_FAILED`를 돌려줘 앱이 다시 보내게 한다. 복구가 필요하면 팀 결정 후 서버 함수를 추가한다 | B1 |
| 4 | FE 화면이 바뀌는 계약(`next_topic`·`follow_up_count`·`missing_concepts` 제외)을 받을 수 있는지 | FE 가능. `response.action` 기준으로 화면을 바꾼다 | #17 머지됨 |
| 5 | 꼬리 질문 최대 횟수를 서버에서도 막을지 | 시연 범위에서는 서버 상한 없이 '넘어가기'로 멈춘다(AI·FE·BE-B 동의). 최종 값은 CLAUDE.md 미정 사항 | B1 |
| 6 | 모델 이름 위치와 키 이름 | AI 담당 결정대로 서버는 `LLM_API_KEY`·`LLM_MODEL`. BE-A가 `.env.example`과 `_shared` 설정 읽기를 맡는다 | A3 |

## BE-B 할 일 (BE-A 제안, BE-B 확인 필요)

| #   | 할 일 | 단계 | 먼저 필요한 것 | 상태 |
| --- | ----- | ---- | -------------- | ---- |
| B0  | **#17 shared 계약 리뷰**: 자기 라우트의 응답이라 핵심 리뷰어 | 1 | 없음 | 리뷰 완료(11-04) |
| B1  | **`POST /sessions/:id/turns`**: 아래 설명 참고 | 1 | #17 머지, A2, AI #16 머지, A3, A4 | BE-A가 대신 구현(`feat/be-text-turns`). BE-B 리뷰 필요 |
| B2  | **`POST /sessions/:id/finish` 보강**: 아래 설명 참고 | 2 | A6, A7, A2 | 대기 |
| B3  | **`POST /sessions/:id/ai-question`**: 응답 계약(shared PR, AI와 함께), 소유권·`active` 확인, 사용량 차감, 페르소나·목표·자료로 AI 호출, AI 발화 저장(A2 구조) | 2 | 계약, AI 프롬프트, A2 | 대기 |
| B4  | **`POST /sessions/:id/quiz`**: 분석 결과로 AI가 문항 생성, `quizzes`·`quiz_questions` 저장(정답은 서버 전용), 문항 0개 막기, 이미 만든 퀴즈 처리 | 2 | **퀴즈 형식(미정 사항)**, A2, AI 프롬프트 | 대기 |
| B5  | **`POST /speech/transcribe`**: multipart 업로드(크기·길이 제한), STT 호출, 사용량 차감(`stt`) | 3 | **STT 제공자(미정 사항)**, AI의 STT 클라이언트 | 대기 |
| B6  | **라우트별 HTTP 시험**: `local/`에 turns·ai-question·quiz·transcribe 시험 추가. AI 호출은 로컬에서 비용이 들므로 가짜 응답으로 시험하는 방법을 AI·BE-A와 정한다. #16의 AI 클라이언트는 transport를 끼울 수 있어 비용 없이 시험할 수 있다 | 1~3 | 필요한 도우미는 BE-A가 `lib.mjs`에 추가 | 대기 |

**B1 `POST /sessions/:id/turns`**

- `userDb`로 소유권을 확인하고, 세션이 `active`인지 확인한다.
- 서버가 목표, 폴더의 동물(페르소나), 자료, 이전 대화를 모아 `_ai` 분석을 호출한다. 이전 대화는 서버에 저장된 사용자 설명과 AI 발화로 만들고, 앱이 보낸 `question_text`로 대신하지 않는다.
- `LLM_API_KEY`·`LLM_MODEL`은 A3의 설정 읽기 함수로 가져온다.
- `consume_ai_quota`로 사용량을 먼저 차감한다.
- 턴과 분석 결과, AI 발화를 저장하고, `respond`로 공개 필드만 응답한다.
- AI 실패는 `AI_FAILED`로 처리하고 턴을 저장하지 않는다. 사용량은 돌려주지 않는다.
- **B1 인수 조건**: AI 내부 출력을 공개 형태로 변환한 직후 `explanationAnalysisSchema`로 검증한다. 금지 조합이면 자동 재호출하거나 정상 판정으로 바꾸지 않고 `AI_FAILED`를 반환하며 턴을 저장하지 않는다(BE-B의 #17 답변 기준). 최종 응답은 `respond(c, createTurnResponseSchema, ...)`로 보낸다.
- **B1 인수 조건**: `question_text`는 표시·요청 기록용으로만 저장한다. AI 분석에는 같은 세션의 서버 저장 사용자·AI 발화를 순서대로 사용하고, 현재 설명은 `user_message`에만 넣어 중복하지 않는다. 앱이 다른 질문을 보내도 서버 이력을 대체하지 않는 HTTP 시험을 추가한다.
- 동시 제출을 처리한다: 서비스가 이력을 읽을 때 정한 순번을 `server.save_turn`에 넘기고, 그 사이 다른 턴이 저장됐으면 `INVALID_STATE`(409)다. 다른 턴을 보지 못하고 만든 분석은 저장하지 않는다.
- HTTP 시험을 추가한다. (구현됨: `tests/http/local/turns.test.mjs`. 위 "텍스트 시연 결과와 생략 항목" 참고)

**B2 `POST /sessions/:id/finish` 보강**

- `study_seconds`를 받는다.
- `getSessionConcepts`를 실제 분석 결과로 교체한다.
- 0턴일 때 `suggested_next` 규칙을 정한다(팀 결정 후).

## 다른 담당과 팀 결정에 걸린 것

| 항목 | 누가 | 막히는 작업 |
| ---- | ---- | ----------- |
| 최대 출력 토큰(`LLM_MAX_OUTPUT_TOKENS`) 확정, `openAiClient.ts`의 `MISSING_API_KEY` 메시지 변수 이름(`LLM_API_KEY`) | AI | 없음(임시값으로 동작) |
| A2 저장 구조(`turn_analyses`) 확인 | BE-B·AI | B2·B3·B4·A8이 이 구조를 쓴다 |
| LLM·STT 제공자 확정(AI는 OpenAI 제안), 대상 연령(만 14세 이상 제안), 보호자 동의 | 팀 (AI 제안) | A5 secrets, B5 |
| XP 지급 양 | 팀 | A8 |
| 성장 단계 대 레벨 | 팀 | A6, 0003 갱신 |
| AI 사용량 하루 한도 | 팀 | A4 (임시값으로 진행 가능) |
| 퀴즈 형식·문항 수, 출제 단위 | 팀 | B4, A16 |
| 꼬리 질문 최대 횟수와 넘어가기 (#17 이후 AI가 질문 여부를 정하므로 서버 정책으로 둘지 포함) | 팀 | B1 |
| 조용히 공부하기의 시간 기반 XP(0003 변경 여부), 최소 기록 시간 | 팀 | A15 |
| 친구·통화방·팟캐스트의 MVP 포함 여부(SNS 미정 사항 포함) | 팀 | A17 |
| 타이머 정지 여부, "설명 없음" 판단 시간 | 팀 | FE 위주 |
| supabase 구현(`QuackApi`): 익명 로그인, 폴더·세션 직접 조회, API 호출 | FE | 1단계 시연 |
| CLAUDE.md 세션 상태(`cancelExplain`), 접근 가드(`(auth)` 없음) | FE (docs) | 없음 |

## 원격 작업 (사용자가 직접 실행)

- 마이그레이션 push: `db push --linked`
- 함수 배포: `functions deploy api`
- secrets 등록: `LLM_API_KEY`, `LLM_MODEL`, 이후 STT 키
- 대시보드 설정 확인

단계마다 BE-A가 명령어와 확인 쿼리를 정리해 제공한다.

## 작업 방식

작업 순서를 정하면 CLAUDE.md 작업 단위 규칙에 따라 범위와 파일 목록을 먼저 제시하고 승인을 받는다. shared 변경은 기능 PR과 섞지 않고 별도 PR로 올린다.
