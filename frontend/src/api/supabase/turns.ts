import {
  createTurnResponseSchema,
  errorResponseSchema,
  type CreateTurnRequest,
  type CreateTurnResponse,
  type ErrorCode,
} from '@quack/shared';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { getSupabase } from '@/api/supabase/client';

// 발표용 임시 연결. 폴더·세션 조회는 mock에 두고, 설명 분석만 실제 서버로 보낸다.
// 원격 세션은 공부 시작(sessionStart.ts, POST /sessions/start)이 만들고 mock 세션 id와 이어 둔다.
// 폴더·세션을 모두 원격으로 옮기면 mock에 남은 조회(타이머 화면, 성장, 기록)가 깨져서 이렇게 했다. 발표 뒤 제대로 옮긴다.

// 서버 응답은 8~15초 걸린다. 서버의 AI 대기 시간(30초)보다 넉넉하게 둔다(#21에서 합의).
const TURN_TIMEOUT_MS = 45_000;

export type TurnErrorCode = ErrorCode | 'TIMEOUT' | 'NETWORK';

// 화면은 code로 처리를 나눈다. message는 사용자에게 그대로 보여 줄 문장이다.
export class TurnRequestError extends Error {
  readonly code: TurnErrorCode;

  constructor(code: TurnErrorCode, message: string) {
    super(message);
    this.name = 'TurnRequestError';
    this.code = code;
  }
}

// mock 세션 id → 원격 세션 id. 앱을 새로 열면 mock 데이터도 처음 상태로 돌아가므로 메모리에만 둔다.
// 한계: 웹은 mock 데이터가 localStorage에 남아서, 타이머 화면을 새로고침하면 mock 세션은 있는데 이 연결은 없다.
// 이때는 설명을 보내지 않고 처음부터 다시 시작하게 한다. 세션을 앱에서 직접 만들지 않는 것은 #31 7번(INSERT 권한 회수) 때문이다.
const remoteSessionIds = new Map<string, string>();

export function linkRemoteSession(mockSessionId: string, remoteSessionId: string): void {
  remoteSessionIds.set(mockSessionId, remoteSessionId);
}

// 서버가 보낸 에러 본문({ error: { code, message } })을 읽는다. JSON이 아니거나 모양이 다르면 null이다.
export async function readServerError(error: FunctionsHttpError): Promise<{ code: ErrorCode; message: string } | null> {
  try {
    const body = errorResponseSchema.safeParse(await (error.context as Response).json());
    return body.success ? body.data.error : null;
  } catch {
    return null;
  }
}

async function toTurnError(error: unknown): Promise<TurnRequestError> {
  if (error instanceof FunctionsHttpError) {
    const server = await readServerError(error);
    return server
      ? new TurnRequestError(server.code, server.message)
      : new TurnRequestError('INTERNAL_ERROR', '문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
  }

  if (error instanceof FunctionsFetchError && (error.context as Error | undefined)?.name === 'AbortError') {
    return new TurnRequestError('TIMEOUT', '답변이 너무 오래 걸려요. 대화를 다시 확인한 뒤 보내 주세요.');
  }

  return new TurnRequestError('NETWORK', '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
}

// POST /sessions/:id/turns. 실패하면 TurnRequestError를 던진다.
export async function sendRemoteTurn(mockSessionId: string, input: CreateTurnRequest): Promise<CreateTurnResponse> {
  const sessionId = remoteSessionIds.get(mockSessionId);
  if (!sessionId) {
    throw new TurnRequestError('NOT_FOUND', '공부 세션을 찾지 못했어요. 처음부터 다시 시작해 주세요.');
  }

  const { data, error } = await getSupabase().functions.invoke(`api/sessions/${sessionId}/turns`, {
    body: input,
    timeout: TURN_TIMEOUT_MS,
  });

  if (error) {
    throw await toTurnError(error);
  }

  const parsed = createTurnResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new TurnRequestError('INTERNAL_ERROR', '답변을 읽지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return parsed.data;
}
