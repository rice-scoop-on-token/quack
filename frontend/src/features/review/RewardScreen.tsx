import { router, useLocalSearchParams } from 'expo-router';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useApiQuery } from '@/api';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NoRecord } from '@/components/ui/NoRecord';
import { CharacterGrowth } from '@/features/character/CharacterGrowth';
import { SCREEN_ACTIONS } from '@/features/character/screenActions';
import { useAfterSession, useSessionReport } from '@/features/review/useAfterSession';

// C-01 성장 보상. 성장 단계가 그대로일 때 리포트에서 온다(성장했으면 성장 축하 화면으로 간다).
export function RewardScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { session, leave } = useAfterSession(sessionId);
  const result = useSessionReport(sessionId);
  const folders = useApiQuery((api) => api.listFolders(), []);

  if (session === undefined || result === undefined || folders === undefined) {
    return null;
  }
  const folder = folders?.find((f) => f.id === session?.folder_id);
  if (!folder || !result) {
    return <NoRecord message="받은 보상이 없어요." onHome={() => leave(() => router.dismissTo('/home'))} />;
  }

  return (
    <BottomActionLayout
      actions={
        <>
          <Button
            title="과목 상세로"
            onPress={() => leave(() => router.dismissTo({ pathname: '/subjects/[id]', params: { id: folder.id } }))}
          />
          <Button variant="primary" title="홈으로" onPress={() => leave(() => router.dismissTo('/home'))} />
        </>
      }
    >
      <Text>오늘도 차곡차곡!</Text>
      <Text>함께 공부해서 더 자랐어요.</Text>

      <Text>+{result.rewards.xp} XP</Text>

      <CharacterGrowth folder={folder} action={SCREEN_ACTIONS.reward} />
    </BottomActionLayout>
  );
}
