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
        {/* 과목 없음 안내 */}
        <Text>함께 공부할 과목이 없어요. 첫 과목부터 만들어 볼까요?</Text>
        {/* 과목 만들기 버튼 */}
        <Button title="과목 만들기" onPress={() => router.push('/subjects/new')} />
      </View>
    );
  }

  const speciesName = SPECIES.find((s) => s.id === selected.species_id)?.name ?? '';

  return (
    // 위쪽은 스크롤되고, 공부 시작과 추가 기능 버튼은 하단 탭 바로 위에 고정된다
    <BottomActionLayout
      inTab
      actions={
        <>
          {/* 공부 시작 버튼 (고른 과목으로 공부 준비에 들어간다) */}
          <Button title={`${speciesName}${josa(speciesName, '과', '와')} 공부 시작`} onPress={() => router.push('/session/setup')} />

          {/* 추가 기능 버튼 (2·3차 화면) */}
          <View style={styles.row}>
            {/* AI 팟캐스트 버튼 */}
            <Button title="AI 팟캐스트 (준비 중)" disabled onPress={() => {}} />
            {/* 오늘의 퀴즈 버튼 */}
            <Button title="오늘의 퀴즈 (준비 중)" disabled onPress={() => {}} />
          </View>
        </>
      }
    >
      {/* 오늘 함께할 과목 선택 */}
      <Text>오늘 함께할 과목</Text>
      {/* 과목 선택 바 */}
      <SubjectSelect folders={folders} value={selected} onChange={(f) => setSelectedFolderId(f.id)} />

      {/* 인사 문구 */}
      <Text>나의 작은 공부 습관</Text>
      <Text>{displayName}님, 오늘도 한 걸음 함께 자라볼까?</Text>

      {/* 고른 과목의 캐릭터와 성장 표시 */}
      <CharacterGrowth folder={selected} />

      {/* 오늘의 학습 기록 (성장 표시 아래부터 하단 버튼 위까지가 기록 영역이다. 디자인 예정) */}
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
