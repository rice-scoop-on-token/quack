import {
  type Session,
  type StartSessionRequest,
  startSessionRequestSchema,
  startSessionResponseSchema,
} from '@quack/shared';

import { classifyGoalScope, type GoalScopeResult } from '../../functions/_ai/goalScopeClient.ts';
import { AppError } from '../../functions/api/middleware/error.ts';
import { type SessionStartDependencies, startSession } from '../../functions/api/services/sessionStart.service.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const request: StartSessionRequest = {
  folder_id: '22222222-2222-4222-8222-222222222222',
  goal: '직접 사상 캐시의 히트 조건',
  request_id: '33333333-3333-4333-8333-333333333333',
};
const session: Session = {
  id: '44444444-4444-4444-8444-444444444444',
  user_id: userId,
  folder_id: request.folder_id,
  goal: request.goal,
  status: 'active',
  started_at: '2026-11-13T00:00:00+00:00',
  ended_at: null,
};

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectAppError(result: Promise<unknown>, code: AppError['code']) {
  try {
    await result;
  } catch (error) {
    assert(error instanceof AppError && error.code === code, `${code} 오류가 필요하다.`);
    return;
  }
  throw new Error(`${code} 오류가 필요하다.`);
}

function fakeDependencies({
  ownsFolder = true,
  existing = null,
  classification = { ok: true, status: 'in_scope' },
  savedSession = session,
}: {
  ownsFolder?: boolean;
  existing?: Session | null;
  classification?: GoalScopeResult;
  savedSession?: Session;
} = {}) {
  const calls: string[] = [];
  const dependencies: SessionStartDependencies = {
    ownsFolder: (actor, folderId) => {
      calls.push('ownership');
      assert(actor === userId && folderId === request.folder_id, '요청자의 폴더 소유권을 확인해야 한다.');
      return Promise.resolve(ownsFolder);
    },
    findByRequestId: (actor, requestId) => {
      calls.push('lookup');
      assert(actor === userId && requestId === request.request_id, '요청자와 요청 ID로 조회해야 한다.');
      return Promise.resolve(existing);
    },
    classifyGoal: (goal) => {
      calls.push('classify');
      assert(goal === request.goal, '학습 목표를 판정기에 전달해야 한다.');
      return Promise.resolve(classification);
    },
    saveOnce: (actor, input) => {
      calls.push('save');
      assert(actor === userId && input.request_id === request.request_id &&
        input.folder_id === request.folder_id && input.goal === request.goal,
        '요청자와 검증된 입력을 저장소에 전달해야 한다.');
      return Promise.resolve(savedSession);
    },
  };
  return { dependencies, calls };
}

Deno.test('소유권 확인 뒤 범위 안으로 판정한 경우에만 저장된 세션을 반환한다', async () => {
  const { dependencies, calls } = fakeDependencies();
  const response = startSessionResponseSchema.parse(await startSession(userId, request, dependencies));
  assert(response.status === 'in_scope' && response.session.id === session.id, '저장된 세션을 반환해야 한다.');
  assert(calls.join(',') === 'ownership,lookup,classify,save', '소유권 확인과 판정이 저장보다 앞서야 한다.');
});

Deno.test('폴더 소유권이 없으면 재시도 조회와 판정을 건너뛴다', async () => {
  const { dependencies, calls } = fakeDependencies({ ownsFolder: false });
  await expectAppError(startSession(userId, request, dependencies), 'NOT_FOUND');
  assert(calls.join(',') === 'ownership', '폴더 소유권 외 작업을 호출할 수 없다.');
});

for (const status of ['out_of_scope', 'needs_clarification'] as const) {
  Deno.test(`${status} 판정은 안내만 반환하고 세션을 저장하지 않는다`, async () => {
    const { dependencies, calls } = fakeDependencies({ classification: { ok: true, status } });
    const response = startSessionResponseSchema.parse(await startSession(userId, request, dependencies));
    assert(response.status === status, '판정에 맞는 안내를 반환해야 한다.');
    assert(calls.join(',') === 'ownership,lookup,classify', '안내할 때 저장을 호출할 수 없다.');
  });
}

Deno.test('판정 실패는 AI_FAILED를 반환하고 세션을 저장하지 않는다', async () => {
  const { dependencies, calls } = fakeDependencies({ classification: { ok: false, code: 'TIMEOUT' } });
  await expectAppError(startSession(userId, request, dependencies), 'AI_FAILED');
  assert(calls.join(',') === 'ownership,lookup,classify', '판정이 실패하면 저장을 호출할 수 없다.');
});

Deno.test('같은 요청의 기존 세션은 AI 재호출과 추가 저장 없이 재사용한다', async () => {
  const { dependencies, calls } = fakeDependencies({ existing: session });
  const response = await startSession(userId, request, dependencies);
  assert(response.status === 'in_scope' && response.session.id === session.id, '같은 세션 ID를 반환해야 한다.');
  assert(calls.join(',') === 'ownership,lookup', '이미 저장한 요청은 다시 판정하거나 저장할 수 없다.');
});

Deno.test('같은 요청 ID의 기존 세션에 다른 목표가 있으면 충돌로 처리한다', async () => {
  const { dependencies, calls } = fakeDependencies({ existing: { ...session, goal: '이분 탐색' } });
  await expectAppError(startSession(userId, request, dependencies), 'INVALID_STATE');
  assert(calls.join(',') === 'ownership,lookup', '충돌한 요청은 다시 판정하거나 저장할 수 없다.');
});

Deno.test('동시 저장 중 다른 입력이 먼저 저장되면 해당 세션을 성공으로 돌려주지 않는다', async () => {
  const { dependencies, calls } = fakeDependencies({ savedSession: { ...session, goal: '이분 탐색' } });
  await expectAppError(startSession(userId, request, dependencies), 'INVALID_STATE');
  assert(calls.join(',') === 'ownership,lookup,classify,save', '저장소가 반환한 세션도 입력과 비교해야 한다.');
});

for (const status of ['in_scope', 'out_of_scope', 'needs_clarification', 'invalid'] as const) {
  Deno.test(`AI 응답 ${status}를 판정 모듈에서 검증한 뒤 공부 시작에 반영한다`, async () => {
    const { dependencies, calls } = fakeDependencies();
    const input = startSessionRequestSchema.parse({ ...request, goal: `  ${request.goal}  ` });

    dependencies.classifyGoal = (goal) => classifyGoalScope(goal, {
      apiKey: 'fake-key',
      model: 'fake-model',
      transport: () => {
        calls.push('transport');
        return Promise.resolve(Response.json({
          status: 'completed',
          output: [{
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: JSON.stringify({ status }) }],
          }],
        }));
      },
    });

    const result = startSession(userId, input, dependencies);
    if (status === 'invalid') {
      await expectAppError(result, 'AI_FAILED');
    } else {
      const response = startSessionResponseSchema.parse(await result);
      assert(response.status === status, '검증한 판정과 일치하는 응답을 반환해야 한다.');
    }

    const expectedCalls = status === 'in_scope' ? 'ownership,lookup,transport,save' : 'ownership,lookup,transport';
    assert(calls.join(',') === expectedCalls, '범위 안으로 검증된 경우에만 저장해야 한다.');
  });
}
