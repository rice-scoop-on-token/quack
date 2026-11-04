import { router, useLocalSearchParams } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

import { useApiQuery } from '@/api';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NoRecord } from '@/components/ui/NoRecord';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { STAGE_LABEL } from '@/features/character/growth';
import { SCREEN_ACTIONS } from '@/features/character/screenActions';
import { stageChange } from '@/features/review/report';
import { useAfterSession, useSessionReport } from '@/features/review/useAfterSession';

// 성장 축하. 보상으로 성장 단계가 바뀌었을 때만 리포트에서 온다.
export function GrowthScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { session, leave } = useAfterSession(sessionId);
  const result = useSessionReport(sessionId);
  const folders = useApiQuery((api) => api.listFolders(), []);
  const goHome = () => leave(() => router.dismissTo('/home'));

  if (session === undefined || result === undefined || folders === undefined) {
    return null;
  }
  const folder = folders?.find((f) => f.id === session?.folder_id);
  const change = result ? stageChange(result.rewards) : null;
  if (!folder || !change) {
    return <NoRecord message="보여 줄 성장 기록이 없어요." onHome={goHome} />;
  }

  return (
    <BottomActionLayout
      centered
      actions={
        <Button title="확인" onPress={goHome} />
      }
    >
      <Text style={styles.center} accessibilityRole="header">
        캐릭터가 성장했어요!
      </Text>

      <View style={styles.character}>
        <CharacterBox speciesId={folder.species_id} stage={change.to} size={180} action={SCREEN_ACTIONS.growth} />
      </View>

      <Text style={styles.center}>
        {STAGE_LABEL[change.from]} → {STAGE_LABEL[change.to]}
      </Text>
      {change.to === 'adult' ? <Text style={styles.center}>다 자랐어요! 앞으로도 함께 공부해요.</Text> : null}
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  character: {
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
