// 저장소 루트: deno test --no-lock --config backend/supabase/functions/api/deno.json shared/tests/createTurnResponse.test.ts
import { createTurnRequestSchema, createTurnResponseSchema } from '../src/index.ts';
import type { CreateTurnResponse } from '../src/index.ts';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function sample(): CreateTurnResponse {
  return {
    turn: {
      id: '11111111-1111-4111-8111-111111111111',
      session_id: '22222222-2222-4222-8222-222222222222',
      seq: 1, trigger: 'self', question_text: null, input_mode: 'chat',
      text: '정렬된 배열에서 가운데 값과 비교해.',
      created_at: '2026-11-03T00:00:00+00:00',
    },
    analysis: {
      answer_status: 'not_applicable',
      understanding_status: 'unverified',
      independent_performance_status: 'unverified',
      response: {
        action: 'ask',
        message: '가운데 값과 비교하는 데까지는 따라왔어.',
        question: '비교한 뒤에는 어떻게 이어지는 거야?',
      },
    },
  };
}

Deno.test('네 가지 행동에서 질문 대기와 대화 마무리를 표현한다', () => {
  const cases: CreateTurnResponse['analysis'][] = [
    { ...sample().analysis, understanding_status: 'insufficient' },
    {
      ...sample().analysis,
      response: { action: 'explain', message: '잠깐, 나도 정리해볼게.', question: '네 말로 다시 설명해 줄래?' },
    },
    {
      ...sample().analysis, answer_status: 'incorrect', understanding_status: 'sufficient',
      response: { action: 'correct', message: '흐름은 이해됐어. 11-12는 -1이야.', question: null },
    },
    {
      ...sample().analysis, understanding_status: 'sufficient',
      response: { action: 'acknowledge', message: '정렬 덕분에 한쪽을 제외할 수 있는 거구나.', question: null },
    },
  ];
  for (const analysis of cases) {
    const parsed = createTurnResponseSchema.parse({ ...sample(), analysis });
    assert(parsed.analysis.response.action === analysis.response.action, '행동이 바뀜');
    assert(parsed.analysis.response.question === analysis.response.question, '질문이 바뀜');
  }
});

Deno.test('답의 정오와 이해, 독립 수행의 모든 상태를 강제 변환 없이 보존한다', () => {
  for (const answer_status of ['correct', 'incorrect', 'not_applicable', 'unverified'] as const) {
    const parsed = createTurnResponseSchema.parse({
      ...sample(), analysis: { ...sample().analysis, answer_status },
    });
    assert(parsed.analysis.answer_status === answer_status, '답 상태가 바뀜');
  }
  for (const understanding_status of ['sufficient', 'insufficient', 'ambiguous', 'unverified'] as const) {
    const response = understanding_status === 'sufficient'
      ? { action: 'acknowledge', message: '이해됐어.', question: null }
      : sample().analysis.response;
    const parsed = createTurnResponseSchema.parse({
      ...sample(), analysis: { ...sample().analysis, understanding_status, response },
    });
    assert(parsed.analysis.understanding_status === understanding_status, '이해 상태가 바뀜');
  }
  for (const independent_performance_status of ['confirmed', 'unverified'] as const) {
    const parsed = createTurnResponseSchema.parse({
      ...sample(), analysis: { ...sample().analysis, independent_performance_status },
    });
    assert(parsed.analysis.independent_performance_status === independent_performance_status, '독립 수행 상태가 바뀜');
  }
});

Deno.test('정확한 해설 반복의 인정이 독립 수행 확인으로 바뀌지 않는다', () => {
  const parsed = createTurnResponseSchema.parse({
    ...sample(),
    analysis: {
      ...sample().analysis, answer_status: 'correct', understanding_status: 'sufficient',
      response: { action: 'acknowledge', message: '지금 정리한 연결은 맞아.', question: null },
    },
  });
  assert(parsed.analysis.independent_performance_status === 'unverified', '독립 수행이 임의 확정됨');
});

Deno.test('질문 없는 미확인 인정도 충분으로 바꾸지 않는다', () => {
  const parsed = createTurnResponseSchema.parse({
    ...sample(),
    analysis: {
      ...sample().analysis,
      response: { action: 'acknowledge', message: '지금 말한 내용은 따라왔어.', question: null },
    },
  });
  assert(parsed.analysis.understanding_status === 'unverified', '이해 미확인이 바뀜');
});

Deno.test('실제 본문과 질문의 공백·줄바꿈을 그대로 보존한다', () => {
  const response = { action: 'ask', message: '  따라가 봤어.\n그런데 여기서 막혔어.  ', question: '  이 연결은 어떻게 이해하면 돼?\n' };
  const parsed = createTurnResponseSchema.parse({
    ...sample(), analysis: { ...sample().analysis, response },
  });
  assert(parsed.analysis.response.message === response.message, '본문이 변환됨');
  assert(parsed.analysis.response.question === response.question, '질문이 변환됨');
});

Deno.test('내부 근거·오류·개념·사용량·보상 필드는 공개 응답에서 제거한다', () => {
  const original = sample();
  const parsed = createTurnResponseSchema.parse({
    ...original,
    usage: { input_tokens: 100 }, rewards: { xp: 99 },
    turn: { ...original.turn, user_id: '서버 내부 값' },
    analysis: {
      ...original.analysis,
      reason: '내부 판단 근거', omissions: [], errors: [], confirmed_concepts: [],
      independent_performance: { scope: '내부 범위', assistance: [] },
      response: { ...original.analysis.response, private_reason: '내부 값' },
    },
  });
  assert(canonicalJson(parsed) === canonicalJson(original), '내부 필드가 공개되거나 공개 값이 바뀜');
});

Deno.test('질문과 행동, 이해·독립 수행의 잘못된 조합을 거절한다', () => {
  const original = sample();
  const invalid = [
    { ...original.analysis, response: { ...original.analysis.response, question: null } },
    { ...original.analysis, response: { action: 'explain', message: '정리해볼게.', question: null } },
    { ...original.analysis, response: { action: 'correct', message: '고쳤어.', question: '다시 풀래?' } },
    { ...original.analysis, understanding_status: 'sufficient', response: { action: 'acknowledge', message: '이해됐어.', question: '다음은?' } },
    { ...original.analysis, understanding_status: 'sufficient' },
    { ...original.analysis, response: { action: 'correct', message: '고쳤어.', question: null } },
    ...(['insufficient', 'ambiguous'] as const).map((understanding_status) => ({
      ...original.analysis, understanding_status,
      response: { action: 'acknowledge', message: '이해됐어.', question: null },
    })),
    { ...original.analysis, understanding_status: 'sufficient', response: { action: 'explain', message: '정리해볼게.', question: '다시 설명해줄래?' } },
    { ...original.analysis, independent_performance_status: 'confirmed', response: { action: 'explain', message: '정리해볼게.', question: '다시 설명해줄래?' } },
  ];
  for (const analysis of invalid) {
    assert(!createTurnResponseSchema.safeParse({ ...original, analysis }).success, '잘못된 조합을 허용함');
  }
});

Deno.test('빈 발화·누락된 필드·모르는 상태와 mock 응답을 성공으로 받지 않는다', () => {
  const original = sample();
  const { question: _question, ...withoutQuestion } = original.analysis.response;
  const { independent_performance_status: _independent, ...withoutIndependent } = original.analysis;
  const invalid: unknown[] = [
    { ...original, analysis: { ...original.analysis, response: { ...original.analysis.response, message: ' \n ' } } },
    { ...original, analysis: { ...original.analysis, response: { ...original.analysis.response, question: ' \t ' } } },
    { ...original, analysis: { ...original.analysis, response: withoutQuestion } },
    { ...original, analysis: withoutIndependent },
    { ...original, analysis: { ...original.analysis, answer_status: 'unknown' } },
    { ...original, analysis: { ...original.analysis, understanding_status: 'unknown' } },
    { ...original, analysis: { ...original.analysis, independent_performance_status: 'mastered' } },
    { ...original, analysis: { ...original.analysis, response: { ...original.analysis.response, action: 'finish_session' } } },
    { ...original, turn: { ...original.turn, session_id: 'mock-session' } },
    { ...original, turn: { ...original.turn, seq: 0 } },
    { ...original, analysis: { verdict: 'sufficient', concept: '개념', missing_concepts: [], follow_up_question: null } },
    { error: { code: 'AI_FAILED', message: '답변을 만들지 못했어요.' } },
  ];
  for (const value of invalid) {
    assert(!createTurnResponseSchema.safeParse(value).success, '잘못된 응답을 성공으로 허용함');
  }
});

Deno.test('기존 설명 제출 요청과 나중의 음성 전사 입력 경로를 유지한다', () => {
  for (const input_mode of ['chat', 'voice'] as const) {
    const request = { trigger: 'self', input_mode, text: '전달할 텍스트', question_text: null };
    assert(canonicalJson(createTurnRequestSchema.parse(request)) === canonicalJson(request), '기존 요청이 바뀜');
  }
});
