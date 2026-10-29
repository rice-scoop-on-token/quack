import { createSupabaseContext } from '@supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createMiddleware } from 'hono/factory';

import { AppError } from './error.ts';

// auth 미들웨어가 요청 컨텍스트에 넣는 값이다. 인증이 필요한 라우트는 new Hono<AuthEnv>()로 만들어 타입을 받는다.
export type AuthEnv = {
  Variables: {
    // 토큰에서 확인한 사용자 id. 서버가 DB에 쓰는 user_id는 항상 이 값만 쓴다(요청 본문·경로·쿼리 값은 쓰지 않는다).
    userId: string;
    // 사용자 토큰을 담은 클라이언트. RLS가 적용된다. 조회와, 앱도 쓸 수 있는 테이블에 쓸 때 쓴다.
    userDb: SupabaseClient;
    // service role 클라이언트. RLS를 우회하므로 서버 전용 테이블에 쓰거나 server 스키마 함수를 부를 때만 쓰고,
    // 쓰는 곳에 이유를 주석으로 남긴다(CLAUDE.md Backend 섹션).
    adminDb: SupabaseClient;
  };
};

// @supabase/server가 JWKS로 사용자 JWT의 서명을 검증한다.
// 함수 입구의 verify_jwt 검사를 통과했다고 사용자가 확인된 것은 아니어서 여기서 다시 확인한다(docs/decisions/0001).
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const { data: ctx, error } = await createSupabaseContext(c.req.raw, { auth: 'user' });

  if (error) {
    // 토큰이 없거나 잘못됐거나 만료된 경우다.
    if (error.status === 401) {
      throw new AppError('UNAUTHORIZED');
    }
    // 환경 변수 누락이나 JWKS를 가져오지 못한 경우다. 토큰 값은 남기지 않고 에러 코드만 남긴다.
    console.error('[api] 인증 처리 실패', c.req.method, c.req.path, error.code);
    throw new AppError('INTERNAL_ERROR');
  }

  // auth: 'user'로 확인에 성공하면 userClaims가 항상 있다.
  c.set('userId', ctx.userClaims!.id);
  c.set('userDb', ctx.supabase);
  c.set('adminDb', ctx.supabaseAdmin);

  await next();
});
