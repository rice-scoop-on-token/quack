import { useTempStore } from '@/api/mock/tempStore';
import { useDemoVariant } from '@/api/mock/useDemoVariant';

// mock에서 새 과목은 늘 0 XP라 아기 단계만 보인다. 주소 뒤에 ?demo=child, ?demo=adult를 붙여 다른 단계를 확인한다.
const DEMO_XP: Record<string, number> = {
  child: 150,
  adult: 300,
};

// 과목(캐릭터)의 누적 경험치
export function useCharacterXp(folderId: string): number {
  const { characterStats } = useTempStore();
  const demo = useDemoVariant();
  if (demo && demo in DEMO_XP) {
    return DEMO_XP[demo];
  }
  // QuackApi 교체 지점: character_stats에서 이 폴더의 한 줄을 읽는다.
  return characterStats.find((c) => c.folder_id === folderId)?.total_xp ?? 0;
}
