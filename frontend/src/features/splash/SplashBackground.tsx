import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ip, SPLASH_COLORS, SPLASH_SIZE } from '@/features/splash/splashSpec';

// 반짝점 자리(화면 비율)와 깜빡이기 시작하는 위치(반복 값 0~1)
const TWINKLES = [
  { left: '12%', top: '14%', phase: 0.05 },
  { left: '82%', top: '22%', phase: 0.45 },
  { left: '24%', top: '70%', phase: 0.7 },
  { left: '70%', top: '78%', phase: 0.25 },
  { left: '48%', top: '8%', phase: 0.6 },
  { left: '90%', top: '56%', phase: 0.15 },
] as const;
const TWINKLE_SIZE = 6;

type Props = {
  // 1.2초마다 0→1로 반복하는 값. 동작 줄이기에서는 없다.
  loop: Animated.Value | null;
};

// 단색 바탕 + 26dp 간격 모눈선 + 깜빡이는 작은 점. 낮·밤 구분 없이 늘 같다.
// 선은 화면 크기에 맞춘 개수의 View로 그린다(390×844에서 약 48개, 정적이라 부담이 작다).
export function SplashBackground({ loop }: Props) {
  const { width, height } = useWindowDimensions();
  const columns = Math.ceil(width / SPLASH_SIZE.grid);
  const rows = Math.ceil(height / SPLASH_SIZE.grid);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_COLORS.background }]}>
      {Array.from({ length: columns }, (_, i) => (
        <View key={`c${i}`} style={[styles.vertical, { left: i * SPLASH_SIZE.grid }]} />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <View key={`r${i}`} style={[styles.horizontal, { top: i * SPLASH_SIZE.grid }]} />
      ))}
      {loop
        ? TWINKLES.map((p, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: p.left,
                top: p.top,
                width: TWINKLE_SIZE,
                height: TWINKLE_SIZE,
                backgroundColor: i % 2 === 0 ? SPLASH_COLORS.orange : SPLASH_COLORS.yellow,
                opacity: ip(loop, [
                  [0, 0],
                  [p.phase, 0],
                  [p.phase + 0.1, 1],
                  [p.phase + 0.2, 0],
                  [1, 0],
                ]),
              }}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  vertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: SPLASH_COLORS.grid,
  },
  horizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: SPLASH_COLORS.grid,
  },
});
