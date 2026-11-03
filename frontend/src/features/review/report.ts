import type { ExplanationVerdict, GrowthStage, StudySession, TempRewardGrant } from '@/api/tempContract';
import { growthFromXp } from '@/features/character/growth';
import { MAX_FOLLOW_UPS } from '@/features/session/machine';
import { josa } from '@/lib/josa';

// 리포트와 경험치는 서버가 만든다(createReport). 여기에는 서버가 준 판정을 화면에 맞게 모으는 함수만 둔다.

export const VERDICT_LABEL: Record<ExplanationVerdict, string> = {
  sufficient: '충분',
  insufficient: '부족',
  ambiguous: '모호',
};

// 한 번이라도 충분 판정을 받은 서로 다른 개념(점검의 다시 설명하기 포함)
export function understoodConcepts(session: StudySession): string[] {
  return [...new Set(session.turns.filter((t) => t.analysis.verdict === 'sufficient').map((t) => t.analysis.concept))];
}

// 보상으로 성장 단계가 바뀌었으면 이전·새 단계, 그대로면 null
export function stageChange(grant: TempRewardGrant): { from: GrowthStage; to: GrowthStage } | null {
  const from = growthFromXp(grant.xp_before).stage;
  const to = growthFromXp(grant.xp_after).stage;
  return from === to ? null : { from, to };
}

export type ReExplainItem = { concept: string; question: string };

// 점검의 다시 설명하기 블록: 충분 판정을 받지 못한 개념마다 마지막으로 보여 준 꼬리 질문 하나.
// 꼬리 질문 없이 넘어간 개념은 그 개념을 다시 설명해 달라는 질문으로 채운다.
export function reExplainItems(session: StudySession): ReExplainItem[] {
  const understood = understoodConcepts(session);
  const weak = [...new Set(session.turns.map((t) => t.analysis.concept))].filter((c) => !understood.includes(c));
  return weak.map((concept) => {
    // 꼬리 질문 한도에 걸린 분석은 상태 머신이 바로 공부로 돌아가서 그 질문이 화면에 나오지 않았다. 그래서 뺀다.
    const shown = session.turns.filter(
      (t) =>
        t.analysis.concept === concept &&
        t.analysis.follow_up_question !== null &&
        t.analysis.follow_up_count < MAX_FOLLOW_UPS,
    );
    return {
      concept,
      question:
        shown.at(-1)?.analysis.follow_up_question ??
        `'${concept}'${josa(concept, '을', '를')} 다시 내 말로 설명해 줄래?`,
    };
  });
}
