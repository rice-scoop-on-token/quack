# 0003. 캐릭터는 폴더마다 한 마리, 꾸미기·포인트는 MVP에서 뺀다

- 날짜: 2026-10-30
- 상태: 결정됨
- 담당: 팀 결정, 기록 BE-A

## 배경

처음 설계는 다음과 같았다.

- 사용자당 캐릭터 한 마리. 온보딩에서 동물을 고른다.
- 경험치와 레벨은 사용자 전체로 계산한다.
- 꾸미기 아이템을 레벨 조건이나 포인트 구매로 얻는다(D9 추천안). 포인트는 아이템 구매에만 쓴다.

팀이 이 설계를 아래와 같이 바꿨다.

## 결정

### 캐릭터와 성장

- 캐릭터는 사용자당 1마리가 아니라 **과목 폴더마다 1마리**다.
- 폴더를 만들 때 동물을 고르고, **이후 바꿀 수 없다**.
- 같은 동물을 여러 폴더에서 고를 수 있다.
- 경험치와 레벨은 **폴더별로만** 계산한다. 사용자 전체 레벨은 없다.
- 폴더를 지우면 그 폴더의 캐릭터와 경험치도 함께 지운다.

### 경험치 지급 기준 (D8)

- 서버가 확인할 수 있는 활동으로 정했다: 세션 완료, 충분 판정을 받은 개념 수, 퀴즈 정답 수.
- 구체적인 양은 아직 정하지 않았다(CLAUDE.md 미정 사항).
- 경험치는 세션마다 `session_reward` 한 줄로 쌓는다. 세 활동의 양을 서버가 더해서 한 번에 기록한다.
  - 활동별로 나눠 쌓지 않는 이유: "세션 보상은 한 번만 지급" 제약(부분 unique 인덱스)을 그대로 쓸 수 있다.
  - 리포트에 활동별 내역이 필요해지면, 리포트를 만들 때 분석 결과로 계산한다.

### 꾸미기와 포인트

- 꾸미기(아이템)는 MVP에서 뺀다. 팀이 "일단" 뺀다고 했으므로 나중에 다시 넣을 수 있다.
- 포인트는 꾸미기 전용 화폐였으므로 함께 뺀다.
- 경험치는 캐릭터 성장용으로 유지한다.

### 온보딩

소개 → 이름 입력 → 첫 폴더 만들기(폴더 이름 + 동물 선택) → 자료 업로드(선택, 건너뛰기 가능) → 홈

- 이름은 사용자 이름(`profiles.display_name`)이다. 캐릭터 이름은 MVP에 없다.
- 동물 선택은 따로 단계를 두지 않고 첫 폴더 만들기에 합쳤다. 캐릭터가 폴더마다 있기 때문이다.
- 자료 업로드는 원래 흐름에 있던 단계라 그대로 둔다. 자료를 바탕으로 공부하는 앱의 핵심을 처음에 보여 주기 위해서다.

## 설계

### 캐릭터 = 폴더의 동물 + 폴더의 경험치

캐릭터 테이블을 따로 두지 않고, 폴더에 동물(`folders.species_id`)을 둔다.

- 캐릭터를 따로 두면 폴더와 캐릭터를 두 번에 나눠 만들어야 한다. 그 사이에 실패하면 캐릭터 없는 폴더가 생긴다.
- 폴더 한 행에 두면 "모든 폴더에 동물이 있다"를 DB(`not null`)가 보장한다.
- 앱은 폴더를 만들 때 `species_id`를 넣을 수 있지만 수정할 수 있는 칸은 `name`뿐이다. 그래서 "동물은 바꿀 수 없다"도 DB(칸 단위 GRANT)가 강제한다.
- 같은 동물을 여러 폴더에서 고를 수 있으므로 `(user_id, species_id)`에 unique 제약을 두지 않는다.
- `character_stats` view는 폴더마다 한 행(`folder_id`, `user_id`, `species_id`, `total_xp`)을 보여 준다.
- 레벨은 지금처럼 shared의 `levelFromXp`로 계산하고, 그 폴더의 경험치를 넣는다. 레벨 곡선(D23)은 계속 추천안이다.
- AI 페르소나는 세션이 속한 폴더의 동물로 고른다(세션 → 폴더 → `species_id`).

### 폴더별 경험치와 폴더 삭제

`xp_ledger`에 `folder_id`를 두고, 폴더를 지우면 그 폴더의 내역도 함께 지운다.

```sql
folder_id uuid not null,
foreign key (folder_id, user_id) references public.folders (id, user_id) on delete cascade
```

- 폴더 경험치는 `folder_id`로 바로 더한다. 세션을 거쳐 join하지 않는다.
- `(folder_id, user_id)` 복합 외래 키는 sessions·materials와 같은 이유로 둔다. service role이 다른 사용자의 폴더에 경험치를 쓰는 실수를 DB가 막는다.
- 보상 지급 함수(`grant_session_reward`)는 `folder_id`를 인자로 받지 않고 세션에서 읽는다. 서비스가 잘못된 폴더를 넘길 수 없다.
- 리포트의 `xp_before`는 "지급 직전 그 폴더의 경험치"가 된다.

폴더 삭제를 처리하는 방법으로 아래 셋을 비교했다.

| 방법 | 폴더를 지우면 | 판단 |
| --- | --- | --- |
| **`folder_id` + cascade (채택)** | 내역도 지워진다 | 캐릭터가 폴더와 함께 사라지므로 내역을 보여 줄 곳이 없다 |
| `folder_id` + set null | 내역이 남고 폴더 연결만 비워진다 | 어느 합계에도 들어가지 않는 행만 쌓인다 |
| `folder_id` 없이 세션을 거쳐 계산 | 내역은 남지만 세션 연결이 비워져 합계에서 조용히 빠진다 | 같은 문제에 view까지 복잡해진다 |

0002는 "폴더를 지워도 레벨과 포인트는 줄지 않는다"고 정했었다. 사용자 전체 레벨이 있을 때의 결정이었고, 이번 결정으로 바뀐다.

**FE**: 폴더 삭제 경고에 "이 과목의 캐릭터와 성장 기록도 함께 사라진다"는 뜻을 넣는다.

### 꾸미기·포인트는 DB에서 지운다

| 안 | 판단 |
| --- | --- |
| **A. 마이그레이션으로 삭제 (채택)** | 계약·DB·시험·문서가 MVP 범위와 같아진다 |
| B. 남겨 두고 쓰지 않기 | 보상 함수가 계속 포인트·아이템 인자를 요구하고, 쓰지 않는 기능의 권한과 시험을 관리해야 한다 |
| C. 남기되 앱 권한만 회수 | B의 단점이 그대로 남는다 |

남겨 두지 않는 가장 큰 이유는 **지금 아이템 구조로는 다시 쓸 수 없어서**다. `user_items`는 사용자 단위이고 장착(`equipped`)도 사용자에게 하나뿐이다. 캐릭터가 폴더별이 되었으니 다시 넣을 때 새로 설계해야 한다.

지우는 것:

- 테이블: `items`, `user_items`, `point_ledger`, `characters`
- 서버 함수: `server.purchase_item`. `server.grant_session_reward`의 포인트·아이템 인자
- shared: 아이템·포인트 스키마, 아이템 구매 API, 에러 코드 `ALREADY_OWNED`·`INSUFFICIENT_POINTS`

## 반영

| 대상 | 상태 |
| --- | --- |
| shared 계약 | 완료 (PR #12) |
| 이 문서, CLAUDE.md (MVP 흐름, Backend 규칙, AI 페르소나 규칙, 미정 사항) | 완료 |
| DB 마이그레이션, pgTAP·HTTP 시험, 0002 | `feat/be-folder-character` PR. `20261030061301_remove_cosmetics_points.sql`(꾸미기·포인트 삭제), `20261030062236_folder_characters.sql`(캐릭터·경험치를 폴더별로) |
| 원격 DB | 마이그레이션 PR 머지 후 아래 절차로 `db push` |
| FE | mock 데이터, 온보딩(동물 선택을 폴더 만들기에 합침), 폴더 삭제 경고 |
| AI | 페르소나를 폴더의 동물로 고른다 |

마이그레이션이 원격에 반영되기 전까지 원격 DB는 이전 구조다. FE는 그때까지 mock 모드로 개발한다.

### 원격 push 전 확인

`folders.species_id`와 `xp_ledger.folder_id`는 기존 행에 값을 채우지 않고 `not null`로 추가한다. 동물을 임의로 고르지 않기 위해서다. 그래서 원격에 폴더나 경험치 내역이 남아 있으면 `20261030062236_folder_characters.sql`이 실패한다. push 전에 대시보드 → SQL Editor에서 아래를 실행한다.

```sql
select
  (select count(*) from public.folders) as folders,
  (select count(*) from public.xp_ledger) as xp_ledger,
  (select count(*) from public.characters) as characters,
  (select count(*) from public.items) as items,
  (select count(*) from public.user_items) as user_items,
  (select count(*) from public.point_ledger) as point_ledger;
```

1. 모두 0이면 바로 push한다.
2. 0이 아니면 그 행이 시험 데이터인지 확인한다. 지켜야 할 데이터가 있으면 push하지 않고 팀과 상의한다.
3. 시험 데이터라면 대시보드 → Authentication → Users에서 그 시험 사용자를 지운다. 사용자를 지우면 폴더, 경험치 내역, 캐릭터, 아이템 보유, 포인트 내역이 cascade로 함께 지워진다.
   - `items`는 사용자에 딸리지 않아 남는다. 아이템 기본 데이터를 넣은 적이 없어 0이어야 하고, 남아 있어도 마이그레이션이 테이블째 지운다.
4. 위 쿼리를 다시 실행해 `folders`, `xp_ledger`가 0인지 확인한다.
5. `backend/`에서 `npx supabase@2.122.0 db push --linked --dry-run`으로 두 마이그레이션이 적용 대상인지 확인한 뒤 `npx supabase@2.122.0 db push --linked`
6. push 뒤 원격 HTTP 시험(`supabase/tests/http/remote/remote.test.mjs`)을 실행한다. 실행 방법과 시험 사용자 정리는 `backend/README.md`의 "HTTP 시험"을 본다.

## 꾸미기를 다시 넣을 때

- 기존 정의는 git 기록에서 참고한다.
  - DB: `20261029084531_init_schema.sql`, `20261029105925_server_functions.sql`
  - shared: PR #12 이전 커밋(`9a394eb`)의 `shared/src`
- 새 마이그레이션으로 다시 만든다. 이미 적용된 마이그레이션 파일은 고치지 않는다.
- 먼저 정할 것:
  - 아이템을 누가 가지고 장착하는가: 사용자 단위인지, 폴더의 캐릭터 단위인지
  - 포인트를 폴더별로 모으는지, 사용자 전체로 모으는지
  - 획득 방식(D9): 레벨 조건, 포인트 구매. 레벨 조건이면 어느 폴더의 레벨을 기준으로 하는지
- 순서: shared PR → 마이그레이션(`server` 스키마에 함수를 추가하면 회수·부여 두 줄을 다시 실행) → 0002 권한 표와 pgTAP 기대값 갱신
