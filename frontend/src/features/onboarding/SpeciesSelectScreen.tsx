import { router } from 'expo-router';
import { Button, Text } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import { useTempStore } from '@/api/mock/tempStore';
import { SpeciesPicker } from '@/features/character/SpeciesPicker';
import { OnboardingStepLayout } from '@/features/onboarding/OnboardingStepLayout';

// O-02 첫 과목의 선생님 고르기
export function SpeciesSelectScreen() {
  const { draftSpeciesId, setDraftSpeciesId } = useTempStore();
  const speciesName = SPECIES.find((s) => s.id === draftSpeciesId)?.name;

  return (
    <OnboardingStepLayout
      step={3}
      actions={
        // 선생님 확정 버튼
        <Button title={`${speciesName}와 첫 과목 만들기`} onPress={() => router.push('/subject')} />
      }
    >
      {/* 화면 제목과 설명 */}
      <Text>첫 과목의 선생님을 만나볼까요?</Text>
      <Text>과목마다 다른 선생님과 공부할 수 있어요.</Text>

      {/* 동물 선택 카드 목록 */}
      <SpeciesPicker value={draftSpeciesId} onChange={setDraftSpeciesId} />

      {/* 변경 불가 안내 */}
      <Text>한 번 고른 선생님은 이 과목에서 바꿀 수 없어요. 함께 공부하면 아기부터 자라요.</Text>
    </OnboardingStepLayout>
  );
}
