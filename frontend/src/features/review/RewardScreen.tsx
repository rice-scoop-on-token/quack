import { router, useLocalSearchParams } from 'expo-router';
import { Button, Text } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NoRecord } from '@/components/ui/NoRecord';
import { CharacterGrowth } from '@/features/character/CharacterGrowth';
import { useAfterSession } from '@/features/review/useAfterSession';

// C-01 성장 보상. 성장 단계가 그대로일 때 리포트에서 온다(성장했으면 성장 축하 화면으로 간다).
export function RewardScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { session, grant, leave } = useAfterSession(sessionId);
  const { folders } = useTempStore();
  const folder = folders.find((f) => f.id === session?.folder_id);

  if (!folder || !grant) {
    return <NoRecord message="받은 보상이 없어요." onHome={() => leave(() => router.dismissTo('/home'))} />;
  }

  return (
    <BottomActionLayout
      actions={
        <>
          {/* 과목 상세로 가는 버튼 */}
          <Button
            title="과목 상세로"
            onPress={() => leave(() => router.dismissTo({ pathname: '/subjects/[id]', params: { id: folder.id } }))}
          />
          {/* 홈으로 가는 버튼 */}
          <Button title="홈으로" onPress={() => leave(() => router.dismissTo('/home'))} />
        </>
      }
    >
      {/* 화면 제목 */}
      <Text>오늘도 차곡차곡!</Text>
      <Text>함께 공부해서 더 자랐어요.</Text>

      {/* 얻은 경험치 */}
      <Text>+{grant.xp} XP</Text>

      {/* 캐릭터와 다음 단계까지 남은 경험치 바 (다 자랐으면 다 자랐다는 문구) */}
      <CharacterGrowth folder={folder} />
    </BottomActionLayout>
  );
}
