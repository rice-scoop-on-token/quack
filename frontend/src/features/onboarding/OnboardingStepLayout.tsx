import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomActionLayout } from '@/components/ui/BottomActionLayout';

const TOTAL_STEPS = 5;

type Props = {
  step: number;
  actions: ReactNode;
  children: ReactNode;
};

// 온보딩 화면 공통 배치: 위쪽 고정 단계 표시, 세로 중앙 본문, 하단 고정 버튼
export function OnboardingStepLayout({ step, actions, children }: Props) {
  return (
    <View style={styles.screen}>
      {/* 온보딩 단계 표시 (스크롤 밖이라 위쪽에 고정된다) */}
      <Text style={styles.step}>
        {step} / {TOTAL_STEPS}
      </Text>

      <BottomActionLayout centered actions={actions}>
        {children}
      </BottomActionLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  step: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
