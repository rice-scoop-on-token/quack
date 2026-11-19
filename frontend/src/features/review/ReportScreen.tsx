import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LoadingView } from '@/components/ui/LoadingView';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NoRecord } from '@/components/ui/NoRecord';
import { stageChange } from '@/features/review/report';
import { ReportSummary } from '@/features/review/ReportSummary';
import { useAfterSession, useSessionReport } from '@/features/review/useAfterSession';
import { COLORS, FONT, RADIUS } from '@/theme/assetTokens';

// S-05 학습 결과 리포트. 리포트를 요청하면 서버가 보상도 함께 지급한다. 성장했으면 성장 축하 화면으로 간다.
export function ReportScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { params, leave } = useAfterSession(sessionId);
  const result = useSessionReport(sessionId);

  if (result === undefined) {
    return <LoadingView />;
  }
  if (!result) {
    return <NoRecord message="리포트를 만들 공부 기록이 없어요." onHome={() => leave(() => router.dismissTo('/home'))} />;
  }

  const next = stageChange(result.rewards) ? '/session/growth' : '/session/reward';

  return (
    <BottomActionLayout
      actions={
        <Button variant="primary" title="확인" onPress={() => leave(() => router.replace({ pathname: next, params }))} />
      }
    >
      <Text>오늘의 공부 · 완료</Text>
      <Text>설명한 만큼, 이해가 자랐어요.</Text>

      <ReportSummary report={result.report} />

      <View style={styles.xp}>
        <Text>성장의 조각을 모았어요</Text>
        <Text style={styles.xpValue}>+{result.rewards.xp} XP</Text>
      </View>
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  xp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.medium,
    backgroundColor: COLORS.noticeBg,
  },
  // 글자용 주황(textAccent). 면·테두리용 주황은 글자에 쓰지 않는다.
  xpValue: {
    ...FONT.heading,
    color: COLORS.textAccent,
  },
});
