import type { Folder } from '@quack/shared';
import { StyleSheet, Text, View } from 'react-native';

import { PERSONAS } from '@/api/mock/data/personas';
import { SPECIES } from '@/api/mock/data/species';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { growthFromXp } from '@/features/character/growth';
import { useCharacterXp } from '@/features/character/useCharacterXp';

type Props = {
  folder: Folder;
  // 과목 상세(L-02)는 아래에 성장 표시가 따로 있어서 그림을 넣지 않는다
  showCharacter?: boolean;
};

// 과목 선생님 요약(과목 선생님 · 동물, 캐릭터, 성격, 태그). 과목 상세(L-02)와 공부 준비(S-01)에서 같이 쓴다.
export function TeacherSummary({ folder, showCharacter = false }: Props) {
  const species = SPECIES.find((s) => s.id === folder.species_id);
  const persona = PERSONAS[folder.species_id];
  const xp = useCharacterXp(folder.id);

  return (
    <View style={styles.card}>
      <Text>
        {folder.name} 선생님 · {species?.name}
      </Text>
      {showCharacter ? (
        <View style={styles.character}>
          <CharacterBox
            speciesId={folder.species_id}
            stage={xp === undefined ? undefined : growthFromXp(xp).stage}
            size={120}
          />
        </View>
      ) : null}
      <Text>{persona.label}</Text>
      <View style={styles.tags}>
        {persona.tags.map((tag) => (
          <Text key={tag} style={styles.tag}>
            {tag}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    padding: 12,
    borderWidth: 1,
  },
  character: {
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
});
