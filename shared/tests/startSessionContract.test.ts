import { startSessionRequestSchema, startSessionResponseSchema } from '../src/index.ts';
import type { Session } from '../src/index.ts';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const request = {
  folder_id: '11111111-1111-4111-8111-111111111111',
  goal: '직접 사상 캐시의 히트 조건',
  request_id: '22222222-2222-4222-8222-222222222222',
};

const session: Session = {
  id: '33333333-3333-4333-8333-333333333333',
  user_id: '44444444-4444-4444-8444-444444444444',
  folder_id: request.folder_id,
  goal: request.goal,
  status: 'active',
  started_at: '2026-11-13T00:00:00+00:00',
  ended_at: null,
};

Deno.test('공부 시작 목표의 공백을 제거하고 140자까지 허용한다', () => {
  const goal = '가'.repeat(140);
  const parsed = startSessionRequestSchema.parse({ ...request, goal: ` ${goal} ` });
  assert(parsed.goal === goal, '목표의 앞뒤 공백을 제거해야 한다.');
});

Deno.test('폴더와 재시도 ID, 비어 있지 않은 140자 이하 목표가 필요하다', () => {
  for (const body of [
    { ...request, folder_id: 'mock-folder' },
    { ...request, request_id: undefined },
    { ...request, request_id: 'invalid' },
    { ...request, goal: '   ' },
    { ...request, goal: '가'.repeat(141) },
  ]) {
    assert(!startSessionRequestSchema.safeParse(body).success, '잘못된 요청을 거부해야 한다.');
  }
});

Deno.test('범위 안 응답은 유효한 세션을 포함해야 한다', () => {
  const result = startSessionResponseSchema.parse({ status: 'in_scope', session });
  assert(result.status === 'in_scope' && result.session.id === session.id, '세션 ID를 반환해야 한다.');
  assert(!startSessionResponseSchema.safeParse({ status: 'in_scope' }).success, '세션이 누락됐다.');
  assert(!startSessionResponseSchema.safeParse({ status: 'in_scope', session: { ...session, id: 'mock' } }).success,
    '실제 형식의 세션이 필요하다.');
});

Deno.test('범위 밖과 구체화 필요는 안내 문구만 허용한다', () => {
  for (const status of ['out_of_scope', 'needs_clarification'] as const) {
    const response = { status, message: '지원 과목에서 목표를 골라 주세요.' };
    assert(startSessionResponseSchema.safeParse(response).success, '정상 안내를 허용해야 한다.');
    assert(!startSessionResponseSchema.safeParse({ ...response, session }).success, '안내에 세션을 포함할 수 없다.');
    assert(!startSessionResponseSchema.safeParse({ ...response, message: '  ' }).success, '안내 문구가 필요하다.');
  }
});

Deno.test('AI 실패는 공부 시작의 정상 응답에 포함되지 않는다', () => {
  const result = startSessionResponseSchema.safeParse({
    error: { code: 'AI_FAILED', message: '잠시 후 다시 시도해 주세요.' },
  });
  assert(!result.success, '기술 오류는 기존 오류 계약으로 처리해야 한다.');
});
