import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { COLORS, SIZES } from '@/theme/assetTokens';

// docs/decisions/0003: 소개 → 이름 → 첫 과목(이름 + 선생님) → 자료
const TOTAL_STEPS = 4;
const DOT_SIZE = 14;

type Props = {
  step: number;
  actions: ReactNode;
  children: ReactNode;
  // 없으면 제목 없이 본문만 그린다(자료 단계는 본문 컴포넌트가 제목을 그린다)
  title?: string;
  subtitle?: string;
};

// 온보딩 화면 공통 배치: 위쪽 고정 단계 점, 위에서부터 쌓이는 본문, 하단 고정 버튼
export function OnboardingStepLayout({ step, actions, children, title, subtitle }: Props) {
  return (
    <View style={styles.screen}>
      {/* 한계: 네이티브 헤더는 아래 선을 그릴 수 없어서 헤더 바로 아래에 2dp 선을 따로 그린다. 헤더 안에 선을 넣으려면 커스텀 헤더가 필요하다. */}
      <View style={styles.line} />

      {/* 단계 표시는 스크롤 밖에 둬서 위쪽에 고정한다 */}
      <View
        style={styles.dots}
        accessible
        accessibilityLabel={`${TOTAL_STEPS}단계 중 ${step}단계`}
        accessibilityRole="progressbar"
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i < step && styles.dotFilled]} />
        ))}
      </View>

      <BottomActionLayout actions={actions}>
        {title ? <ScreenTitle title={title} subtitle={subtitle} /> : null}
        {children}
      </BottomActionLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.screen,
  },
  line: {
    height: 2,
    backgroundColor: COLORS.outline,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SIZES.gutter,
    paddingTop: 16,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: COLORS.card,
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
  },
});
