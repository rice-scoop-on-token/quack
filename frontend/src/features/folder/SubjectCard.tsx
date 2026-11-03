import type { Folder } from '@quack/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { growthFromXp } from '@/features/character/growth';
import { useCharacterXp } from '@/features/character/useCharacterXp';

type Props = {
  folder: Folder;
  detail: string;
  onPress: () => void;
};

// 과목 카드. 과목 서랍(L-01)에서 쓴다.
export function SubjectCard({ folder, detail, onPress }: Props) {
  const species = SPECIES.find((s) => s.id === folder.species_id);
  const { stage } = growthFromXp(useCharacterXp(folder.id) ?? 0);

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <CharacterBox speciesId={folder.species_id} stage={stage} size={56} />
      <View style={styles.text}>
        <Text>
          {folder.name} · {species?.name} 선생님
        </Text>
        <Text>
          {species?.description} · {detail}
        </Text>
      </View>
      <Text>›</Text>
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
