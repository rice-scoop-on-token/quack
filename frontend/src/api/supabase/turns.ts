import {
  createTurnResponseSchema,
  errorResponseSchema,
  type CreateTurnRequest,
  type CreateTurnResponse,
  type ErrorCode,
  type SpeciesId,
} from '@quack/shared';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { ensureSignedIn, getSupabase } from '@/api/supabase/client';

// 시연 영상용 임시 연결(이슈 #22). 폴더·세션은 mock에 두고, 설명 분석만 실제 서버로 보낸다.
// mock 세션으로 처음 설명을 보낼 때 원격에 같은 동물의 폴더와 같은 목표의 세션("그림자 세션")을 만들고 mock 세션 id와 이어 둔다.
// 폴더·세션을 모두 원격으로 옮기면 mock에 남은 조회(타이머 화면, 성장, 기록)가 깨져서 이렇게 했다. 제출 뒤 제대로 옮긴다.

export type ShadowSessionSource = {
  mockSessionId: string;
  goal: string;
  folderName: string;
  speciesId: SpeciesId;
};

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

// 앱을 새로 열면 mock 데이터도 처음 상태로 돌아가므로 메모리에만 둔다.
// 같은 세션의 요청이 한꺼번에 와도 원격 세션을 하나만 만들도록 만드는 중인 Promise를 둔다.
const remoteSessionIds = new Map<string, Promise<string>>();

async function createShadowSession(source: ShadowSessionSource): Promise<string> {
  const userId = await ensureSignedIn();
  const supabase = getSupabase();

  // user_id는 로그인한 사용자 id여야 RLS를 통과한다.
  const folder = await supabase
    .from('folders')
    .insert({ user_id: userId, name: source.folderName, species_id: source.speciesId })
    .select('id')
    .single();
  if (folder.error) {
    throw new TurnRequestError('INTERNAL_ERROR', '세션을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  const session = await supabase
    .from('sessions')
    .insert({ user_id: userId, folder_id: folder.data.id, goal: source.goal })
    .select('id')
    .single();
  if (session.error) {
    throw new TurnRequestError('INTERNAL_ERROR', '세션을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  return session.data.id;
}

function remoteSessionIdFor(source: ShadowSessionSource): Promise<string> {
  let pending = remoteSessionIds.get(source.mockSessionId);
  if (!pending) {
    pending = createShadowSession(source);
    remoteSessionIds.set(source.mockSessionId, pending);
    // 만들기에 실패하면 다음 요청에서 다시 만든다
    pending.catch(() => remoteSessionIds.delete(source.mockSessionId));
  }
  return pending;
}

async function toTurnError(error: unknown): Promise<TurnRequestError> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = errorResponseSchema.safeParse(await (error.context as Response).json());
      if (body.success) {
        return new TurnRequestError(body.data.error.code, body.data.error.message);
      }
    } catch {
      // 본문이 JSON이 아니면 아래 공통 문장을 쓴다
    }
    return new TurnRequestError('INTERNAL_ERROR', '문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
  }

  if (error instanceof FunctionsFetchError && (error.context as Error | undefined)?.name === 'AbortError') {
    return new TurnRequestError('TIMEOUT', '답변이 너무 오래 걸려요. 대화를 다시 확인한 뒤 보내 주세요.');
  }

  return new TurnRequestError('NETWORK', '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
}

// POST /sessions/:id/turns. 실패하면 TurnRequestError를 던진다.
export async function sendRemoteTurn(source: ShadowSessionSource, input: CreateTurnRequest): Promise<CreateTurnResponse> {
  const sessionId = await remoteSessionIdFor(source);
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
