import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { CHARACTER_IMAGES } from '@/features/character/characterAssets';
import { pixelated } from '@/features/character/pixelated';
import { useReduceMotion } from '@/features/character/useReduceMotion';
import { SplashBackground } from '@/features/splash/SplashBackground';
import { SplashLogo } from '@/features/splash/SplashLogo';
import {
  ip,
  SPLASH_COLORS,
  SPLASH_DELAY,
  SPLASH_LOADING,
  SPLASH_SIZE,
  SPLASH_SKIP_LABEL,
  SPLASH_TAGLINE,
  SPLASH_TIME,
} from '@/features/splash/splashSpec';
import { SIZES, hardShadow, RADIUS } from '@/theme/assetTokens';

type Props = {
  // 앱이 첫 화면을 정할 준비가 됐는지. 연출은 항상 끝까지 재생하고, 준비가 늦으면 점프 직전에서 기다린다.
  ready: boolean;
  // 연출이 끝나거나 건너뛰면 한 번만 부른다
  onDone: () => void;
};

const native = Platform.OS !== 'web';
const T = SPLASH_TIME;
const S = SPLASH_SIZE;
const duckImage = CHARACTER_IMAGES.rubber_duck.adult.base;

export function SplashScreen(props: Props) {
  const reduce = useReduceMotion();
  // 동작 줄이기 값을 받기 전에는 바탕만 그리고 시작하지 않는다
  if (reduce === undefined) {
    return (
      <View style={styles.root}>
        <SplashBackground loop={null} />
      </View>
    );
  }
  return <Playback {...props} reduce={reduce} />;
}

function Playback({ ready, onDone, reduce }: Props & { reduce: boolean }) {
  const { height } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  // 오리 폴짝 한 번(0→1). 0.35초 주기로 정해진 횟수만 돈다.
  const hop = useRef(new Animated.Value(0)).current;
  // 점과 반짝점이 쓰는 1.2초 반복 값
  const loop = useRef(new Animated.Value(0)).current;
  // 동작 줄이기에서 막대를 채우는 값
  const calm = useRef(new Animated.Value(0)).current;

  // 앞 구간(0→4.9초)이 끝났는지. 끝나면 준비를 기다렸다가 끝 구간(4.9→6.5초)을 돈다.
  const [front, setFront] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [delayed, setDelayed] = useState(false);
  // 타이머 안에서 최신 값을 읽으려고 ref에 옮겨 둔다
  const readyRef = useRef(ready);
  const doneRef = useRef(onDone);
  const done = useRef(false);
  useEffect(() => {
    readyRef.current = ready;
    doneRef.current = onDone;
  });

  const finish = () => {
    if (!done.current) {
      done.current = true;
      doneRef.current();
    }
  };

  // 앞 구간
  useEffect(() => {
    if (reduce) {
      const fill = Animated.timing(calm, {
        toValue: 1,
        duration: T.calmFill * 1000,
        easing: Easing.linear,
        useNativeDriver: native,
      });
      fill.start(({ finished }) => finished && setFront(true));
      return () => fill.stop();
    }
    const main = Animated.timing(t, {
      toValue: T.duckEnd,
      duration: T.duckEnd * 1000,
      easing: Easing.linear,
      useNativeDriver: native,
    });
    main.start(({ finished }) => finished && setFront(true));
    // 오리 폴짝: 내려앉은 뒤부터 막대 끝까지 정해진 횟수
    const hops = Math.round((T.duckEnd - T.duckLand) / T.hopPeriod);
    const hopRun = Animated.sequence([
      Animated.delay(T.duckLand * 1000),
      Animated.loop(
        Animated.timing(hop, { toValue: 1, duration: T.hopPeriod * 1000, easing: Easing.linear, useNativeDriver: native }),
        { iterations: hops },
      ),
      // 마지막 폴짝의 착지 모양(납작함)이 남지 않게 되돌린다
      Animated.timing(hop, { toValue: 0, duration: 1, useNativeDriver: native }),
    ]);
    hopRun.start();
    const dots = Animated.loop(
      Animated.timing(loop, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: native }),
    );
    dots.start();
    return () => {
      main.stop();
      hopRun.stop();
      dots.stop();
    };
  }, []);

  // 끝 구간: 앞 구간이 끝나고 준비도 됐을 때만 시작한다. 동작 줄이기는 바로 끝낸다.
  useEffect(() => {
    if (!front || !ready) {
      return;
    }
    if (reduce) {
      finish();
      return;
    }
    const end = Animated.timing(t, {
      toValue: T.end,
      duration: (T.end - T.duckEnd) * 1000,
      easing: Easing.linear,
      useNativeDriver: native,
    });
    end.start(({ finished }) => finished && finish());
    return () => end.stop();
  }, [front, ready]);

  // 건너뛰기: 준비가 됐으면 바로 끝낸다. 준비 전이면 준비될 때까지 기다린다(빈 화면이 보이지 않게).
  useEffect(() => {
    if (skipped && ready) {
      finish();
    }
  }, [skipped, ready]);

  // 준비가 오래 걸리면 안내만 띄운다. 준비되면 안내를 치우고 끝 구간으로 이어진다.
  useEffect(() => {
    const id = setTimeout(() => {
      if (!readyRef.current) {
        setDelayed(true);
      }
    }, T.delayAfter * 1000);
    return () => clearTimeout(id);
  }, []);

  const showDelay = delayed && !ready;

  // 시작 막은 위로 걷히고, 끝 막은 아래에서 덮는다
  const topCurtain = reduce ? null : ip(t, [[0, 0], [T.curtainUp, -(height + 8)]]);
  const bottomCurtain = reduce ? null : ip(t, [[T.curtainDownFrom, height + 8], [T.end, 0]]);

  const cardStyle = reduce
    ? null
    : {
        opacity: ip(t, [[T.cardFrom, 0], [T.cardTo, 1]]),
        transform: [{ translateY: ip(t, [[T.cardFrom, -40], [T.cardTo, 0]]) }],
      };
  const barStyle = reduce
    ? null
    : { transform: [{ scaleX: ip(t, [[T.barFrom, 0], [T.barTo, 1]]) }], transformOrigin: 'left' as const };
  const fillScale = reduce ? calm : ip(t, [[T.duckLand, 0], [T.duckEnd, 1]]);

  // 오리: 떨어져 한 번 튕기고, 막대 위를 폴짝폴짝 건너고, 끝에서 크게 점프한다
  const duckStyle = reduce
    ? null
    : {
        opacity: ip(t, [[0, 0], [T.duckFall - 0.001, 0], [T.duckFall, 1]]),
        transform: [
          { translateX: ip(t, [[T.duckLand, S.duckFrom], [T.duckEnd, S.duckTo]]) },
          {
            translateY: Animated.add(
              Animated.add(
                ip(t, [[T.duckFall, -320], [0.75, 0], [0.9, -14], [T.duckLand, 0]]),
                hop.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -22.5, -S.hop, -22.5, 0] }),
              ),
              ip(t, [[T.burstFrom, 0], [T.burstMid, -S.bigJump], [T.burstTo, 0]]),
            ),
          },
          { rotate: ip(t, [[T.burstFrom, 0], [T.burstMid, -14], [T.burstTo, 0]]).interpolate({ inputRange: [-14, 0], outputRange: ['-14deg', '0deg'] }) },
          { scaleX: hop.interpolate({ inputRange: [0, 0.5, 0.9, 1], outputRange: [1, 0.94, 1, 1.1] }) },
          { scaleY: hop.interpolate({ inputRange: [0, 0.5, 0.9, 1], outputRange: [1, 1.1, 1, 0.88] }) },
        ],
      };

  return (
    <Pressable
      style={styles.root}
      onPress={() => setSkipped(true)}
      accessibilityRole="button"
      accessibilityLabel={SPLASH_SKIP_LABEL}
    >
      <SplashBackground loop={reduce ? null : loop} />

      <View style={styles.center} pointerEvents="none">
        <Animated.View style={[styles.tagline, cardStyle]}>
          <Text style={styles.taglineText}>{SPLASH_TAGLINE}</Text>
        </Animated.View>

        <SplashLogo t={reduce ? null : t} />

        <View style={styles.gap} />

        <View style={styles.barRow}>
          {reduce ? null : (
            <Animated.View style={[styles.duck, duckStyle]}>
              <Image source={duckImage} style={[styles.duckImage, pixelated]} resizeMode="contain" />
            </Animated.View>
          )}
          <Animated.View style={[styles.bar, barStyle]}>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, { transform: [{ scaleX: fillScale }], transformOrigin: 'left' }]} />
              {Array.from({ length: Math.floor(S.bar.fill / S.bar.tick) }, (_, i) => (
                <View key={i} style={[styles.tick, { left: (i + 1) * S.bar.tick - 1 }]} />
              ))}
            </View>
          </Animated.View>
        </View>

        <View style={styles.loading}>
          <Text style={styles.loadingText}>{SPLASH_LOADING}</Text>
          {[0, 1, 2].map((k) => (
            <Animated.Text
              key={k}
              style={[
                styles.loadingText,
                {
                  opacity:
                    reduce || k === 0 ? 1 : ip(loop, [[0, 0], [k / 3, 0], [k / 3 + 0.001, 1]]),
                },
              ]}
            >
              .
            </Animated.Text>
          ))}
        </View>
      </View>

      {reduce ? null : <Sparks t={t} />}

      {showDelay ? (
        <View style={styles.delay}>
          <Card>
            <Text style={styles.delayTitle}>{SPLASH_DELAY.title}</Text>
            <Text>{SPLASH_DELAY.message}</Text>
          </Card>
        </View>
      ) : null}

      {topCurtain && bottomCurtain ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.curtain, { transform: [{ translateY: topCurtain }] }]} />
          <Animated.View pointerEvents="none" style={[styles.curtain, { transform: [{ translateY: bottomCurtain }] }]} />
        </>
      ) : null}
    </Pressable>
  );
}

const SPARK_COUNT = 8;

// 끝에서 로고 위로 사방에 퍼졌다 사라지는 반짝임 8개
function Sparks({ t }: { t: Animated.Value }) {
  return (
    <View pointerEvents="none" style={styles.sparks}>
      {Array.from({ length: SPARK_COUNT }, (_, i) => {
        const angle = (Math.PI * 2 * i) / SPARK_COUNT;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: 6,
              height: 6,
              backgroundColor: i % 2 === 0 ? SPLASH_COLORS.orange : SPLASH_COLORS.yellow,
              opacity: ip(t, [[T.burstFrom, 0], [T.burstFrom + 0.15, 1], [T.burstFade, 0]]),
              transform: [
                { translateX: ip(t, [[T.burstFrom, 0], [T.burstFade, Math.cos(angle) * 90]]) },
                { translateY: ip(t, [[T.burstFrom, 0], [T.burstFade, Math.sin(angle) * 90]]) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // 모든 화면 위를 덮는다. 끝나면 SplashGate가 이 화면을 없앤다.
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    overflow: 'hidden',
    backgroundColor: SPLASH_COLORS.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: SPLASH_COLORS.outline,
    borderRadius: RADIUS.small,
    backgroundColor: SPLASH_COLORS.card,
    ...hardShadow(2),
  },
  taglineText: {
    fontSize: 14,
    fontWeight: '700',
  },
  gap: {
    height: S.logoGap,
  },
  barRow: {
    width: S.bar.width,
    height: S.bar.height + SIZES.card.shadow,
  },
  // 막대 위에 서 있는 오리. 막대 위쪽 가장자리에 발이 닿는다.
  duck: {
    position: 'absolute',
    left: 0,
    bottom: S.bar.height + SIZES.card.shadow - 4,
    width: S.duck,
    height: S.duck,
    zIndex: 2,
  },
  duckImage: {
    width: S.duck,
    height: S.duck,
  },
  bar: {
    width: S.bar.width,
    height: S.bar.height,
    borderWidth: 2,
    borderColor: SPLASH_COLORS.outline,
    borderRadius: RADIUS.small,
    backgroundColor: SPLASH_COLORS.card,
    overflow: 'hidden',
    ...hardShadow(SIZES.card.shadow),
  },
  track: {
    flex: 1,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: S.bar.fill,
    backgroundColor: SPLASH_COLORS.yellow,
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: SPLASH_COLORS.outline,
    opacity: 0.25,
  },
  loading: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loadingText: {
    fontSize: 14,
    color: SPLASH_COLORS.sub,
  },
  sparks: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delay: {
    position: 'absolute',
    left: SIZES.gutter,
    right: SIZES.gutter,
    bottom: 32,
    gap: 12,
  },
  delayTitle: {
    fontWeight: '700',
  },
  curtain: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_COLORS.yellow,
    borderTopWidth: S.curtainBorder,
    borderBottomWidth: S.curtainBorder,
    borderColor: SPLASH_COLORS.outline,
  },
});
