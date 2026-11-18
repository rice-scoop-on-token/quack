import { useMemo } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

import { pixelated } from '@/features/character/pixelated';
import { OutlinedText } from '@/features/splash/OutlinedText';
import type { buildMagnifier } from '@/features/splash/splashChannels';
import { SPLASH_COLORS, SPLASH_FONT, SPLASH_ICON, SPLASH_LAYERS } from '@/features/splash/splashSpec';

const L = SPLASH_LAYERS;
const frameImage = require('../../../assets/splash/splash-frame.png');
const glassImage = require('../../../assets/splash/splash-glass.png');
const duckImage = require('../../../assets/splash/splash-head.png');
const duckHalfImage = require('../../../assets/splash/splash-head-blink-half.png');
const duckClosedImage = require('../../../assets/splash/splash-head-blink.png');
const fullImage = require('../../../assets/splash/splash-full.png');

// 512 캔버스 px → 부모에 대한 퍼센트(레이어 크기가 달라져도 비율이 유지된다)
const pct = (v: number, of: number = L.canvas) => `${(v / of) * 100}%` as `${number}%`;

// 렌즈 클립 원 안에서 본 오리의 자리와 크기(오리는 가로·세로 비율이 다르다)
const DUCK_IN_LENS = {
  left: pct(L.duck.x - L.lens.x, L.lens.size),
  top: pct(L.duck.y - L.lens.y, L.lens.size),
  width: pct(L.duck.w, L.lens.size),
  height: pct(L.duck.h, L.lens.size),
};

// 빛이 지나가는 거리(시안: 막대 자기 폭의 560%)
const LENS_DP = (SPLASH_ICON.canvas * L.lens.size) / L.canvas;
const SHINE_DIST = [5.6 * 0.22 * LENS_DP, 5.6 * 0.08 * LENS_DP] as const;

// 눈 깜빡임: 시안의 깜빡임 값(0~1, 눈꺼풀이 내려온 정도)을 세 단계로 나눈다. 반투명 보간은 하지 않고 경계를 아주 좁게(1e-4) 둔다.
// 0~0.2 열린 눈(머리 그림), 0.2~0.8 반쯤 감은 눈(half), 0.8 초과 감은 눈(closed).
const BLINK_HALF_FROM = 0.2;
const BLINK_CLOSED_FROM = 0.8;
const STEP = 1e-4;

type Props = {
  mq: ReturnType<typeof buildMagnifier>;
  // 비교용(mock 전용). full: 합성 그림(splash-full)만 그린다. 그 밖에는 레이어로 그린다.
  variant?: 'layers' | 'full';
  fontReady: boolean;
};

// 돋보기 Q. 위에서부터 (그림자) → 프레임(렌즈 채움 포함) → [렌즈 안: 오리 → 빛] → 유리 하이라이트 → 말풍선.
// 돋보기는 움직이지 않고 오리만 렌즈 클립 원 안에서 움직인다. 합성 그림(splash-full)으로 바꾸지 않고 끝까지 레이어를 쓴다.
// 한계: 그림자는 합성 그림의 tintColor 복사본이다. 웹에서 모양이 어긋나면 이 복사본을 없애고 갈색 외곽만 두는 쪽으로 바꾼다.
export function MagnifierQ({ mq, variant, fontReady }: Props) {
  const fullOnly = variant === 'full';
  const halfOpacity = useMemo(
    () =>
      mq.blink.interpolate({
        inputRange: [0, BLINK_HALF_FROM, BLINK_HALF_FROM + STEP, BLINK_CLOSED_FROM, BLINK_CLOSED_FROM + STEP, 1],
        outputRange: [0, 0, 1, 1, 0, 0],
        extrapolate: 'clamp',
      }),
    [mq],
  );
  const closedOpacity = useMemo(
    () =>
      mq.blink.interpolate({
        inputRange: [0, BLINK_HALF_FROM, BLINK_HALF_FROM + STEP, BLINK_CLOSED_FROM, BLINK_CLOSED_FROM + STEP, 1],
        outputRange: [0, 0, 0, 0, 1, 1],
        extrapolate: 'clamp',
      }),
    [mq],
  );

  return (
    <>
      <View style={styles.canvas} pointerEvents="none">
        <Image source={fullImage} resizeMode="stretch" style={[styles.layer, styles.shadow, pixelated]} />

        {fullOnly ? (
          <Image source={fullImage} resizeMode="stretch" style={[styles.layer, pixelated]} />
        ) : (
          <>
            <Image source={frameImage} resizeMode="stretch" style={[styles.layer, pixelated]} />

            {/* 렌즈 안: 오리 → 빛. 렌즈 모양(원)으로 잘린다. */}
            <View style={styles.lens}>
              <Animated.View
                style={[
                  styles.duck,
                  { transform: [{ translateX: mq.head.x }, { translateY: mq.head.y }, { rotate: mq.head.rot }, { scale: mq.head.s }] },
                ]}
              >
                <Image source={duckImage} resizeMode="stretch" style={[styles.fill, pixelated]} />
                {/* 눈 깜빡임: 머리와 같은 크기·같은 변환으로 쌓은 반쯤 감은 눈·감은 눈 그림을 단계형으로 켠다 */}
                {/* 한계: 반쯤 감은 눈은 수십 ms만 보여서 프레임 속도에 따라 거의 안 보일 수 있다. 머리 그림이 바뀌면 half·closed 그림도 같이 다시 만들어야 하고, 그림 세 장이 겹쳐 그려진다. */}
                <Animated.Image source={duckHalfImage} resizeMode="stretch" style={[styles.stacked, pixelated, { opacity: halfOpacity }]} />
                <Animated.Image source={duckClosedImage} resizeMode="stretch" style={[styles.stacked, pixelated, { opacity: closedOpacity }]} />
              </Animated.View>
              {SHINE_DIST.map((dist, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.shine,
                    i === 0 ? styles.shineWide : styles.shineThin,
                    { opacity: mq.shine.o, transform: [{ translateX: Animated.multiply(mq.shine.p, dist) }, { rotate: '28deg' }] },
                  ]}
                />
              ))}
            </View>

            <Image source={glassImage} resizeMode="stretch" style={[styles.layer, pixelated]} />
          </>
        )}
      </View>

      {/* 말풍선 "?": Q 외곽 박스 기준 위치 */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.qmark,
          { left: L.qmark.left * SPLASH_ICON.width, top: L.qmark.top * SPLASH_ICON.height, opacity: mq.qmark.o },
          { transform: [{ translateY: mq.qmark.y }, { rotate: mq.qmark.rot }] },
        ]}
      >
        <OutlinedText text="?" size={L.qmark.size} fill={SPLASH_COLORS.card} family={fontReady ? SPLASH_FONT : undefined} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  // 그림 한 장(정사각형). Q 외곽이 아이콘 박스에 맞도록 여백만큼 밀어서 둔다.
  canvas: {
    position: 'absolute',
    left: -SPLASH_ICON.offsetX,
    top: -SPLASH_ICON.offsetY,
    width: SPLASH_ICON.canvas,
    height: SPLASH_ICON.canvas,
  },
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  // 머리 그림 위에 같은 크기로 겹치는 눈 깜빡임 그림
  stacked: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  // 합성 그림 모양 그대로의 갈색 복사본을 아래로 12dp 밀어 그림자처럼 보이게 한다
  shadow: {
    top: L.shadowOffset,
    tintColor: SPLASH_COLORS.brown,
    opacity: L.shadowOpacity,
  },
  lens: {
    position: 'absolute',
    left: pct(L.lens.x),
    top: pct(L.lens.y),
    width: pct(L.lens.size),
    height: pct(L.lens.size),
    borderRadius: '50%',
    overflow: 'hidden',
  },
  duck: {
    position: 'absolute',
    left: DUCK_IN_LENS.left,
    top: DUCK_IN_LENS.top,
    width: DUCK_IN_LENS.width,
    height: DUCK_IN_LENS.height,
    // 확대·회전의 기준점(오리 이미지의 가운데)
    transformOrigin: `${L.duckPivot.x * 100}% ${L.duckPivot.y * 100}%`,
  },
  // 유리 위로 지나가는 빛 두 줄(시안 .shine i)
  shine: {
    position: 'absolute',
    top: '-30%',
    height: '160%',
  },
  shineWide: {
    left: '-60%',
    width: '22%',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  shineThin: {
    left: '-30%',
    width: '8%',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  qmark: {
    position: 'absolute',
  },
});
