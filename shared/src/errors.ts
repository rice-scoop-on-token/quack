import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'VALIDATION_FAILED',
  // 대상이 없을 때뿐 아니라 다른 사용자의 것일 때도 쓴다. 존재 여부를 알리지 않기 위해서다.
  'NOT_FOUND',
  'INVALID_STATE',
  'FILE_TOO_LARGE',
  'AI_QUOTA_EXCEEDED',
  'AI_FAILED',
  'STT_FAILED',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

// 서버의 에러 미들웨어가 code에 맞는 HTTP 상태를 이 표에서 꺼내 쓴다.
export const ERROR_HTTP_STATUS = {
  UNAUTHORIZED: 401,
  VALIDATION_FAILED: 400,
  NOT_FOUND: 404,
  INVALID_STATE: 409,
  FILE_TOO_LARGE: 413,
  AI_QUOTA_EXCEEDED: 429,
  AI_FAILED: 502,
  STT_FAILED: 502,
  INTERNAL_ERROR: 500,
} as const satisfies Record<ErrorCode, number>;

// 함수 코드가 돌려주는 에러 응답이다.
// 함수에 닿기 전에 Supabase 게이트웨이가 막은 401(인증 헤더 없음 등)은 이 모양이 아니다.
export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    // 사용자에게 그대로 보여줄 한국어 문장
    message: z.string().min(1),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
