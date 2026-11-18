import { Animated, Platform } from 'react-native';

import { SPLASH_HEAD_DP, SPLASH_SIZE, SPLASH_STARS, SPLASH_TIME } from '@/features/splash/splashSpec';
import * as K from '@/features/splash/splashTrack';

// splashTrack.ts의 수식을 60Hz로 샘플링해 Animated 값(interpolate)으로 "굽는다".
// 이렇게 하면 시안의 이징(되튕김, 사인 곡선 등)을 손으로 다시 옮기지 않고 그대로 쓰고,
// 움직임이 transform·opacity뿐이라 네이티브 드라이버로 돌릴 수 있다(웹은 호출하는 쪽에서 끈다).
// 한계: 샘플 사이는 직선으로 이어진다. 60Hz 간격(약 0.017초)이라 눈에 띄지 않는다.
const HZ = 60;
const SMALL = 0.001;
const snap = (v: number) => (Platform.OS === 'web' ? Math.round(v) : v);

function sample(fn: (x: number) => number, from: number, to: number, hz: number) {
  const n = Math.max(2, Math.ceil((to - from) * hz));
  const input: number[] = [];
  const output: number[] = [];
  for (let i = 0; i <= n; i++) {
    const x = from + ((to - from) * i) / n;
    input.push(x);
    output.push(fn(x));
  }
  return { input, output };
}

function bake(v: Animated.Value, fn: (x: number) => number, to = 1, hz = HZ) {
  const { input, output } = sample(fn, 0, to, hz);
  return v.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp' });
}

function bakeDeg(v: Animated.Value, fn: (x: number) => number, to = 1, hz = HZ) {
  const { input, output } = sample(fn, 0, to, hz);
  return v.interpolate({ inputRange: input, outputRange: output.map((o) => `${o}deg`), extrapolate: 'clamp' });
}

// 시안 시각 t(0~10.6)로 움직이는 모든 값
export function buildTimeline(t: Animated.Value, g: K.Geo) {
  const E = K.T_END;
  const barW = SPLASH_SIZE.row.width;
  const at = (fn: (x: number) => number) => bake(t, fn, E);
  const duck = (pick: (p: ReturnType<typeof K.duckPose>) => number) => at((x) => pick(K.duckPose(x, barW)));
  const icon = (pick: (p: ReturnType<typeof K.iconPose>) => number) => at((x) => pick(K.iconPose(x, g)));

  return {
    curtainTop: at((x) => K.curtainTop(x, g.height)),
    curtainBottom: at((x) => K.curtainBottom(x, g.height)),
    icon: {
      // 웹에서만 돋보기 전체의 이동을 정수 dp로 반올림한다(그림 칸이 소수 위치에서 어긋나 흐려 보이지 않게).
      // 머리 이동에는 적용하지 않는다(미세한 움직임이 끊겨 보인다).
      x: icon((p) => snap(p.tx)),
      y: icon((p) => snap(p.ty)),
      rot: bakeDeg(t, (x) => K.iconPose(x, g).r, E),
      // 크기 0에서 행렬이 무너지지 않게 아주 작은 값으로 둔다
      sx: icon((p) => Math.max(SMALL, p.sx)),
      sy: icon((p) => Math.max(SMALL, p.sy)),
      show: icon((p) => p.show),
    },
    letters: [0, 1, 2, 3].map((i) => ({
      o: at((x) => K.letterPose(x, i).o),
      ty: at((x) => K.letterPose(x, i).ty),
      sx: at((x) => K.letterPose(x, i).sx),
      sy: at((x) => K.letterPose(x, i).sy),
    })),
    tag: { o: at((x) => K.tagPose(x).o), ty: at((x) => K.tagPose(x).ty) },
    strip: at(K.stripScale),
    load: { o: at((x) => K.loadPose(x).o), ty: at((x) => K.loadPose(x).ty) },
    duck: {
      o: duck((p) => p.o),
      x: duck((p) => p.dx),
      y: duck((p) => p.dy),
      rot: bakeDeg(t, (x) => K.duckPose(x, barW).dr, E),
      sx: duck((p) => p.dsx),
      sy: duck((p) => p.dsy),
    },
    shadow: {
      o: at((x) => {
        const p = K.duckPose(x, barW);
        return K.duckShadowOpacity(p.o, p.dy);
      }),
      x: duck((p) => p.dx),
      sx: duck((p) => K.duckShadowScale(p.dy)),
    },
    fill: at((x) => K.fillRatio(x, barW)),
    burst: { e: at(K.burstProgress), o: at(K.burstOpacity) },
  };
}

// 돋보기 레이어(머리·원판·빛·눈꺼풀·말풍선)를 시안 시각 t로 움직이는 값
export function buildMagnifier(t: Animated.Value) {
  const E = K.T_END;
  const at = (fn: (x: number) => number) => bake(t, fn, E);
  // 머리 이동은 머리 크기에 대한 %를 dp로 바꿔서 준다
  const toDp = (pct: number) => (pct / 100) * SPLASH_HEAD_DP;
  return {
    head: {
      x: at((x) => toDp(K.headPose(x).x)),
      y: at((x) => toDp(K.headPose(x).y)),
      rot: bakeDeg(t, (x) => K.headPose(x).r, E),
      s: at((x) => K.headPose(x).s),
    },
    shine: { o: at((x) => K.shinePose(x).o), p: at((x) => K.shinePose(x).p) },
    blink: at(K.blinkAll),
    qmark: { o: at((x) => K.qmarkPose(x).o), y: at((x) => K.qmarkPose(x).y), rot: bakeDeg(t, (x) => K.qmarkPose(x).r, E) },
  };
}

// 준비를 기다리며 제자리에서 폴짝이는 오리(한 번 폴짝 f=0~1 값 하나로 움직인다)
export function buildHold(f: Animated.Value) {
  const hop = (pick: (p: ReturnType<typeof K.hopPose>) => number) => bake(f, (x) => pick(K.hopPose(x)), 1, 120);
  return {
    x: K.duckPose(SPLASH_TIME.holdAt, SPLASH_SIZE.row.width).dx,
    y: hop((p) => p.dy),
    rot: bakeDeg(f, (x) => K.hopPose(x).dr, 1, 120),
    sx: hop((p) => p.dsx),
    sy: hop((p) => p.dsy),
    shadowO: hop((p) => K.duckShadowOpacity(1, p.dy)),
    shadowSx: hop((p) => K.duckShadowScale(p.dy)),
  };
}

// 한 바퀴(0~1)를 도는 값에서 뽑는 것: 로딩 점 3개
export function buildDots(u: Animated.Value) {
  return [0, 1, 2].map((i) => bake(u, (x) => K.dotOpacity(x, i), 1, 120));
}

// 배경 별 9개의 깜빡임
export function buildStars(u: Animated.Value) {
  return SPLASH_STARS.map((s) => bake(u, (x) => K.starOpacity(x, s[3]), 1, 120));
}

// 진행률 숫자(0~100)
export const pctAt = (t: number) => Math.round(K.fillRatio(t, SPLASH_SIZE.row.width) * 100);
