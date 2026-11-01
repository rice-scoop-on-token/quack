import type { SpeciesId } from '@quack/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import { CharacterBox } from '@/components/ui/CharacterBox';

type Props = {
  value: SpeciesId;
  onChange: (value: SpeciesId) => void;
};

// 선생님 동물 선택. 온보딩(O-02)과 과목 추가에서만 쓴다. 고른 뒤에는 바꿀 수 없다.
export function SpeciesPicker({ value, onChange }: Props) {
  return (
    // 동물 선택 카드 목록
    <View style={styles.list}>
      {SPECIES.map((species) => {
        const selected = species.id === value;
        return (
          // 동물 선택 카드
          <Pressable
            key={species.id}
            style={styles.card}
            onPress={() => onChange(species.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            {/* 선택 화면은 성체 모습으로 보여 준다 */}
            <CharacterBox speciesId={species.id} stage="adult" size={72} />
            {/* 동물 이름과 소개 */}
            <View style={styles.text}>
              <Text>{species.name}</Text>
              <Text>{species.description}</Text>
            </View>
            {/* 선택 표시 */}
            <Text>{selected ? '●' : '○'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
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
