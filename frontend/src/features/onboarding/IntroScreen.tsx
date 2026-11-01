import { router } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

import { CharacterBox } from '@/components/ui/CharacterBox';
import { OnboardingStepLayout } from '@/features/onboarding/OnboardingStepLayout';

// O-01 소개
export function IntroScreen() {
  return (
    <OnboardingStepLayout
      step={1}
      actions={
        // 시작 버튼
        <Button title="나의 학습 친구 만나기" onPress={() => router.push('/name')} />
      }
    >
      {/* 소개 배지 */}
      <Text>나의 작은 학습 친구</Text>
      {/* 소개 제목과 설명 */}
      <Text>설명할수록 선명하게, 함께할수록 꾸준하게.</Text>
      <Text>혼자 배운 내용을 친구에게 들려주세요. 이해도 쌓이고, 작은 친구도 함께 자라요.</Text>

      {/* 동물 3종 소개 그림 */}
      <View style={styles.row}>
        <CharacterBox speciesId="cat" stage="baby" size={80} />
        <CharacterBox speciesId="rubber_duck" stage="child" size={96} />
        <CharacterBox speciesId="raccoon" stage="baby" size={80} />
      </View>

      {/* 학습 방법 3단계 목록 */}
      <View style={styles.steps}>
        <Text>01 공부하고, 내 말로 설명하기</Text>
        <Text>02 친구의 질문으로 빈틈 발견하기</Text>
        <Text>03 이해를 쌓고, 함께 성장하기</Text>
      </View>
    </OnboardingStepLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
  },
  steps: {
    gap: 8,
  },
});
