import type { ExplanationTurn } from '@quack/shared';

import type { ExplanationAnalysis, ExplanationVerdict } from '@/api/tempContract';
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
