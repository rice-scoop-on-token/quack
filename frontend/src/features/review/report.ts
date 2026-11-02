import type { Report } from '@quack/shared';

import type { ExplanationVerdict, GrowthStage, StudySession, TempRewardGrant } from '@/api/tempContract';
import { growthFromXp } from '@/features/character/growth';

export const VERDICT_LABEL: Record<ExplanationVerdict, string> = {
  sufficient: '충분',
  insufficient: '부족',
  ambiguous: '모호',
};

// 세션 리포트 내용. shared Report에서 서버가 채우는 칸(id, session_id, summary, created_at)을 뺐다.
export type SessionReport = Pick<
  Report,
  'covered_concepts' | 'weak_concepts' | 'duration_seconds' | 'turn_count' | 'quiz_correct' | 'quiz_total'
>;

// 세션 기록으로 리포트를 만든다. QuackApi 교체 지점: POST /sessions/:id/report 응답의 report로 바뀐다.
// 이해한 개념: 한 번이라도 충분 판정을 받은 개념(점검의 다시 설명하기 포함)
// 보완할 개념: 다뤘지만 충분 판정을 받지 못한 개념(꼬리 질문 한도·넘어가기로 넘어간 개념 포함)
export function buildReport(session: StudySession): SessionReport {
  const concepts = [...new Set(session.turns.map((t) => t.analysis.concept))];
  const covered = concepts.filter((c) =>
    session.turns.some((t) => t.analysis.concept === c && t.analysis.verdict === 'sufficient'),
  );
  return {
    covered_concepts: covered,
    weak_concepts: concepts.filter((c) => !covered.includes(c)),
    duration_seconds: session.study_seconds,
    turn_count: session.turns.length,
    quiz_correct: session.quiz?.correct_count ?? null,
    quiz_total: session.quiz?.total_count ?? null,
  };
}

// 세션 보상 경험치. BE와 확정 필요. 지금 규칙(세션 완료 20 + 충분 판정 개념마다 10 + 퀴즈 정답마다 5)은 FE 임시값이다.
const XP_RULE = { session: 20, perConcept: 10, perQuizCorrect: 5 } as const;

export function rewardXp(report: SessionReport): number {
  return (
    XP_RULE.session +
    XP_RULE.perConcept * report.covered_concepts.length +
    XP_RULE.perQuizCorrect * (report.quiz_correct ?? 0)
  );
}

// 보상으로 성장 단계가 바뀌었으면 이전·새 단계, 그대로면 null
export function stageChange(grant: TempRewardGrant): { from: GrowthStage; to: GrowthStage } | null {
  const from = growthFromXp(grant.xp_before).stage;
  const to = growthFromXp(grant.xp_after).stage;
  return from === to ? null : { from, to };
}

export type ReExplainItem = { concept: string; question: string };

// 점검의 다시 설명하기 블록 목록: 보완할 개념마다 마지막으로 받은 꼬리 질문 하나.
// 꼬리 질문 없이 넘어간 개념은 그 개념을 다시 설명해 달라는 질문으로 채운다.
export function reExplainItems(session: StudySession): ReExplainItem[] {
  return buildReport(session).weak_concepts.map((concept) => {
    const asked = session.turns.filter((t) => t.analysis.concept === concept && t.analysis.follow_up_question);
    return {
      concept,
      question: asked.at(-1)?.analysis.follow_up_question ?? `'${concept}'을 다시 내 말로 설명해 줄래?`,
    };
  });
}
