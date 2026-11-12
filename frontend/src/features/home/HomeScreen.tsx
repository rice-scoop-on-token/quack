import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LoadingView } from '@/components/ui/LoadingView';
import { Button } from '@/components/ui/Button';
import { SPECIES } from '@/api/mock/data/species';
import { useApiQuery } from '@/api';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { Text } from '@/components/ui/Text';
import { CharacterGrowth } from '@/features/character/CharacterGrowth';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';
import { SubjectSelect } from '@/features/folder/SubjectSelect';
import { HomeScene } from '@/features/home/HomeScene';
import { TodayStats } from '@/features/home/TodayStats';
import { josa } from '@/lib/josa';
import { COLORS, FONT, SIZES } from '@/theme/assetTokens';

// H-01 홈
export function HomeScreen() {
  const profile = useApiQuery((api) => api.getProfile(), []);
  const { folders, selected, select } = useSelectedFolder();

  if (folders === undefined) {
    return <LoadingView />;
  }
  if (!selected) {
    return (
      <View style={styles.empty}>
        <Text>함께 공부할 과목이 없어요. 첫 과목부터 만들어 볼까요?</Text>
        <Button variant="primary" title="과목 만들기" onPress={() => router.push('/subjects/new')} />
      </View>
    );
  }

  const speciesName = SPECIES.find((s) => s.id === selected.species_id)?.name ?? '';

  return (
    <BottomActionLayout
      inTab
      gutter={SIZES.gutter}
      actions={
        <>
          <Button variant="primary"
            title={`${speciesName}${josa(speciesName, '과', '와')} 공부 시작`}
            onPress={() => router.push('/session/setup')}
          />

          <View style={styles.row}>
            <Button style={styles.half} title="AI 팟캐스트" onPress={() => router.push('/podcasts/new')} />
            <Button style={styles.half} title="오늘의 퀴즈" onPress={() => router.push('/quizzes/today')} />
          </View>
        </>
      }
    >
      {/* 장면 카드 안에만 배경 이미지를 그리고, 그 아래는 크림 바탕 위의 종이 UI다 */}
      <HomeScene folder={selected} />

      {/* 캐릭터는 장면 카드 안에 있어서 여기서는 성장 표시만 보여 준다 */}
      <CharacterGrowth folder={selected} hideCharacter />

      <Text>{profile?.display_name}님, 오늘도 한 걸음 함께 자라볼까?</Text>

      <Text style={styles.caption}>오늘 함께할 과목</Text>
      <SubjectSelect folders={folders} value={selected} onChange={(f) => select(f.id)} />

      <TodayStats />
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  // 나란히 놓은 버튼이 폭을 반씩 나눈다
  half: {
    flex: 1,
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
  caption: {
    ...FONT.caption,
    color: COLORS.textSub,
  },
});
