import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import { GrowthEffect } from '@/features/character/GrowthEffect';
import { LoadingView } from '@/components/ui/LoadingView';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
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
  // 한계: 임시 연결이다. 연출이 끝나면 아래 기존 화면으로 이어진다. 성장 직전·결과 화면 흐름으로 바꿀 예정이다.
  const [played, setPlayed] = useState(false);

  if (session === undefined || result === undefined || folders === undefined) {
    return <LoadingView />;
  }
  const folder = folders?.find((f) => f.id === session?.folder_id);
  const change = result ? stageChange(result.rewards) : null;
  if (!folder || !change) {
    return <NoRecord message="보여 줄 성장 기록이 없어요." onHome={goHome} />;
  }
  if (!played) {
    return (
      <GrowthEffect
        speciesId={folder.species_id}
        before={change.from}
        after={change.to}
        name={SPECIES.find((s) => s.id === folder.species_id)?.name}
        onDone={() => setPlayed(true)}
      />
    );
  }

  return (
    <BottomActionLayout
      centered
      actions={
        <Button variant="primary" title="확인" onPress={goHome} />
      }
    >
      <Text style={styles.center} accessibilityRole="header">
        캐릭터가 성장했어요!
      </Text>

      <View style={styles.character}>
        <CharacterBox speciesId={folder.species_id} stage={change.to} size={180} action={SCREEN_ACTIONS.growth} />
      </View>

      {/* 성장 축하 화면은 가운데 정렬을 유지한다 */}
      <View
        style={styles.stage}
        accessible
        accessibilityLabel={`${STAGE_LABEL[change.from]}에서 ${STAGE_LABEL[change.to]}`}
      >
        <Text>{STAGE_LABEL[change.from]}</Text>
        <Icon name="arrow-right" />
        <Text>{STAGE_LABEL[change.to]}</Text>
      </View>
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
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
