import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { buildStars } from '@/features/splash/splashChannels';
import { SPLASH_COLORS, SPLASH_SIZE, SPLASH_STARS } from '@/features/splash/splashSpec';

type Props = {
  // 별 9개의 투명도(시안의 깜빡임). 동작 줄이기에서는 없어서 별이 움직이지 않는다.
  stars: ReturnType<typeof buildStars> | null;
};

// 단색 바탕 + 26dp 간격 모눈선 + 깜빡이는 작은 별 9개. 낮·밤 구분 없이 늘 같다.
// 선은 화면 크기에 맞춘 개수의 View로 그린다(390×844에서 약 48개, 정적이라 부담이 작다).
export function SplashBackground({ stars }: Props) {
  const { width, height } = useWindowDimensions();
  const g = SPLASH_SIZE.grid;
  // 시안은 모눈이 가로 가운데에서 시작한다(background-position: center top)
  const x0 = (((width - g) / 2) % g + g) % g;
  const columns = Math.ceil((width - x0) / g) + 1;
  const rows = Math.ceil(height / g);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_COLORS.background }]}>
      {Array.from({ length: columns }, (_, i) => (
        <View key={`c${i}`} style={[styles.vertical, { left: x0 + (i - 1) * g }]} />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <View key={`r${i}`} style={[styles.horizontal, { top: i * g }]} />
      ))}
      {SPLASH_STARS.map(([left, top, yellow], i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${left}%`,
            top: `${top}%`,
            width: SPLASH_SIZE.star,
            height: SPLASH_SIZE.star,
            backgroundColor: yellow ? SPLASH_COLORS.yellow : SPLASH_COLORS.orange,
            opacity: stars ? stars[i] : 1,
          }}
        />
      ))}
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
