import type { Folder } from '@quack/shared';
import { StyleSheet, Text, View } from 'react-native';

import { PERSONAS } from '@/api/mock/data/personas';
import { SPECIES } from '@/api/mock/data/species';

type Props = {
  folder: Folder;
};

// 과목 선생님 요약(과목 선생님 · 동물, 성격, 태그). 과목 상세(L-02)와 공부 준비(S-01)에서 같이 쓴다.
export function TeacherSummary({ folder }: Props) {
  const species = SPECIES.find((s) => s.id === folder.species_id);
  const persona = PERSONAS[folder.species_id];

  return (
    // 선생님 요약 카드
    <View style={styles.card}>
      <Text>
        {folder.name} 선생님 · {species?.name}
      </Text>
      <Text>{persona.label}</Text>
      {/* 성격 태그 목록 */}
      <View style={styles.tags}>
        {persona.tags.map((tag) => (
          // 성격 태그
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
