import type { Folder } from '@quack/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { growthFromXp } from '@/features/character/growth';
import { useCharacterXp } from '@/features/character/useCharacterXp';

type Props = {
  folder: Folder;
  detail: string;
  // 없으면 아직 만들지 않은 화면으로 가는 카드라 누를 수 없게 하고 "준비 중"을 붙인다.
  onPress?: () => void;
};

// 과목 카드. 홈의 과목별 선생님 목록과 과목 서랍(L-01)에서 같이 쓴다.
export function SubjectCard({ folder, detail, onPress }: Props) {
  const species = SPECIES.find((s) => s.id === folder.species_id);
  const { stage } = growthFromXp(useCharacterXp(folder.id));

  return (
    // 과목 카드
    <Pressable
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
    >
      {/* 선생님 캐릭터 */}
      <CharacterBox speciesId={folder.species_id} stage={stage} size={56} />
      {/* 과목 이름과 선생님 설명 */}
      <View style={styles.text}>
        <Text>
          {folder.name} · {species?.name} 선생님
        </Text>
        <Text>
          {species?.description} · {detail}
        </Text>
      </View>
      {/* 이동 표시 */}
      <Text>{onPress ? '›' : '준비 중'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    gap: 4,
  },
});
