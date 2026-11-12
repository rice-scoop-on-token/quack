import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { Text } from '@/components/ui/Text';
import { OnboardingStepLayout } from '@/features/onboarding/OnboardingStepLayout';
import { COLORS, FONT, SIZES } from '@/theme/assetTokens';

// 가운데를 조금 크게 둔 세 캐릭터의 비율. 폰 폭에는 2배(160/192/160)가 한 줄에 들어가지 않아서,
// 본문 폭에 맞춰 키우고 넓은 화면에서는 2배까지만 키운다.
const SIDE = 80;
const MIDDLE = 96;
const GAP = 8;
const MAX_SCALE = 2;

const STEPS = ['공부하고, 내 말로 설명하기', '친구의 질문으로 빈틈 발견하기', '이해를 쌓고, 함께 성장하기'];

// O-01 소개
export function IntroScreen() {
  const { width } = useWindowDimensions();
  const scale = Math.min(MAX_SCALE, (width - SIZES.gutter * 2 - GAP * 2) / (SIDE * 2 + MIDDLE));
  const side = Math.floor(SIDE * scale);
  const middle = Math.floor(MIDDLE * scale);

  return (
    <OnboardingStepLayout
      step={1}
      title="나의 작은 학습 친구"
      subtitle="설명할수록 선명하게, 함께할수록 꾸준하게."
      actions={<Button variant="primary" title="나의 학습 친구 만나기" onPress={() => router.push('/name')} />}
    >
      <Text>혼자 배운 내용을 친구에게 들려주세요. 이해도 쌓이고, 작은 친구도 함께 자라요.</Text>

      {/* 세 친구를 한 줄로 보여 주는 그림이라 가운데에 둔다 */}
      <View style={styles.row}>
        <CharacterBox speciesId="cat" stage="adult" size={side} />
        <CharacterBox speciesId="rubber_duck" stage="adult" size={middle} />
        <CharacterBox speciesId="raccoon" stage="adult" size={side} />
      </View>

      {STEPS.map((label, i) => (
        <Card key={label} style={styles.step}>
          <Text style={styles.number}>{`0${i + 1}`}</Text>
          <Text style={styles.label}>{label}</Text>
        </Card>
      ))}
    </OnboardingStepLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: GAP,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  number: {
    ...FONT.heading,
    color: COLORS.accent,
  },
  label: {
    flex: 1,
  },
});
