// BE-B 라우트 작성 참고용 예시
// GET /api/me: 로그인한 사용자의 프로필을 돌려준다.
// 요청 흐름: index.ts의 auth 미들웨어 → 이 라우트 → service → DB → respond. 에러는 AppError로 던진다.
// 만드는 순서는 backend/README.md의 "새 라우트 만들기"를 본다.

import { Hono } from 'hono';
import { z } from 'zod';

import { profileSchema } from '@quack/shared';

import type { AuthEnv } from '../middleware/auth.ts';
import { respond } from '../middleware/respond.ts';
import { getMyProfile } from '../services/profile.service.ts';

// 앱은 프로필을 supabase-js로 직접 읽으므로 이 응답은 shared 계약(api.ts)에 넣지 않고 이 파일에 둔다.
// 앱과 주고받는 새 라우트는 요청·응답 스키마를 shared/src/api.ts에서 가져온다.
const meResponseSchema = z.object({ profile: profileSchema });

// AuthEnv를 넘겨야 c.var.userId 같은 값의 타입을 받는다.
export const meRoute = new Hono<AuthEnv>();

// 요청 본문이 있는 라우트는 핸들러 앞에 validateJson(스키마)를 넣고 c.req.valid('json')으로 꺼낸다.
meRoute.get('/', async (c) => {
  // 1. 인증: auth 미들웨어가 토큰에서 확인한 사용자 id만 쓴다. 요청 본문·쿼리의 user_id는 쓰지 않는다.
  const userId = c.var.userId;

  // 2. service 호출: 로직과 DB 조회는 service에 두고, 라우트는 값만 넘긴다.
  //    자기 데이터 조회라 RLS가 적용되는 userDb를 쓴다(adminDb는 쓰지 않는다).
  const profile = await getMyProfile(c.var.userDb, userId);

  // 3. 응답: respond로만 보낸다. 스키마에 없는 필드는 걸러진다.
  //    service가 던진 AppError(예: 프로필이 없으면 NOT_FOUND)는 index.ts의 errorHandler가
  //    { error: { code, message } } 형태로 바꿔 응답한다.
  return respond(c, meResponseSchema, { profile });
});
