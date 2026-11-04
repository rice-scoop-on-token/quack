import { createTurnResponseSchema, type CreateTurnResponse, type ExplanationTurn } from '@quack/shared';

import type { ExplanationAnalysis, ExplanationVerdict, SessionTurn } from '@/api/tempContract';
import { josa } from '@/lib/josa';

// 설명 분석 mock(POST /sessions/:id/turns 의 분석 부분). 고정값이 아니라 시나리오로 판정을 바꿔 모든 분기를 화면에서 확인한다(CLAUDE.md).
// 분석 로직은 선생님(페르소나)과 상관없이 같다.

// 개념 하나에 대해 몇 번째 설명인지(0부터)에 따른 판정. 마지막 값이 계속 반복된다.
const SCENARIOS: Record<string, ExplanationVerdict[]> = {
  default: ['insufficient', 'insufficient', 'sufficient'],
  sufficient: ['sufficient'],
  ambiguous: ['ambiguous', 'sufficient'],
  // 계속 부족해서 꼬리 질문 한도에 걸린다
  stuck: ['insufficient'],
};

// 자료 분석이 없어서 mock 개념 이름을 순서대로 쓴다
const MOCK_CONCEPTS = ['핵심 정의', '사용 예시', '다른 개념과 비교'];

const FOLLOW_UP_QUESTIONS = [
  '이 개념이 왜 필요한지도 설명해 줄래?',
  '실제로 쓰이는 예를 하나 들어 줄래?',
  '반대 상황에서도 그 설명이 맞는지 말해 줄래?',
];

// 실제 STT는 개발 빌드 세팅 후 별도 커밋에서 붙인다
export const MOCK_TRANSCRIPT = '음, 제가 이해한 건 이 개념이 어떤 문제를 풀려고 생겼고, 보통 이런 상황에서 쓴다는 거예요.';

export function mockConcept(index: number): string {
  return MOCK_CONCEPTS[index] ?? `개념 ${index + 1}`;
}

export type AnalyzeRequest = {
  concept: string;
  text: string;
  trigger: ExplanationTurn['trigger'];
  // 이 개념에서 지금까지 한 꼬리 질문 수
  followUpCount: number;
  // 다음 주제로 제안할 개념(없으면 null)
  nextConcept: string | null;
  // ?demo= 값으로 시나리오를 고른다
  demo: string | null;
};

// 점검의 다시 설명하기(re_explain)는 시나리오의 마지막 판정을 쓴다(기본은 충분, stuck은 부족).
export function mockAnalysis(req: AnalyzeRequest): ExplanationAnalysis {
  const steps = SCENARIOS[req.demo ?? ''] ?? SCENARIOS.default;
  const step = req.trigger === 're_explain' ? steps.length - 1 : Math.min(req.followUpCount, steps.length - 1);
  const verdict = steps[step];
  const sufficient = verdict === 'sufficient';
  return {
    verdict,
    concept: req.concept,
    missing_concepts: sufficient ? [] : verdict === 'ambiguous' ? ['용어의 뜻'] : ['필요한 이유', '사용 예시'],
    follow_up_question: sufficient
      ? null
      : verdict === 'ambiguous'
        ? `방금 설명에서 '${req.concept}'${josa(req.concept, '이', '가')} 정확히 무엇을 가리키는지 다시 말해 줄래?`
        : FOLLOW_UP_QUESTIONS[Math.min(req.followUpCount, FOLLOW_UP_QUESTIONS.length - 1)],
    next_topic: sufficient ? req.nextConcept : null,
    follow_up_count: req.followUpCount,
  };
}

// 옛 mock 판정을 shared 응답(CreateTurnResponse) 모양으로 바꾼다. 타이머 화면의 explain이 쓴다.
// 점검·기록 화면은 옛 모양을 계속 쓰므로 mock 안에는 옛 모양으로 저장하고, 돌려줄 때만 바꾼다(이슈 #22).
// 부족·모호는 질문하고(ask), 충분은 질문 없이 마무리한다(acknowledge). 상태는 shared의 공개 조합 규칙을 따른다.
export function toCreateTurnResponse(
  turn: SessionTurn,
  meta: { id: string; sessionId: string; createdAt: string },
): CreateTurnResponse {
  const { analysis } = turn;
  const sufficient = analysis.verdict === 'sufficient';
  const response = sufficient
    ? {
        action: 'acknowledge' as const,
        message: `'${analysis.concept}'에 대한 설명이 잘 이어졌어. 고마워!`,
        question: null,
      }
    : {
        action: 'ask' as const,
        message: `'${analysis.concept}'에 대해 설명한 부분은 따라갔어. 한 가지만 더 듣고 싶어.`,
        question: analysis.follow_up_question ?? '조금 더 자세히 설명해 줄래?',
      };

  // mock 응답이 계약과 다르면 바로 알 수 있게 shared 스키마로 검사한다
  return createTurnResponseSchema.parse({
    turn: {
      id: meta.id,
      session_id: meta.sessionId,
      seq: turn.seq,
      trigger: turn.trigger,
      question_text: turn.question_text,
      input_mode: turn.input_mode,
      text: turn.text,
      created_at: meta.createdAt,
    },
    analysis: {
      answer_status: 'not_applicable',
      understanding_status: analysis.verdict,
      independent_performance_status: 'unverified',
      response,
    },
  });
}
