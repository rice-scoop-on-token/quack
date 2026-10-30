import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';

import { ERROR_HTTP_STATUS, type ErrorCode, errorCodeSchema, errorResponseSchema } from '@quack/shared';

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: '로그인 정보를 확인하지 못했어요. 앱을 다시 시작해 주세요.',
  VALIDATION_FAILED: '요청 내용이 올바르지 않아요.',
  NOT_FOUND: '찾을 수 없어요.',
  INVALID_STATE: '지금은 할 수 없는 요청이에요.',
  FILE_TOO_LARGE: '파일이 너무 커요.',
  AI_QUOTA_EXCEEDED: '오늘 사용할 수 있는 횟수를 모두 썼어요. 내일 다시 해 주세요.',
  AI_FAILED: '답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
  STT_FAILED: '음성을 글로 바꾸지 못했어요. 다시 녹음해 주세요.',
  INTERNAL_ERROR: '문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
};

// 서비스와 라우트는 에러를 이 클래스로 던진다. message를 생략하면 code별 기본 문장을 쓴다.
export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
  }
}

// supabase-js가 돌려준 DB 에러를 AppError로 바꾼다. 서비스는 `if (error) throw appErrorFromDb(error);`로 쓴다.
// server 스키마 함수는 shared ErrorCode 문자열을 메시지로 raise한다(Postgres 에러 코드 P0001).
// 그 외의 에러는 모두 INTERNAL_ERROR로 처리한다. 원문 메시지에는 값이 섞일 수 있어 앱으로 보내지도, 로그에 남기지도 않는다.
export function appErrorFromDb(error: { code?: string; message: string }): AppError {
  if (error.code === 'P0001') {
    const parsed = errorCodeSchema.safeParse(error.message);
    if (parsed.success) {
      return new AppError(parsed.data);
    }
  }

  console.error('[api] DB 오류', error.code);
  return new AppError('INTERNAL_ERROR');
}

// 요청·응답에는 사용자의 설명 같은 개인 데이터가 들어 있으므로 값은 남기지 않고 필드 경로와 에러 종류만 남긴다.
export function zodIssuesForLog(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    code: issue.code,
  }));
}

// respond.ts가 이 파일의 AppError를 쓰므로, 여기서 respond를 불러 쓰면 서로를 import하게 된다. 그래서 직접 스키마로 거른다.
function errorBody(code: ErrorCode, message: string) {
  return errorResponseSchema.parse({ error: { code, message } });
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json(errorBody(err.code, err.message), ERROR_HTTP_STATUS[err.code]);
  }

  // JSON 형식이 깨진 요청 본문은 Hono 검증기가 400 HTTPException으로 던진다.
  if (err instanceof HTTPException && err.status === 400) {
    return c.json(errorBody('VALIDATION_FAILED', DEFAULT_MESSAGES.VALIDATION_FAILED), 400);
  }

  // 예상하지 못한 오류의 내부 메시지는 앱으로 보내지 않고 서버 로그에만 남긴다.
  console.error('[api] 처리하지 못한 오류', c.req.method, c.req.path, err);
  return c.json(errorBody('INTERNAL_ERROR', DEFAULT_MESSAGES.INTERNAL_ERROR), 500);
};

export const notFoundHandler: NotFoundHandler = (c) =>
  c.json(errorBody('NOT_FOUND', DEFAULT_MESSAGES.NOT_FOUND), 404);
