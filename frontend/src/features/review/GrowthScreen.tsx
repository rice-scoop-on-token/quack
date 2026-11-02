import { router, useLocalSearchParams } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NoRecord } from '@/components/ui/NoRecord';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { STAGE_LABEL } from '@/features/character/growth';
import { useAfterSession } from '@/features/review/useAfterSession';

// 성장 축하. 보상으로 성장 단계가 바뀌었을 때만 리포트에서 온다.
export function GrowthScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { session, change, leave } = useAfterSession(sessionId);
  const { folders } = useTempStore();
  const folder = folders.find((f) => f.id === session?.folder_id);
  const goHome = () => leave(() => router.dismissTo('/home'));

  if (!folder || !change) {
    return <NoRecord message="보여 줄 성장 기록이 없어요." onHome={goHome} />;
  }

  return (
    <BottomActionLayout
      centered
      actions={
        // 확인 버튼 (홈으로 간다)
        <Button title="확인" onPress={goHome} />
      }
    >
      {/* 성장 축하 문구 */}
      <Text style={styles.center} accessibilityRole="header">
        캐릭터가 성장했어요!
      </Text>

      {/* 성장한 단계의 캐릭터 */}
      <View style={styles.character}>
        <CharacterBox speciesId={folder.species_id} stage={change.to} size={180} />
      </View>

      {/* 이전 단계 → 새 단계 */}
      <Text style={styles.center}>
        {STAGE_LABEL[change.from]} → {STAGE_LABEL[change.to]}
      </Text>
      {/* 다 자랐을 때 문구 */}
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
