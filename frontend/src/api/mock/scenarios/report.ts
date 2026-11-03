import type { Report } from '@quack/shared';

import type { StudySession } from '@/api/tempContract';

// 리포트와 보상 경험치 mock(POST /sessions/:id/report 역할). 클라이언트를 믿으면 안 되는 계산이라 서버가 맡는다.

// shared Report에서 저장할 때 채우는 칸(id, session_id, summary, created_at)을 뺀 내용
type ReportContent = Pick<
  Report,
  'covered_concepts' | 'weak_concepts' | 'duration_seconds' | 'turn_count' | 'quiz_correct' | 'quiz_total'
>;

// 이해한 개념: 한 번이라도 충분 판정을 받은 개념(점검의 다시 설명하기 포함)
// 보완할 개념: 다뤘지만 충분 판정을 받지 못한 개념(꼬리 질문 한도·넘어가기로 넘어간 개념 포함)
export function buildReport(session: StudySession): ReportContent {
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

// 미정(CLAUDE.md 경험치 지급 양), BE와 확정 필요. 지금 값은 FE 임시값이다.
const XP_RULE = { session: 20, perConcept: 10, perQuizCorrect: 5 } as const;

export function rewardXp(report: ReportContent): number {
  return (
    XP_RULE.session +
    XP_RULE.perConcept * report.covered_concepts.length +
    XP_RULE.perQuizCorrect * (report.quiz_correct ?? 0)
  );
}
