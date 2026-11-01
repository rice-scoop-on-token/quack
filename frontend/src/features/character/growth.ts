import { STAGE_XP, type GrowthStage } from '@/api/tempContract';

export type Growth = {
  stage: GrowthStage;
  // 다음 단계까지 남은 경험치. 다 자랐으면(adult) null
  xpToNext: number | null;
  // 지금 단계 안에서 다음 단계까지 채운 비율(0~1). 다 자랐으면 1
  progress: number;
};

// 과목(캐릭터)별 누적 경험치로 성장 단계를 구한다. 레벨은 쓰지 않는다.
export function growthFromXp(totalXp: number): Growth {
  const xp = Math.max(0, totalXp);
  if (xp >= STAGE_XP.adult) {
    return { stage: 'adult', xpToNext: null, progress: 1 };
  }
  if (xp >= STAGE_XP.child) {
    return {
      stage: 'child',
      xpToNext: STAGE_XP.adult - xp,
      progress: (xp - STAGE_XP.child) / (STAGE_XP.adult - STAGE_XP.child),
    };
  }
  return { stage: 'baby', xpToNext: STAGE_XP.child - xp, progress: xp / STAGE_XP.child };
}
