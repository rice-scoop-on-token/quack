// 레벨 n에서 n+1로 오르려면 XP_STEP × n 만큼의 경험치가 필요하다.
// 레벨 곡선은 팀 결정(D23) 전이라 추천안 기준이다. 결정되면 이 상수와 식만 바꾼다.
export const XP_STEP = 100;

export type LevelInfo = {
  level: number;
  xp_into_level: number;
  xp_for_next: number;
};

// 레벨은 폴더(캐릭터)별 경험치로 계산한다. 사용자 전체 레벨은 없다.
// 서버(보상 지급 전후 레벨)와 앱(경험치 바)이 같은 식을 쓰도록 shared에 둔다.
export function levelFromXp(total_xp: number): LevelInfo {
  let remaining = Number.isFinite(total_xp) ? Math.max(0, Math.floor(total_xp)) : 0;
  let level = 1;

  while (remaining >= XP_STEP * level) {
    remaining -= XP_STEP * level;
    level += 1;
  }

  return { level, xp_into_level: remaining, xp_for_next: XP_STEP * level };
}
