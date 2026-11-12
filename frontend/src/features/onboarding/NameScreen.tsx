import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { PaperInput } from '@/components/ui/PaperInput';
import { Text } from '@/components/ui/Text';
import { useApiQuery, useQuackApi } from '@/api';
import { OnboardingStepLayout } from '@/features/onboarding/OnboardingStepLayout';
import { COLORS } from '@/theme/assetTokens';

// O-05 이름 입력 (프로토타입에 없는 화면)
export function NameScreen() {
  const api = useQuackApi();
  const profile = useApiQuery((a) => a.getProfile(), []);
  // 고치기 전(null)에는 저장된 이름을 보여 준다. 다음 단계에서 뒤로 돌아오면 쓴 이름이 그대로 있다.
  const [edited, setEdited] = useState<string | null>(null);
  const name = edited ?? profile?.display_name ?? '';
  const [error, setError] = useState('');

  async function handleNext() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('이름을 입력해 주세요.');
      return;
    }
    await api.saveDisplayName(trimmed);
    router.push('/subject');
  }

  return (
    <OnboardingStepLayout
      step={2}
      title="뭐라고 부르면 될까요?"
      subtitle="선생님이 이 이름으로 불러 줘요."
      actions={<Button variant="primary" title="다음" onPress={handleNext} />}
    >
      <Text>이름 (필수)</Text>
      <PaperInput value={name} onChangeText={setEdited} placeholder="예: 꽥꽥이" />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}

      {/* 익명 로그인은 계정 없이 기기에만 묶여 있어서, 앱을 지우면 되찾을 방법이 없다는 것을 알린다 */}
      <Text style={{ color: COLORS.textSub }}>로그인 없이 바로 시작해요. 앱을 삭제하면 이름과 공부 기록이 모두 사라져요.</Text>
    </OnboardingStepLayout>
  );
}
