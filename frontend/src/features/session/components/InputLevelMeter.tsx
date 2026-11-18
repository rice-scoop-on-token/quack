import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/features/character/useReduceMotion';
import { COLORS, PAPER } from '@/theme/assetTokens';

const BAR_COUNT = 24;
const BAR_HEIGHT = 28;
const MIN_SCALE = 0.15;

// 막대마다 오르내리는 속도를 달리해서 소리가 들쭉날쭉한 것처럼 보이게 한다(0.35~0.75초)
const durationOf = (i: number) => 350 + ((i * 97) % 400);
// 동작 줄이기에서 멈춰 있는 모양
const stillScaleOf = (i: number) => 0.2 + 0.6 * Math.abs(Math.sin(i * 0.9));

// 입력 소리 크기 막대. 녹음 중에만 움직이고, 아니면 낮게 멈춰 있다. 동작 줄이기가 켜져 있으면 움직이지 않고 모양만 보인다.
// 한계: 실제 입력 레벨이 아니라 모양이다. STT 연결 때 마이크 레벨로 바꾼다.
export function InputLevelMeter({ active }: { active: boolean }) {
  const reduce = useReduceMotion();

  return (
    // 장식이라 스크린 리더에는 읽어 주지 않는다
    <View style={styles.box} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <Bar key={i} index={i} active={active} reduce={reduce} />
      ))}
    </View>
  );
}

function Bar({ index, active, reduce }: { index: number; active: boolean; reduce: boolean | undefined }) {
  const level = useRef(new Animated.Value(0)).current;
  // 동작 줄이기 여부를 알기 전(undefined)에는 움직이지 않는다
  const moving = active && reduce === false;

  useEffect(() => {
    if (!moving) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(level, { toValue: 1, duration: durationOf(index), easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(level, { toValue: 0, duration: durationOf(index), easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [moving, level, index]);

  const scaleY = moving
    ? level.interpolate({ inputRange: [0, 1], outputRange: [MIN_SCALE, 1] })
    : active && reduce
      ? stillScaleOf(index)
      : MIN_SCALE;

  return <Animated.View style={[styles.bar, { transform: [{ scaleY }] }]} />;
}

const styles = StyleSheet.create({
  box: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
    boxShadow: PAPER.input.boxShadow,
  },
  bar: {
    width: 4,
    height: BAR_HEIGHT,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
});
