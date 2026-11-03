import { router } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import { useTempStore } from '@/api/mock/tempStore';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { CharacterGrowth } from '@/features/character/CharacterGrowth';
import { SubjectSelect } from '@/features/folder/SubjectSelect';
import { TodayStats } from '@/features/home/TodayStats';
import { josa } from '@/lib/josa';

// H-01 홈
export function HomeScreen() {
  // 고른 과목은 공부 준비 화면과 같이 쓰도록 tempStore에 둔다
  const { displayName, folders, selectedFolder: selected, setSelectedFolderId } = useTempStore();

  if (!selected) {
    return (
      <View style={styles.empty}>
        <Text>함께 공부할 과목이 없어요. 첫 과목부터 만들어 볼까요?</Text>
        <Button title="과목 만들기" onPress={() => router.push('/subjects/new')} />
      </View>
    );
  }

  const speciesName = SPECIES.find((s) => s.id === selected.species_id)?.name ?? '';

  return (
    <BottomActionLayout
      inTab
      actions={
        <>
          <Button title={`${speciesName}${josa(speciesName, '과', '와')} 공부 시작`} onPress={() => router.push('/session/setup')} />

          <View style={styles.row}>
            <Button title="AI 팟캐스트 (준비 중)" disabled onPress={() => {}} />
            <Button title="오늘의 퀴즈 (준비 중)" disabled onPress={() => {}} />
          </View>
        </>
      }
    >
      <Text>오늘 함께할 과목</Text>
      <SubjectSelect folders={folders} value={selected} onChange={(f) => setSelectedFolderId(f.id)} />

      <Text>나의 작은 공부 습관</Text>
      <Text>{displayName}님, 오늘도 한 걸음 함께 자라볼까?</Text>

      <CharacterGrowth folder={selected} />

      {/* 디자인 예정: 성장 표시 아래부터 하단 버튼 위까지가 오늘의 학습 기록 영역이다 */}
      <TodayStats />
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
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
