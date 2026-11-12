import type { Session, StartSessionRequest, StartSessionResponse } from '@quack/shared';

import type { GoalScopeResult } from '../../_ai/goalScopeClient.ts';
import { AppError } from '../middleware/error.ts';

export type SessionStartDependencies = {
  ownsFolder(userId: string, folderId: string): Promise<boolean>;
  findByRequestId(userId: string, requestId: string): Promise<Session | null>;
  classifyGoal(goal: string): Promise<GoalScopeResult>;
  // 저장소는 사용자·요청 ID로 한 번만 저장하고, 동시에 저장됐다면 먼저 저장된 세션을 반환한다.
  saveOnce(userId: string, request: StartSessionRequest): Promise<Session>;
};

function reuseSession(session: Session, userId: string, request: StartSessionRequest): StartSessionResponse {
  if (session.user_id !== userId) throw new AppError('INTERNAL_ERROR');
  if (session.folder_id !== request.folder_id || session.goal !== request.goal) {
    throw new AppError('INVALID_STATE');
  }
  return { status: 'in_scope', session };
}

// 호출자가 인증한 사용자와 shared에서 검증·정규화한 입력을 전달한다.
export async function startSession(
  userId: string,
  request: StartSessionRequest,
  dependencies: SessionStartDependencies,
): Promise<StartSessionResponse> {
  if (!(await dependencies.ownsFolder(userId, request.folder_id))) throw new AppError('NOT_FOUND');

  const existing = await dependencies.findByRequestId(userId, request.request_id);
  if (existing) return reuseSession(existing, userId, request);

  const result = await dependencies.classifyGoal(request.goal);
  if (!result.ok) {
    if (result.code === 'INVALID_OPTIONS' || result.code === 'INVALID_GOAL') {
      throw new AppError('INTERNAL_ERROR');
    }
    throw new AppError('AI_FAILED', '학습 목표의 범위를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  switch (result.status) {
    case 'out_of_scope':
      return {
        status: result.status,
        message: '지금은 자료구조, 알고리즘, 컴퓨터구조를 지원해요. 이 세 과목 중 하나로 학습 목표를 바꿔 주세요.',
      };
    case 'needs_clarification':
      return { status: result.status, message: '세 과목 중 어떤 개념을 공부하고 싶나요?' };
    case 'in_scope': {
      const session = await dependencies.saveOnce(userId, request);
      return reuseSession(session, userId, request);
    }
  }
}
