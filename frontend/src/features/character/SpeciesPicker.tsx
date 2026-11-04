import type { SpeciesId } from '@quack/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { COLORS, PAPER } from '@/theme/assetTokens';
import { SPECIES } from '@/api/mock/data/species';
import { CharacterBox } from '@/components/ui/CharacterBox';

type Props = {
  value: SpeciesId;
  onChange: (value: SpeciesId) => void;
};

// 선생님 동물 선택. 온보딩(O-02)과 과목 추가에서만 쓴다. 고른 뒤에는 바꿀 수 없다.
export function SpeciesPicker({ value, onChange }: Props) {
  return (
    <View style={styles.list}>
      {SPECIES.map((species) => {
        const selected = species.id === value;
        return (
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
            <Text style={styles.text}>{species.name}</Text>
            <Text style={styles.text}>{species.description}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // 카드 3장을 가로로 나눠 놓는다
  list: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    ...PAPER.card,
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  // 고른 카드는 주요색으로 칠한다(테두리 두께를 바꾸지 않아 카드 안 글이 다시 줄바꿈되지 않는다)
  selected: {
    backgroundColor: COLORS.primary,
  },
  text: {
    textAlign: 'center',
  },
});
