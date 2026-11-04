import type { Folder } from '@quack/shared';
import { StyleSheet, Text, View } from 'react-native';

import { CharacterBox } from '@/components/ui/CharacterBox';
import type { CharacterAction } from '@/features/character/characterAssets';
import { growthFromXp } from '@/features/character/growth';
import { useCharacterXp } from '@/features/character/useCharacterXp';

type Props = {
  folder: Folder;
  action: CharacterAction;
};

// 과목 캐릭터와 성장 표시. 홈(H-01)과 과목 상세(L-02)에서 같이 쓴다.
export function CharacterGrowth({ folder, action }: Props) {
  const xp = useCharacterXp(folder.id);
  // 불러오는 중에도 같은 자리를 잡아 둬서, 다 불러왔을 때 아래 요소가 밀리지 않게 한다
  const growth = xp === undefined ? undefined : growthFromXp(xp);
  const progress = growth?.progress ?? 0;

  return (
    <View style={styles.container}>
      <CharacterBox speciesId={folder.species_id} stage={growth?.stage} size={140} action={action} />

      <Text>
        {!growth
          ? ' '
          : growth.xpToNext === null
            ? '다 자랐어요! 앞으로도 함께 공부해요.'
            : `다음 단계까지 ${growth.xpToNext} XP`}
      </Text>

      <View
        style={styles.bar}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      >
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    alignSelf: 'stretch',
    height: 12,
    borderWidth: 1,
  },
  // 채운 부분이 보이도록 임시 배경색 하나만 둔다. 디자인 작업 때 바꾼다.
  fill: {
    height: '100%',
    backgroundColor: '#888',
  },
});
