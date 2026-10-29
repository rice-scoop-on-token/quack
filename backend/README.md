# backend

Supabase 프로젝트(DB 마이그레이션, seed, Edge Functions)가 있는 폴더다.

## Supabase 명령어는 이 폴더에서 실행한다

Supabase CLI는 명령어를 실행한 위치에서 `supabase/` 폴더(`supabase/config.toml`)를 찾는다. 레포 루트에서 실행하면 `backend/supabase/`를 찾지 못하므로, 반드시 `backend/`로 이동한 뒤 실행한다.

```bash
cd backend
supabase start            # 로컬 Supabase 실행 (Docker 필요)
supabase db reset         # 마이그레이션 + seed 재적용
supabase functions serve  # 함수 로컬 실행
```

CLI 설치 방법은 [Supabase CLI 시작하기](https://supabase.com/docs/guides/local-development/cli/getting-started)를 참고한다. 설치하지 않았다면 `npx supabase <명령어>`로도 실행할 수 있다. 이 프로젝트는 CLI 2.122.0으로 초기화했다.

## API 함수 로컬 실행

`supabase/functions/api`는 Hono로 라우팅하는 Edge Function 하나다. 주소는 `/functions/v1/api/...` 형태다.

```bash
cd backend
supabase start            # 로컬 Supabase가 꺼져 있으면 먼저 실행
supabase functions serve  # 함수 실행 (코드를 고치면 자동으로 다시 불러온다)
```

다른 터미널에서 health 라우트로 동작을 확인한다. `<anon key>`는 `supabase status -o env`에 나오는 `ANON_KEY` 값이다. 함수 입구에서 JWT를 검사하므로 `sb_publishable_`로 시작하는 키를 Bearer로 넣으면 401이 난다.

```bash
curl -H "Authorization: Bearer <anon key>" http://127.0.0.1:54321/functions/v1/api/health
# {"ok":true} 가 나오면 정상
```

타입 검사는 함수 폴더(`supabase/functions/api`)에서 `deno check index.ts`로 한다. Deno는 실행한 폴더부터 위로 올라가며 `deno.json`을 찾는데, 레포 루트에는 `deno.json`이 없어 hono를 찾지 못하기 때문이다.

## 환경 변수

`supabase/functions/.env.example`을 복사해 `supabase/functions/.env`를 만들고 값을 채운다. `.env`는 커밋하지 않는다.
