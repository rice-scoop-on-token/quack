import type { SupabaseClient } from '@supabase/supabase-js';

import type { FinishSessionResponse, Session } from '@quack/shared';

import { AppError, appErrorFromDb } from '../middleware/error.ts';

// sessionSchema의 칸과 같다. 응답 스키마에 필요한 칸을 빠짐없이 읽기 위해 한 곳에 둔다.
const SESSION_COLUMNS = 'id, user_id, folder_id, goal, status, started_at, ended_at';

// adminDb는 다른 사용자의 세션도 바꿀 수 있으므로, 그 전에 RLS가 적용되는 userDb로 내 세션인지 확인한다.
async function getMySession(userDb: SupabaseClient, sessionId: string): Promise<Session> {
  const { data, error } = await userDb
    .from('sessions')
    .select(SESSION_COLUMNS)
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw appErrorFromDb(error);

  // 세션이 없거나 다른 사용자의 것이다. 어느 쪽인지 알리지 않는다.
  if (!data) throw new AppError('NOT_FOUND');

  return data;
}

// 설명 내용은 필요 없으므로 행을 읽지 않고 개수만 센다.
async function countTurns(userDb: SupabaseClient, sessionId: string): Promise<number> {
  const { count, error } = await userDb
    .from('explanation_turns')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if (error) throw appErrorFromDb(error);

  return count ?? 0;
}

// 세션에서 이해한 개념과 부족한 개념을 구한다.
// AI 분석 결과를 저장할 analysis_results 테이블이 아직 없어서 지금은 항상 빈 배열이다.
// 테이블이 생기면 이 함수만 바꿔 분석 결과에서 개념을 모은다(docs/decisions/0002-db-permissions.md 후속 작업).
function getSessionConcepts() {
  return { covered_concepts: [] as string[], weak_concepts: [] as string[] };
}

// POST /sessions/:id/finish: 진행 중인 세션을 종료하고 세션 점검 결과를 돌려준다.
// 이미 종료된 세션(finished, reported)은 아무것도 바꾸지 않고 같은 결과를 돌려준다. 앱이 재시도해도 안전하다.
export async function finishSession(
  userDb: SupabaseClient,
  adminDb: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<FinishSessionResponse> {
  let session = await getMySession(userDb, sessionId);

  if (session.status === 'active') {
    // sessions.status와 ended_at은 앱 역할이 바꿀 수 없는 칸이라 adminDb로 쓴다.
    // status = 'active' 조건을 함께 걸어, 같은 요청이 동시에 두 번 와도 한 번만 바뀌게 한다.
    const { data, error } = await adminDb
      .from('sessions')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', session.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .select(SESSION_COLUMNS)
      .maybeSingle();

    if (error) throw appErrorFromDb(error);

    // 바뀐 행이 없으면 다른 요청이 먼저 종료한 것이다. 그 요청이 저장한 값을 다시 읽어 쓴다.
    session = data ?? (await getMySession(userDb, session.id));
  }

  const turnCount = await countTurns(userDb, session.id);
  const { covered_concepts, weak_concepts } = getSessionConcepts();

  return {
    session,
    review: {
      covered_concepts,
      weak_concepts,
      turn_count: turnCount,
      suggested_next: weak_concepts.length > 0 ? 're_explain' : 'quiz',
    },
  };
}
