import { type Growth, growthFromXp } from '@/features/character/growth';

// 성장 직후 경험치 게이지 값. 서버가 준 지급 후 누적 경험치(xp_after)로만 계산하고 값을 만들지 않는다.
// 숫자가 아니면 null이라 게이지를 그리지 않는다.
// 경계: 100은 어린이 0%, 300은 어른 100%(다음 단계 없음), 음수는 0으로 본다.
export function growthGauge(xpAfter: number): Growth | null {
  return Number.isFinite(xpAfter) ? growthFromXp(xpAfter) : null;
}
