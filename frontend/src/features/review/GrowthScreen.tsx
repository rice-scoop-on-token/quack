import { router, Stack, useLocalSearchParams } from 'expo-router';

import { SPECIES } from '@/api/mock/data/species';
import { LoadingView } from '@/components/ui/LoadingView';
import { useApiQuery } from '@/api';
import { NoRecord } from '@/components/ui/NoRecord';
import { GrowthEffect } from '@/features/character/GrowthEffect';
import { GrowthResult } from '@/features/review/GrowthResult';
import { stageChange } from '@/features/review/report';
import { useAfterSession, useSessionReport } from '@/features/review/useAfterSession';
import { useGrowthStep } from '@/features/review/useGrowthStep';

// 성장 화면. 보상으로 성장 단계가 바뀌었을 때만 리포트에서 온다: 데이터가 준비되면 바로 연출 → 결과
export function GrowthScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { session, leave } = useAfterSession(sessionId);
  const result = useSessionReport(sessionId);
  const folders = useApiQuery((api) => api.listFolders(), []);
  const { step, finish } = useGrowthStep();
  const goHome = () => leave(() => router.dismissTo('/home'));

  if (session === undefined || result === undefined || folders === undefined) {
    return <LoadingView />;
  }
  const folder = folders?.find((f) => f.id === session?.folder_id);
  const change = result ? stageChange(result.rewards) : null;
  if (!folder || !result || !change) {
    return <NoRecord message="보여 줄 성장 기록이 없어요." onHome={goHome} />;
  }

  if (step === 'effect') {
    return (
      <>
        {/* 연출은 화면 전체를 쓰므로 이 단계에서만 헤더를 숨긴다.
            한계: 불러오기 화면에서 연출로, 연출에서 결과로 바뀔 때 헤더가 숨고 보이면서 화면 높이가 바뀌어 잠깐 흔들릴 수 있다.
            한계: 새로고침하면 연출이 처음부터 다시 재생된다(단계를 저장하지 않는다). */}
        <Stack.Screen options={{ headerShown: false }} />
        <GrowthEffect
          speciesId={folder.species_id}
          before={change.from}
          after={change.to}
          name={SPECIES.find((s) => s.id === folder.species_id)?.name}
          onDone={finish}
        />
      </>
    );
  }
  return (
    <GrowthResult
      speciesId={folder.species_id}
      from={change.from}
      to={change.to}
      xpAfter={result.rewards.xp_after}
      onConfirm={goHome}
    />
  );
}
