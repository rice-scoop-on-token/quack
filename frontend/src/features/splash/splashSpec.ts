import { Animated } from 'react-native';

import { COLORS } from '@/theme/assetTokens';

// 스플래시의 문구·색·치수·시간표를 한 곳에 모은다. 값은 여기서만 고친다.

// 임시 문구
export const SPLASH_TAGLINE = '설명하며 배우는 공부 친구';
export const SPLASH_LOADING = '불러오는 중';
export const SPLASH_DELAY = {
  title: '연결이 오래 걸려요',
  message: '잠시만 기다려 주세요.',
};
export const SPLASH_SKIP_LABEL = '스플래시 건너뛰기';

export const SPLASH_COLORS = {
  background: COLORS.screen,
  grid: '#EFE2BF',
  yellow: COLORS.primary,
  orange: COLORS.accent,
  outline: COLORS.outline,
  card: COLORS.card,
  sub: COLORS.textSub,
} as const;

export const SPLASH_SIZE = {
  grid: 26,
  bar: { width: 284, height: 32, fill: 280, tick: 28 },
  duck: 56,
  duckFrom: -14,
  duckTo: 256,
  logo: 80,
  logoGap: 62,
  hop: 30,
  bigJump: 96,
  curtainBorder: 4,
};

// 시간표(초). t 하나를 이 값들에서 interpolate해 모든 움직임을 만든다.
export const SPLASH_TIME = {
  // 시작 막이 걷힘
  curtainUp: 0.4,
  // 문구 카드
  cardFrom: 0.3,
  cardTo: 1.0,
  // 진행 막대 펼침
  barFrom: 0.5,
  barTo: 1.05,
  // 오리 낙하와 이동
  duckFall: 0.3,
  duckLand: 1.05,
  duckEnd: 4.9,
  hopPeriod: 0.35,
  // 글자가 튀어 오르기 시작하는 때(오리가 지나가는 시점)
  letters: [1.6, 2.4, 3.1, 3.75, 4.4],
  // 큰 점프·로고 눌림·반짝임
  burstFrom: 5.0,
  burstMid: 5.2,
  burstTo: 5.4,
  burstFade: 5.9,
  // 끝 막이 덮임
  curtainDownFrom: 5.9,
  end: 6.5,
  // 데이터 준비가 이 시간을 넘기면 지연 안내를 보여 준다
  delayAfter: 8,
  // 한계: 데모 확인용 자동 해제. ?splash=slow(준비 안 됨 강제)는 지연 안내가 뜬 뒤 이 시간이 지나면 풀린다.
  slowRelease: 3,
  // 동작 줄이기: 막대만 채우는 시간
  calmFill: 0.6,
} as const;

// t 하나에서 키프레임([시각, 값] 쌍)으로 값을 뽑는다. 범위 밖은 끝 값에 머문다.
export function ip(t: Animated.Value, keys: [number, number][]) {
  return t.interpolate({
    inputRange: keys.map((k) => k[0]),
    outputRange: keys.map((k) => k[1]),
    extrapolate: 'clamp',
  });
}
