import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Button, Text } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NoRecord } from '@/components/ui/NoRecord';
import { rewardXp } from '@/features/review/report';
import { ReportSummary } from '@/features/review/ReportSummary';
import { useAfterSession } from '@/features/review/useAfterSession';

// S-05 학습 결과 리포트. 들어오면 보상을 지급하고(같은 세션은 한 번만), 성장했으면 성장 축하 화면으로 간다.
export function ReportScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { session, report, grant, change, params, leave } = useAfterSession(sessionId);
  const { grantReward } = useTempStore();
  const xp = report ? rewardXp(report) : 0;

  // QuackApi 교체 지점: POST /sessions/:id/report (리포트와 보상을 함께 받는다. 여러 번 불러도 한 번만 지급)
  useEffect(() => {
    if (session && !grant) {
      grantReward(session.id, session.folder_id, xp);
    }
  }, [session, grant, grantReward, xp]);

  if (!session || !report) {
    return <NoRecord message="리포트를 만들 공부 기록이 없어요." onHome={() => leave(() => router.dismissTo('/home'))} />;
  }

  return (
    <BottomActionLayout
      actions={
        change ? (
          <Button
            title="확인"
            onPress={() => leave(() => router.replace({ pathname: '/session/growth', params }))}
          />
        ) : (
          <Button
            title="확인"
            disabled={!grant}
            onPress={() => leave(() => router.replace({ pathname: '/session/reward', params }))}
          />
        )
      }
    >
      <Text>오늘의 공부 · 완료</Text>
      <Text>설명한 만큼, 이해가 자랐어요.</Text>

      <ReportSummary report={report} />

      <Text>성장의 조각을 모았어요 · +{grant?.xp ?? xp} XP</Text>
    </BottomActionLayout>
  );
}
