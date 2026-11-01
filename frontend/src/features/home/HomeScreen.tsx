import { router } from 'expo-router';
import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import { useTempStore } from '@/api/mock/tempStore';
import { CharacterGrowth } from '@/features/character/CharacterGrowth';
import { SubjectCard } from '@/features/folder/SubjectCard';
import { SubjectSelect } from '@/features/folder/SubjectSelect';

// H-01 홈
export function HomeScreen() {
  const { displayName, folders } = useTempStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 고른 과목이 지워졌거나 아직 고르지 않았으면 첫 과목을 보여 준다
  const selected = folders.find((f) => f.id === selectedId) ?? folders[0];

  if (!selected) {
    return (
      <View style={styles.empty}>
        {/* 과목 없음 안내 */}
        <Text>함께 공부할 과목이 없어요. 첫 과목부터 만들어 볼까요?</Text>
        {/* 과목 만들기 버튼 */}
        <Button title="과목 만들기" onPress={() => router.push('/subjects/new')} />
      </View>
    );
  }

  const speciesName = SPECIES.find((s) => s.id === selected.species_id)?.name;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 오늘 함께할 과목 선택 */}
      <Text>오늘 함께할 과목</Text>
      {/* 과목 선택 바 */}
      <SubjectSelect folders={folders} value={selected} onChange={(f) => setSelectedId(f.id)} />

      {/* 인사 문구 */}
      <Text>나의 작은 공부 습관</Text>
      <Text>{displayName}님, 오늘도 한 걸음 함께 자라볼까?</Text>

      {/* 고른 과목의 캐릭터와 성장 표시 */}
      <CharacterGrowth folder={selected} />

      {/* 공부 시작 버튼 (공부 준비 화면은 다음 커밋에서 만든다) */}
      <Button title={`${speciesName}와 공부 시작 (준비 중)`} disabled onPress={() => {}} />

      {/* 과목별 선생님 제목과 전체 보기 버튼 */}
      <View style={styles.row}>
        <Text>과목별 선생님</Text>
        <Button title="전체 보기" onPress={() => router.push('/subjects')} />
      </View>
      {/* 과목별 선생님 목록 (누르면 그 과목으로 공부 준비에 들어간다. 공부 준비는 다음 커밋에서 만든다) */}
      {folders.map((f) => (
        <SubjectCard key={f.id} folder={f} detail="새로운 공부를 시작해요" />
      ))}

      {/* 추가 기능 버튼 (2·3차 화면) */}
      <View style={styles.row}>
        {/* AI 팟캐스트 버튼 */}
        <Button title="AI 팟캐스트 (준비 중)" disabled onPress={() => {}} />
        {/* 오늘의 퀴즈 버튼 */}
        <Button title="오늘의 퀴즈 (준비 중)" disabled onPress={() => {}} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 24,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
