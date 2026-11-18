import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';

import { SPINNER_IMAGE, SPINNER_SIZE } from '@/features/navigation/icons';

// 한 바퀴 도는 시간(ms). 웹에서 보고 이 값 하나만 고친다.
const SPINNER_ROTATE_MS = 900;

// 작은 로딩 표시(둥근 링 + 호 그림 한 장을 돌린다). RN의 ActivityIndicator 대신 쓴다.
// 화면 전체를 기다릴 때는 LoadingView(모닥불)를 쓴다.
export function Spinner() {
  const turn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 웹은 네이티브 드라이버가 없어서 끈다(켜면 경고가 나온다)
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: SPINNER_ROTATE_MS,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);

  return (
    <Animated.Image
      source={SPINNER_IMAGE}
      resizeMode="contain"
      accessibilityRole="progressbar"
      accessibilityLabel="불러오는 중"
      style={{
        width: SPINNER_SIZE,
        height: SPINNER_SIZE,
        transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    />
  );
}
