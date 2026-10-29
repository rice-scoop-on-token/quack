import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';

import { AppError, zodIssuesForLog } from './error.ts';

// 라우트의 응답은 반드시 이 함수로 보낸다. 스키마로 한 번 걸러서
// 스키마에 없는 필드(퀴즈 정답 같은 서버 전용 값)가 앱으로 나가지 않게 한다.
export function respond<S extends z.ZodType>(
  c: Context,
  schema: S,
  data: z.input<S>,
  status: ContentfulStatusCode = 200,
) {
  const result = schema.safeParse(data);

  if (!result.success) {
    // 응답이 계약과 다르면 서버 버그다. 틀린 값은 앱으로 보내지 않는다.
    console.error('[api] 응답이 스키마와 맞지 않음', c.req.method, c.req.path, zodIssuesForLog(result.error));
    throw new AppError('INTERNAL_ERROR');
  }

  return c.json(result.data, status);
}
