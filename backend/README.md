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

## 환경 변수

`supabase/functions/.env.example`을 복사해 `supabase/functions/.env`를 만들고 값을 채운다. `.env`는 커밋하지 않는다.
