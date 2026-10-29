import { validator } from 'hono/validator';
import type { z } from 'zod';

import { AppError, zodIssuesForLog } from './error.ts';

// 라우트는 c.req.valid('json')으로 검증을 통과한 값만 꺼내 쓴다.
export function validateJson<S extends z.ZodType>(schema: S) {
  return validator('json', (value, c) => {
    const result = schema.safeParse(value);
    if (!result.success) {
      console.warn('[api] 요청 본문이 스키마와 맞지 않음', c.req.method, c.req.path, zodIssuesForLog(result.error));
      throw new AppError('VALIDATION_FAILED');
    }
    return result.data as z.output<S>;
  });
}

// 라우트는 c.req.valid('param')으로 검증을 통과한 경로 파라미터만 꺼내 쓴다.
export function validateParams<S extends z.ZodType>(schema: S) {
  return validator('param', (value, c) => {
    const result = schema.safeParse(value);
    if (!result.success) {
      console.warn('[api] 경로 파라미터가 스키마와 맞지 않음', c.req.method, c.req.path, zodIssuesForLog(result.error));
      throw new AppError('VALIDATION_FAILED');
    }
    return result.data as z.output<S>;
  });
}
