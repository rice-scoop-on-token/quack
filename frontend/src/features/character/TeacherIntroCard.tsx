import type { Folder } from '@quack/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';

import { PERSONAS } from '@/api/mock/data/personas';
import { SPECIES } from '@/api/mock/data/species';
import type { PersonaLine, TeacherMotion } from '@/api/tempContract';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { growthFromXp } from '@/features/character/growth';
import { MOTION_LABEL } from '@/features/character/teacherMotion';
import { useCharacterXp } from '@/features/character/useCharacterXp';

// 반응 미리보기 탭: 말투와 그때의 모션 (프로토타입과 같은 짝)
const SCENES: { line: PersonaLine; label: string; motion: TeacherMotion }[] = [
  { line: 'idle', label: '먼저 질문', motion: 'reading' },
  { line: 'question', label: '꼬리 질문', motion: 'thinking' },
  { line: 'praise', label: '칭찬', motion: 'celebrate' },
];

type Props = {
  folder: Folder;
};

// T-01 선생님 소개 카드 (과목 상세 L-02 안). 선생님은 바꿀 수 없어서 변경 버튼은 없다.
export function TeacherIntroCard({ folder }: Props) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const { stage } = growthFromXp(useCharacterXp(folder.id));
  const persona = PERSONAS[folder.species_id];
  const speciesName = SPECIES.find((s) => s.id === folder.species_id)?.name;
  const scene = SCENES[sceneIndex];

  return (
    // 선생님 소개 카드
    <View style={styles.card}>
      {/* 카드 머리글과 성격 이름 */}
      <Text>선생님 성격</Text>
      <Text>
        {speciesName} · {persona.label}
      </Text>

      {/* 성격 태그 목록 */}
      <View style={styles.tags}>
        {persona.tags.map((tag) => (
          // 성격 태그
          <Text key={tag} style={styles.tag}>
            {tag}
          </Text>
        ))}
      </View>

      {/* 반응 미리보기 캐릭터 (현재 성장 단계) */}
      <View style={styles.center}>
        <CharacterBox speciesId={folder.species_id} stage={stage} motionLabel={MOTION_LABEL[scene.motion]} />
      </View>
      {/* 반응 미리보기 말풍선 */}
      <Text accessibilityLiveRegion="polite">{persona.lines[scene.line]}</Text>

      {/* 반응 미리보기 탭 */}
      <View style={styles.tabs} accessibilityRole="tablist">
        {SCENES.map((s, i) => (
          // 반응 미리보기 탭 버튼
          <Pressable
            key={s.line}
            style={[styles.tab, i === sceneIndex && styles.selected]}
            onPress={() => setSceneIndex(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: i === sceneIndex }}
          >
            <Text>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 미리보기 안내 */}
      <Text>반응 미리보기는 지금 성장 단계의 모습이에요. 성격에 따라 말투와 반응이 달라져요.</Text>

      {/* 반응 모션 보기 버튼 */}
      <Button
        title="반응 모션 보기"
        onPress={() => router.push({ pathname: '/subjects/[id]/motions', params: { id: folder.id } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
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
  center: {
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
  },
  // 고른 탭 강조 (임시 스타일, 선생님 선택 카드와 같은 방식)
  selected: {
    borderWidth: 3,
  },
});
