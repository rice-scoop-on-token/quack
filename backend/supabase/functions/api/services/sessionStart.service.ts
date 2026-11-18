import type { SupabaseClient } from '@supabase/supabase-js';

import type { Session, StartSessionRequest, StartSessionResponse } from '@quack/shared';

import { classifyGoalScope, type GoalScopeResult } from '../../_ai/goalScopeClient.ts';
import { AI_DAILY_LIMIT, type LlmConfig, readLlmConfig } from '../../_shared/aiConfig.ts';
import { AppError, appErrorFromDb } from '../middleware/error.ts';
import { SESSION_COLUMNS } from './sessions.service.ts';

// 서비스가 쓰는 DB·AI 작업. 단위 시험에서 가짜로 바꿔 끼워 처리 순서를 확인하기 위해 따로 받는다.
export type SessionStartDependencies = {
  ownsFolder(userId: string, folderId: string): Promise<boolean>;
  findByRequestId(userId: string, requestId: string): Promise<Session | null>;
  readAiConfig(): LlmConfig;
  // 오늘 사용량을 하나 쓴다. 한도를 넘었으면 false다.
  consumeQuota(userId: string): Promise<boolean>;
  classifyGoal(goal: string, config: LlmConfig): Promise<GoalScopeResult>;
  // 사용자·요청 ID로 한 번만 저장한다. 동시에 저장됐다면 먼저 저장된 세션을 돌려준다.
  saveOnce(userId: string, request: StartSessionRequest): Promise<Session>;
};

// 같은 재시도 키로 이미 만든 세션은 입력이 같을 때만 돌려준다. 입력이 다르면 다른 요청에 키를 잘못 쓴 것이다.
// 이미 종료된 세션도 그대로 돌려준다. 앱은 화면을 다시 열 때 새 키를 쓰기로 해서 생길 가능성이 낮다.
function reuseSession(session: Session, userId: string, request: StartSessionRequest): StartSessionResponse {
  if (session.user_id !== userId) throw new AppError('INTERNAL_ERROR');
  if (session.folder_id !== request.folder_id || session.goal !== request.goal) {
    throw new AppError('INVALID_STATE');
  }
  return { status: 'in_scope', session };
}

// POST /sessions/start: 학습 목표가 지원 과목 범위인지 AI로 확인하고, 범위 안일 때만 세션을 만든다.
// 호출자는 auth 미들웨어가 확인한 사용자 id와 shared 스키마로 검증한 입력을 넘긴다.
// AI가 실패하면 세션을 만들지 않는다. 앱은 같은 재시도 키로 다시 보낼 수 있다. 차감한 사용량은 돌려주지 않는다.
export async function startSession(
  userId: string,
  request: StartSessionRequest,
  dependencies: SessionStartDependencies,
): Promise<StartSessionResponse> {
  if (!(await dependencies.ownsFolder(userId, request.folder_id))) throw new AppError('NOT_FOUND');

  // 재시도는 AI를 다시 부르지도, 사용량을 쓰지도 않게 가장 먼저 확인한다.
  const existing = await dependencies.findByRequestId(userId, request.request_id);
  if (existing) return reuseSession(existing, userId, request);

  // 키가 없으면 사용량을 쓰기 전에 실패하게 먼저 읽는다.
  const config = dependencies.readAiConfig();
  if (!(await dependencies.consumeQuota(userId))) throw new AppError('AI_QUOTA_EXCEEDED');

  const result = await dependencies.classifyGoal(request.goal, config);
  if (!result.ok) {
    // 실패 코드만 남긴다. 학습 목표는 사용자 입력이라 로그에 남기지 않는다.
    console.error('[api] 학습 목표 범위 확인 실패', result.code, result.httpStatus ?? '');
    // 입력·설정 오류는 서버가 잘못 부른 것이라 다시 시도해도 같다.
    if (result.code === 'INVALID_OPTIONS' || result.code === 'INVALID_GOAL') {
      throw new AppError('INTERNAL_ERROR');
    }
    throw new AppError('AI_FAILED');
  }

  // 안내 문구는 앱이 상태값에 맞춰 보여 준다(PR #25).
  if (result.status !== 'in_scope') return { status: result.status };

  const session = await dependencies.saveOnce(userId, request);
  return reuseSession(session, userId, request);
}

// 실제 DB·AI로 작업을 만든다. userDb는 RLS가 적용되는 사용자 클라이언트, adminDb는 service role 클라이언트다.
export function createSessionStartDependencies(
  userDb: SupabaseClient,
  adminDb: SupabaseClient,
): SessionStartDependencies {
  async function findByRequestId(userId: string, requestId: string): Promise<Session | null> {
    const { data, error } = await userDb
      .from('sessions')
      .select(SESSION_COLUMNS)
      .eq('user_id', userId)
      .eq('request_id', requestId)
      .maybeSingle();

    if (error) throw appErrorFromDb(error);
    return data;
  }

  return {
    async ownsFolder(userId, folderId) {
      // RLS가 남의 폴더를 가리므로, 없거나 남의 폴더면 둘 다 행이 없다.
      const { data, error } = await userDb
        .from('folders')
        .select('id')
        .eq('id', folderId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw appErrorFromDb(error);
      return data !== null;
    },

    findByRequestId,

    readAiConfig: readLlmConfig,

    async consumeQuota(userId) {
      // consume_ai_quota는 server 스키마 함수라 service role로만 부를 수 있다. user_id는 auth 미들웨어가 확인한 값이다.
      // 'analysis'는 임시값이다. ai_usage.kind에 공부 시작용 종류가 없어, 따로 세려면 마이그레이션이 필요하다(팀 확인 필요).
      const { data, error } = await adminDb.schema('server').rpc('consume_ai_quota', {
        p_user_id: userId,
        p_kind: 'analysis',
        p_daily_limit: AI_DAILY_LIMIT,
      });

      if (error) throw appErrorFromDb(error);
      return data === true;
    },

    classifyGoal(goal, config) {
      return classifyGoalScope(goal, { apiKey: config.apiKey, model: config.model });
    },

    async saveOnce(userId, request) {
      // 앱 역할에는 request_id 칸의 추가 권한이 없어 service role로 저장한다(docs/decisions/0002).
      // service role은 RLS를 우회하므로 user_id는 auth 미들웨어가 확인한 값만 쓰고, 폴더 소유권은 먼저 userDb로 확인했다.
      const { data, error } = await adminDb
        .from('sessions')
        .insert({ user_id: userId, folder_id: request.folder_id, goal: request.goal, request_id: request.request_id })
        .select(SESSION_COLUMNS)
        .single();

      if (!error) return data;

      // 같은 재시도 키로 동시에 들어온 다른 요청이 먼저 저장했다(sessions_user_id_request_id_key). 그 세션을 돌려준다.
      if (error.code === '23505') {
        const saved = await findByRequestId(userId, request.request_id);
        if (saved) return saved;
      }

      throw appErrorFromDb(error);
    },
  };
}
