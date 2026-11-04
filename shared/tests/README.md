# 설명 제출 응답 계약 검증

PR #17의 공개 계약 검증 기록이다. AI 행동 품질, 반복 안정성, 서버·앱 연동 완료를 뜻하지 않는다.

## 로컬 계약 검사

저장소 루트에서 실행한다. Deno와 기존 의존성 캐시가 필요하다.

```powershell
deno test --no-lock --cached-only --config backend/supabase/functions/api/deno.json shared/tests/createTurnResponse.test.ts
pnpm typecheck
```

- 기존 12개에 조합 표 전체 검사 1개를 추가했다. 총 13개다.
- 2026-11-04 로컬 실행: 13개 통과·0개 실패, `pnpm typecheck`, shared·기존 API Deno 검사, `git diff --check` 통과. Deno 2.9.6을 사용했다.
- `response.action`의 `correct`는 **교정 행동**, `answer_status`의 `correct`는 **정답 상태**다.
- 행동 4종 × 이해 상태 4종 × 답 상태 4종 × 독립 수행 상태 2종 × 질문 문자열/null 2종 = 256개 조합을 검사한다. 아래 표 기준 허용 48개, 거절 208개다.

| 대화 행동 | 허용 이해 상태 | 질문 | 추가 조건 | 허용 조합 수 |
| --- | --- | --- | --- | --- |
| `ask` | 부족·모호·미확인 | 문자열 | 없음 | 24 |
| `explain` | 미확인 | 문자열 | 독립 수행 미확인 | 4 |
| `correct` (교정) | 충분 | null | 없음 | 8 |
| `acknowledge` | 충분·미확인 | null | 답 상태가 `incorrect`가 아님 | 12 |

표는 공개 상태의 조합만 규정한다. 내부 근거의 타당성 검증은 별도다. 기존 개별 검사에서 빈 문자열·누락 필드·내부 필드 제거·미확인 상태 보존 등도 확인한다.

## 저장된 실제 출력 22개 재검사

- 검사일: 2026-11-04.
- 원본: 커밋 `5a0c248e0986bb22a1fafabe769014b8a94739e4`의 `ai/evals/runs/2026-11-02-4508b79/results.jsonl`.
- 강화된 계약 `b60d17f`로 재검사: 22개 통과, 0개 실패. 이번 후속 변경은 계약의 판정 규칙을 바꾸지 않는다.
- 내부 출력에서 `answer.status` → `answer_status`, `understanding.status` → `understanding_status`, `independent_performance.status` → `independent_performance_status`를 선택하고 `response`를 그대로 사용한다.
- 실제 DB 턴은 없는 오프라인 출력이므로 UUID·시각 등의 유효한 가상 턴 메타데이터를 붙여 `createTurnResponseSchema.safeParse`로 검사했다. 실제 턴 저장을 검증한 것이 아니다.
- 통과 후 세 상태와 `action`·`message`·`question`이 원본과 정확히 같은지도 확인했다. 충분 판정으로 변경하거나 질문을 삭제해 통과시키지 않았다.
- 원본 결과 22개가 각각 고유한 사례 ID와 성공 출력을 갖는지 확인했다. 추가 유료 호출은 0회다.

## 구현과 후속 작업 구분

- BE-B의 공개 변환 직후 검증·실패 시 `AI_FAILED` 반환·턴 미저장 구현 방향에 맞춰, 이번 시연은 금지 조합에 대한 자동 재호출을 추가하지 않고 에러로 반환한다. 이는 `/turns` 구현 인수 조건이며 이 계약 PR이 서버 구현을 완료한 것은 아니다. 기존 0002 정책대로 실패해도 차감한 사용량은 복구하지 않는다.
- 이번 텍스트 시연에서는 다음 주제 자동 제안을 제외한다. `next_topic`뿐 아니라 `message`에 우회해서 제안하는 것도 제외한다. 이는 `CLAUDE.md`의 MVP 흐름 4번·`confirmed` 설명과 다른 시연 범위이며, 전체 MVP 규칙 변경은 팀 확인이 필요하다. FE는 다음 주제 표시를 제거하겠다고 답했다.
- FE·BE-B는 꼬리 질문 2회 자동 종료를 시연에서 보류하고 사용자 넘어가기로 멈추는 방향에 동의했다. 일일 사용량 한도는 유지한다. 넘어가기를 충분·숙달 판정으로 바꾸지 않는다.
- 계약 테스트 CI 연결은 BE-A A12의 별도 `chore(ci)` 작업이다. 프롬프트의 권장 길이·Markdown 금지와 기존 출력 길이 분포는 병합 비차단 후속 작업이며 이번에 프롬프트를 변경하지 않았다.

근거: [FE 수정 재확인](https://github.com/rice-scoop-on-token/quack/pull/17#issuecomment-6631911849), [BE-B 구현 방향](https://github.com/rice-scoop-on-token/quack/pull/17#issuecomment-6631873156).
