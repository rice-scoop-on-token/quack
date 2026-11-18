import { Animated, Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { CHARACTER_IMAGES } from '@/features/character/characterAssets';
import { pixelated } from '@/features/character/pixelated';
import type { buildHold, buildTimeline } from '@/features/splash/splashChannels';
import { SPLASH_COLORS, SPLASH_FONT, SPLASH_LOADING, SPLASH_SIZE } from '@/features/splash/splashSpec';
import { hardShadow } from '@/theme/assetTokens';

const R = SPLASH_SIZE.row;
const D = SPLASH_SIZE.duck;
const B = SPLASH_SIZE.bar;
// 시안의 병아리 대신 기존 성체 오리 그림을 쓴다
const duckImage = CHARACTER_IMAGES.rubber_duck.adult.base;

type Props = {
  // 시안 t로 움직이는 값. 동작 줄이기에서는 null이라 오리 없이 막대만 보인다.
  tl: ReturnType<typeof buildTimeline> | null;
  hold: ReturnType<typeof buildHold>;
  // 준비를 기다리는 중이면 true. 이때는 제자리에서 폴짝이는 오리를 보여 주고 t로 움직이는 오리는 숨긴다.
  holding: boolean;
  // 채움 막대의 가로 배율(0~1). 동작 줄이기에서는 따로 채운다.
  fill: Animated.AnimatedInterpolation<number> | Animated.Value;
  // 진행률 숫자
  pct: number;
  // "불러오는 중..." 점 3개의 투명도. 동작 줄이기에서는 null이라 모두 보인다.
  dots: Animated.AnimatedInterpolation<number>[] | null;
  fontReady: boolean;
};

// 진행 막대(284×32) + 그 위를 뛰는 오리 + "불러오는 중…" 줄. 막대·오리·문구는 오리가 떨어지기 전에 차례로 나타난다.
export function LoadingStrip({ tl, hold, holding, fill, pct, dots, fontReady }: Props) {
  return (
    <>
      <View style={styles.row}>
        <Animated.View style={[styles.strip, tl && { transform: [{ scaleX: tl.strip }] }]}>
          <Animated.View style={[styles.fill, { transform: [{ scaleX: fill }] }]}>
            <View style={styles.shine} />
          </Animated.View>
          {Array.from({ length: B.tickCount }, (_, k) => (
            <View key={k} style={[styles.tick, { left: B.tickFrom + k * B.tickEvery }]} />
          ))}
        </Animated.View>

        {tl ? (
          <>
            {/* 시안 시각 t로 움직이는 오리(떨어지기, 막대 위 폴짝, 도착 점프) */}
            <Animated.View
              style={[styles.shadow, { opacity: holding ? 0 : tl.shadow.o, transform: [{ translateX: tl.shadow.x }, { scaleX: tl.shadow.sx }] }]}
            />
            <Animated.View
              style={[
                styles.duck,
                {
                  opacity: holding ? 0 : tl.duck.o,
                  transform: [
                    { translateX: tl.duck.x },
                    { translateY: tl.duck.y },
                    { rotate: tl.duck.rot },
                    { scaleX: tl.duck.sx },
                    { scaleY: tl.duck.sy },
                  ],
                },
              ]}
            >
              <Image source={duckImage} style={[styles.duckImage, pixelated]} resizeMode="contain" />
            </Animated.View>

            {/* 준비를 기다리는 동안: 멈춘 자리에서 제자리 폴짝(같은 자세에서 이어 받는다) */}
            <Animated.View
              style={[styles.shadow, { opacity: holding ? hold.shadowO : 0, transform: [{ translateX: hold.x }, { scaleX: hold.shadowSx }] }]}
            />
            <Animated.View
              style={[
                styles.duck,
                {
                  opacity: holding ? 1 : 0,
                  transform: [
                    { translateX: hold.x },
                    { translateY: hold.y },
                    { rotate: hold.rot },
                    { scaleX: hold.sx },
                    { scaleY: hold.sy },
                  ],
                },
              ]}
            >
              <Image source={duckImage} style={[styles.duckImage, pixelated]} resizeMode="contain" />
            </Animated.View>
          </>
        ) : null}
      </View>

      <Animated.View style={[styles.load, tl && { opacity: tl.load.o, transform: [{ translateY: tl.load.ty }] }]}>
        <Text style={styles.loadText}>{SPLASH_LOADING}</Text>
        {[0, 1, 2].map((i) => (
          <Animated.Text key={i} style={[styles.loadText, dots && { opacity: dots[i] }]}>
            .
          </Animated.Text>
        ))}
        <Text style={[styles.pct, fontReady && { fontFamily: SPLASH_FONT, fontWeight: 'normal' }]}>{pct}%</Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  // 막대와 오리가 놓이는 칸. 오리는 막대 위로 솟아 올라서 막대 위쪽에 여백을 둔다.
  row: {
    width: R.width,
    height: R.height,
    marginTop: R.marginTop,
  },
  strip: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: R.width,
    height: B.height,
    borderWidth: 2,
    borderColor: SPLASH_COLORS.brown,
    borderRadius: 10,
    backgroundColor: SPLASH_COLORS.card,
    overflow: 'hidden',
    ...hardShadow(3),
    transformOrigin: '0% 50%',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: SPLASH_COLORS.yellow,
    transformOrigin: '0% 50%',
  },
  // 채움 위쪽의 밝은 줄
  shine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: SPLASH_COLORS.brown,
  },
  shadow: {
    position: 'absolute',
    left: D.shadowLeft,
    bottom: D.shadowBottom,
    width: D.shadowWidth,
    height: D.shadowHeight,
    borderRadius: D.shadowHeight / 2,
    backgroundColor: 'rgba(72,29,11,0.18)',
  },
  // 오리 칸은 아래 가운데를 기준으로 눌린다. 그림은 칸 아래에 붙여 막대 위에 서 있게 한다.
  duck: {
    position: 'absolute',
    left: 0,
    bottom: D.bottom,
    width: D.width,
    height: D.height,
    transformOrigin: '50% 100%',
  },
  duckImage: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: D.width,
    height: D.width,
  },
  load: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPLASH_SIZE.loadMarginTop,
  },
  loadText: {
    fontSize: 14,
    fontWeight: '700',
    color: SPLASH_COLORS.sub,
  },
  pct: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
    color: SPLASH_COLORS.brown,
  },
});
