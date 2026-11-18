import type { ErrorCode } from '@quack/shared';

// 서버 에러 응답({ error: { code, message } })을 앱 안에서 던질 때 쓰는 에러. 화면은 code로 갈래를 나눈다.
// 예) 공부 시작: AI_FAILED(판정 실패)는 같은 request_id로 재시도, INVALID_STATE(409)는 새 request_id로 다시 시도.
export class ApiError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}
