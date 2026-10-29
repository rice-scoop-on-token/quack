# Quack (꽥)

공부한 내용을 AI 동물 캐릭터에게 설명하면, AI가 설명의 빈 곳을 역질문으로 짚어 주는 학습 앱이다. 작업 규칙, 담당, 아키텍처는 [CLAUDE.md](CLAUDE.md)를 따른다.

## 필요한 도구

| 도구              | 버전     | 필요한 사람    | 설치 (Windows 기준)                                      |
| ----------------- | -------- | -------------- | -------------------------------------------------------- |
| Node.js           | 24.3 이상 | 전원           | [nodejs.org](https://nodejs.org)                         |
| pnpm              | 12.15.0  | 전원           | `npm install -g pnpm@12.15.0`                            |
| Docker Desktop    | 최신     | BE (AI는 선택) | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Supabase CLI      | 2.122.0  | BE, AI         | 설치하지 않고 `npx supabase@2.122.0 <명령어>`로 실행한다 |
| Deno              | 2.x      | BE, AI         | `winget install DenoLand.Deno`                           |
| VS Code Deno 확장 | -        | BE, AI         | 레포를 VS Code로 열면 권장 확장으로 뜬다                 |

Node.js 버전은 Expo SDK 58의 요구사항이다. 22.13 이상(22.x)이나 26 이상도 되지만, 23·25 같은 홀수 버전은 지원하지 않는다.

## 처음 한 번 설정

```bash
git clone https://github.com/rice-scoop-on-token/quack.git
cd quack
pnpm install
```

환경 변수 파일을 만든다. `.env`는 커밋하지 않는다.

- `frontend/.env.example`을 복사해 `frontend/.env`를 만든다. 처음에는 `EXPO_PUBLIC_USE_MOCK=true`로 두고 mock 데이터로 시작한다.
- (BE, AI) `backend/supabase/functions/.env.example`을 복사해 `backend/supabase/functions/.env`를 만든다. 실제 키 값은 단톡에 올리지 않고 따로 전달받는다.

## 실행

- 앱: 루트에서 `pnpm --filter @quack/frontend start`. 웹은 터미널에서 `w`를 누르고, 실기기는 SDK 58을 지원하는 Expo Go가 필요하다.
- 백엔드: `backend/`로 이동해 `npx supabase@2.122.0 start`처럼 실행한다. 함수 실행과 확인 방법은 [backend/README.md](backend/README.md)를 본다.

## 타입 검사

- 루트에서 `pnpm typecheck`: frontend와 shared를 검사한다.
- 함수 코드를 고쳤다면 `backend/supabase/functions/api`에서 `deno check index.ts`도 실행한다.
- main push와 PR마다 GitHub Actions(CI)가 위 검사를 실행한다. 강제는 아니므로, 커밋이나 PR 옆에 빨간 X가 보이면 눌러서 실패한 단계의 로그를 확인한다.
