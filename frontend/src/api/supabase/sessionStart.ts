import { startSessionResponseSchema, type StartSessionRequest, type StartSessionResponse } from '@quack/shared';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { ApiError } from '@/api/errors';
import type { QuackApi } from '@/api/QuackApi';
import { ensureSignedIn, getSupabase } from '@/api/supabase/client';
import { linkRemoteSession, readServerError } from '@/api/supabase/turns';

// 발표용 임시 연결. 폴더·세션 조회는 mock에 두고, 공부 시작 판정과 세션 생성만 실제 서버(POST /sessions/start)로 보낸다.
// 범위 안이면 mock 세션도 만들어 원격 세션과 이어 둔다. 타이머·성장·기록 화면이 mock 세션을 읽기 때문이다.

// 화면(SessionSetupScreen의 START_TIMEOUT_MS)과 같은 45초다. 서버의 AI 판정 대기(30초)보다 길다.
const START_TIMEOUT_MS = 45_000;

// mock 폴더 id → 원격 폴더 id. 같은 mock 폴더는 항상 같은 원격 폴더로 보낸다.
// 서버는 같은 request_id라도 폴더가 다르면 409를 주므로, 재시도 때 폴더가 바뀌면 안 된다.
// 한계: 메모리에만 둬서 앱을 다시 열면(웹은 새로고침) 첫 공부 시작 때 원격 폴더가 하나 더 생긴다.
const remoteFolderIds = new Map<string, Promise<string>>();

// 원격 세션 id → 이어 둔 mock 세션. 같은 request_id 재시도로 서버가 같은 세션을 돌려주면 mock 세션을 새로 만들지 않는다.
const mockSessions = new Map<string, Promise<StartSessionResponse>>();

async function createRemoteFolder(mock: QuackApi, mockFolderId: string): Promise<string> {
  const folder = (await mock.listFolders()).find((f) => f.id === mockFolderId);
  if (!folder) {
    throw new ApiError('NOT_FOUND', '과목을 찾지 못했어요.');
  }

  // user_id는 로그인한 사용자 id여야 RLS를 통과한다. 앱이 넣을 수 있는 칸은 user_id, name, species_id뿐이다.
  const userId = await ensureSignedIn();
  const { data, error } = await getSupabase()
    .from('folders')
    .insert({ user_id: userId, name: folder.name, species_id: folder.species_id })
    .select('id')
    .single();
  if (error) {
    throw new ApiError('INTERNAL_ERROR', '과목을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return data.id;
}

function remoteFolderIdFor(mock: QuackApi, mockFolderId: string): Promise<string> {
  let pending = remoteFolderIds.get(mockFolderId);
  if (!pending) {
    pending = createRemoteFolder(mock, mockFolderId);
    remoteFolderIds.set(mockFolderId, pending);
    // 만들기에 실패하면 다음 요청에서 다시 만든다
    pending.catch(() => remoteFolderIds.delete(mockFolderId));
  }
  return pending;
}

async function createMockSession(
  mock: QuackApi,
  remoteSessionId: string,
  input: StartSessionRequest,
): Promise<StartSessionResponse> {
  const session = await mock.startSession({ folder_id: input.folder_id, goal: input.goal });
  linkRemoteSession(session.id, remoteSessionId);
  // mock 세션에는 계약에 없는 칸(설명 기록 등)이 있어서 shared 스키마로 걸러 돌려준다
  return startSessionResponseSchema.parse({ status: 'in_scope', session });
}

// POST /sessions/start. 화면이 준 goal과 request_id는 그대로 보낸다(같은 request_id 재시도가 같은 세션을 받게).
// 실패하면 ApiError를 던진다. 화면은 INVALID_STATE(409)면 새 request_id로, 그 밖에는 같은 request_id로 다시 시도한다.
export async function startRemoteSession(mock: QuackApi, input: StartSessionRequest): Promise<StartSessionResponse> {
  const remoteFolderId = await remoteFolderIdFor(mock, input.folder_id);

  const { data, error } = await getSupabase().functions.invoke('api/sessions/start', {
    body: { folder_id: remoteFolderId, goal: input.goal, request_id: input.request_id },
    timeout: START_TIMEOUT_MS,
  });

  if (error) {
    const server = error instanceof FunctionsHttpError ? await readServerError(error) : null;
    if (server) {
      throw new ApiError(server.code, server.message);
    }
    // 무응답·네트워크 오류. 화면은 같은 request_id로 다시 시도하게 한다.
    throw new ApiError('INTERNAL_ERROR', '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  const parsed = startSessionResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError('INTERNAL_ERROR', '응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  // 범위 밖·구체화 필요는 세션이 없으므로 그대로 돌려준다
  if (parsed.data.status !== 'in_scope') {
    return parsed.data;
  }

  const remoteSessionId = parsed.data.session.id;
  let pending = mockSessions.get(remoteSessionId);
  if (!pending) {
    pending = createMockSession(mock, remoteSessionId, input);
    mockSessions.set(remoteSessionId, pending);
    pending.catch(() => mockSessions.delete(remoteSessionId));
  }
  return pending;
}
