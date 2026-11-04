import { router, useLocalSearchParams } from 'expo-router';
import { Button, Text } from 'react-native';

import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NoRecord } from '@/components/ui/NoRecord';
import { stageChange } from '@/features/review/report';
import { ReportSummary } from '@/features/review/ReportSummary';
import { useAfterSession, useSessionReport } from '@/features/review/useAfterSession';

// S-05 학습 결과 리포트. 리포트를 요청하면 서버가 보상도 함께 지급한다. 성장했으면 성장 축하 화면으로 간다.
export function ReportScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { params, leave } = useAfterSession(sessionId);
  const result = useSessionReport(sessionId);

  if (result === undefined) {
    return null;
  }
  if (!result) {
    return <NoRecord message="리포트를 만들 공부 기록이 없어요." onHome={() => leave(() => router.dismissTo('/home'))} />;
  }

  const next = stageChange(result.rewards) ? '/session/growth' : '/session/reward';

  return (
    <BottomActionLayout
      actions={
        <Button title="확인" onPress={() => leave(() => router.replace({ pathname: next, params }))} />
      }
    >
      <Text>오늘의 공부 · 완료</Text>
      <Text>설명한 만큼, 이해가 자랐어요.</Text>

      <ReportSummary report={result.report} />

      <Text>성장의 조각을 모았어요 · +{result.rewards.xp} XP</Text>
    </BottomActionLayout>
  );
}
