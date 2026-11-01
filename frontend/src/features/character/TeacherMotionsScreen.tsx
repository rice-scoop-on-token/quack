import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PERSONAS } from '@/api/mock/data/personas';
import { useTempStore } from '@/api/mock/tempStore';
import type { TeacherMotion } from '@/api/tempContract';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { growthFromXp } from '@/features/character/growth';
import { MOTION_LABEL, MOTION_LINE } from '@/features/character/teacherMotion';
import { useCharacterXp } from '@/features/character/useCharacterXp';

const MOTIONS = Object.keys(MOTION_LABEL) as TeacherMotion[];

// T-02 반응 모션 미리보기. 고른 모션은 이 화면 안에서만 기억한다.
export function TeacherMotionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { folders } = useTempStore();
  const folder = folders.find((f) => f.id === id);
  const [motion, setMotion] = useState<TeacherMotion>('reading');
  const { stage } = growthFromXp(useCharacterXp(id));

  if (!folder) {
    return (
      <View style={styles.container}>
        {/* 과목 없음 안내 (주소로 바로 들어오거나 새로고침한 경우) */}
        <Text>과목을 찾을 수 없어요.</Text>
        {/* 과목 서랍으로 가는 버튼 */}
        <Button title="과목 서랍으로" onPress={() => router.dismissTo('/subjects')} />
      </View>
    );
  }

  const persona = PERSONAS[folder.species_id];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 화면 제목 */}
      <Text>같이 공부하는, 살아 있는 반응.</Text>

      {/* 모션 미리보기 영역 */}
      <View style={styles.theater}>
        {/* 지금 모션 이름 */}
        <Text>{MOTION_LABEL[motion]}</Text>
        {/* 캐릭터 박스 (모션 이름 표시) */}
        <CharacterBox speciesId={folder.species_id} stage={stage} size={180} motionLabel={MOTION_LABEL[motion]} />
        {/* 말풍선 */}
        <Text accessibilityLiveRegion="polite">{persona.lines[MOTION_LINE[motion]]}</Text>
      </View>

      {/* 모션 선택 목록 */}
      <View style={styles.picker} accessibilityRole="radiogroup">
        {MOTIONS.map((m) => (
          // 모션 선택 버튼
          <Pressable
            key={m}
            style={[styles.option, m === motion && styles.selected]}
            onPress={() => setMotion(m)}
            accessibilityRole="radio"
            accessibilityState={{ checked: m === motion }}
          >
            <Text>{MOTION_LABEL[m]}</Text>
          </Pressable>
        ))}
      </View>

      {/* 실제 대화 안내 카드 */}
      <View style={styles.card}>
        <Text>실제 대화에서는 자동으로</Text>
        <Text>공부 중 책 읽기 → 답변에 놀람 → 꼬리 질문을 생각 → 이해하면 기뻐하기</Text>
      </View>

      {/* 공부하며 반응 체험하기 버튼 (공부 준비 화면은 다음 커밋에서 만든다) */}
      <Button title="공부하며 반응 체험하기 (준비 중)" disabled onPress={() => {}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 24,
  },
  theater: {
    alignItems: 'center',
    gap: 8,
  },
  picker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    padding: 8,
    borderWidth: 1,
  },
  // 고른 모션 강조 (임시 스타일, 선생님 선택 카드와 같은 방식)
  selected: {
    borderWidth: 3,
  },
  card: {
    gap: 4,
    padding: 12,
    borderWidth: 1,
  },
});
