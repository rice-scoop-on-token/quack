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
            style={[styles.card, selected && styles.selected]}
            onPress={() => onChange(species.id)}
            // radio 역할로 누를 수 있는 선택지임을, checked로 지금 선택됐는지를 알린다
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
          >
            {/* 선택 화면은 성체 모습으로 보여 준다 */}
            <CharacterBox speciesId={species.id} stage="adult" size={72} />
            {/* 동물 이름과 소개 */}
            <View style={styles.text}>
              <Text>{species.name}</Text>
              <Text>{species.description}</Text>
            </View>
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
  // 선택된 카드 강조 (임시 스타일, 디자인 작업 때 바꾼다)
  selected: {
    borderWidth: 3,
  },
  text: {
    flex: 1,
    gap: 4,
  },
});
