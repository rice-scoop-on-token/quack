import { router } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput } from 'react-native';

import { useApiQuery, useQuackApi } from '@/api';
import { OnboardingStepLayout } from '@/features/onboarding/OnboardingStepLayout';

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
      actions={
        <Button title="다음" onPress={handleNext} />
      }
    >
      <Text>뭐라고 부르면 될까요?</Text>
      <Text>선생님이 이 이름으로 불러 줘요.</Text>

      <Text>이름 (필수)</Text>
      <TextInput style={styles.input} value={name} onChangeText={setEdited} placeholder="예: 꽥꽥이" />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}

      {/* 익명 로그인은 계정 없이 기기에만 묶여 있어서, 앱을 지우면 되찾을 방법이 없다는 것을 알린다 */}
      <Text>로그인 없이 바로 시작해요. 앱을 삭제하면 이름과 공부 기록이 모두 사라져요.</Text>
    </OnboardingStepLayout>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    padding: 12,
  },
});
