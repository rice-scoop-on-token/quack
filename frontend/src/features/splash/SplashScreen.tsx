import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type HostInstance,
} from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useReduceMotion } from '@/features/character/useReduceMotion';
import { LoadingStrip } from '@/features/splash/LoadingStrip';
import { MagnifierQ } from '@/features/splash/MagnifierQ';
import { SplashBackground } from '@/features/splash/SplashBackground';
import { SplashLogo } from '@/features/splash/SplashLogo';
import { buildDots, buildHold, buildMagnifier, buildStars, buildTimeline, pctAt } from '@/features/splash/splashChannels';
import {
  SPLASH_BURSTS,
  SPLASH_COLORS,
  SPLASH_DELAY,
  SPLASH_SIZE,
  SPLASH_SKIP_LABEL,
  SPLASH_STAR_PERIOD,
  SPLASH_TAGLINE,
  SPLASH_TIME,
  splashShadow,
} from '@/features/splash/splashSpec';
import type { Geo } from '@/features/splash/splashTrack';
import { useSplashFont, type SplashFontState } from '@/features/splash/useSplashFont';
import { SIZES } from '@/theme/assetTokens';

type Props = {
  // 앱이 첫 화면을 정할 준비가 됐는지. 장면은 준비와 상관없이 재생하다가, 준비가 늦으면 막대가 차는 도중에 기다린다.
  ready: boolean;
  // 연출이 끝나거나 건너뛰면 한 번만 부른다
  onDone: () => void;
  // 돋보기 정렬 비교용(mock 전용). layers: 레이어만, full: 완성 그림만.
  variant?: 'layers' | 'full';
};

// 앞 구간(intro) → 막대 채우기(load) → [준비가 늦으면 멈춰서 기다림(hold)] → 끝 구간(end). 동작 줄이기는 calm 한 단계다.
type Stage = 'wait' | 'intro' | 'load' | 'hold' | 'end' | 'calm' | 'calmDone';

const native = Platform.OS !== 'web';
const T = SPLASH_TIME;
const S = SPLASH_SIZE;

export function SplashScreen(props: Props) {
  const reduce = useReduceMotion();
  const font = useSplashFont();
  // 동작 줄이기 값을 받기 전에는 바탕만 그리고 시작하지 않는다
  if (reduce === undefined) {
    return (
      <View style={styles.root}>
        <SplashBackground stars={null} />
      </View>
    );
  }
  return <Playback {...props} reduce={reduce} font={font} />;
}

function Playback({ ready, onDone, variant, reduce, font }: Props & { reduce: boolean; font: SplashFontState }) {
  const { width, height } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  // 준비를 기다리며 제자리에서 폴짝일 때 쓰는 값(한 번 폴짝 = 0→1)
  const holdHop = useRef(new Animated.Value(0)).current;
  // 점(약 0.9초)과 배경 별(2.2초)이 쓰는 한 바퀴 값
  const dotsLoop = useRef(new Animated.Value(0)).current;
  const starsLoop = useRef(new Animated.Value(0)).current;
  // 동작 줄이기에서 막대를 채우는 값
  const calm = useRef(new Animated.Value(0)).current;

  const rootRef = useRef<HostInstance>(null);
  const titleRef = useRef<HostInstance>(null);
  const slotRef = useRef<HostInstance>(null);
  // 화면에서 잰 자리. 글꼴에 따라 글자 폭이 달라져 Q 자리가 움직이므로 어떤 글꼴 상태에서 쟀는지 함께 둔다.
  const [measured, setMeasured] = useState<{ font: SplashFontState; geo: Geo } | null>(null);
  const [stage, setStage] = useState<Stage>('wait');
  const [skipped, setSkipped] = useState(false);
  const [delayed, setDelayed] = useState(false);
  const [pct, setPct] = useState(0);

  // 준비 = 앱이 준비됨 + 글꼴이 정해짐(불러왔거나 포기함). 타이머 안에서 최신 값을 읽으려고 ref에 옮겨 둔다.
  const go = ready && font !== 'wait';
  const goRef = useRef(go);
  const doneRef = useRef(onDone);
  const done = useRef(false);
  useEffect(() => {
    goRef.current = go;
    doneRef.current = onDone;
  });

  const finish = () => {
    if (!done.current) {
      done.current = true;
      doneRef.current();
    }
  };

  function measure() {
    const root = rootRef.current;
    const slot = slotRef.current;
    const title = titleRef.current;
    if (!root || !slot || !title) {
      return;
    }
    // 루트가 화면 전체라서 창 기준 좌표에서 루트 위치를 빼면 루트 기준이 된다
    root.measureInWindow((rx, ry) => {
      slot.measureInWindow((sx, sy, sw, sh) => {
        title.measureInWindow((tx, ty, tw, th) => {
          if (sw === 0 || sh === 0) {
            return;
          }
          setMeasured({
            font,
            geo: {
              width,
              height,
              slot: { x: sx - rx, y: sy - ry, w: sw, h: sh },
              title: { cx: tx - rx + tw / 2, cy: ty - ry + th * 0.55 },
            },
          });
        });
      });
    });
  }
  // 글꼴이 바뀌면 글자 폭이 달라지므로 한 프레임 뒤에 다시 잰다
  useEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [font, width, height]);

  const geo = measured && measured.font === font ? measured.geo : null;
  const tl = useMemo(() => (geo ? buildTimeline(t, geo) : null), [geo]);
  const mq = useMemo(() => (geo ? buildMagnifier(t) : null), [geo]);
  const hold = useMemo(() => buildHold(holdHop), []);
  const dots = useMemo(() => buildDots(dotsLoop), []);
  const stars = useMemo(() => buildStars(starsLoop), []);
  const bursts = useMemo(
    () =>
      tl
        ? SPLASH_BURSTS.map(([dx, dy, color]) => ({
            color,
            x: Animated.multiply(tl.burst.e, dx),
            y: Animated.multiply(tl.burst.e, dy),
          }))
        : null,
    [tl],
  );

  // 글꼴이 정해지고 자리를 쟀으면 시작한다
  useEffect(() => {
    if (stage === 'wait' && geo && font !== 'wait') {
      setStage(reduce ? 'calm' : 'intro');
    }
  }, [stage, geo, font, reduce]);

  const play = (to: number, seconds: number) =>
    Animated.timing(t, { toValue: to, duration: seconds * 1000, easing: Easing.linear, useNativeDriver: native });

  // 반복 값(점, 별)은 처음부터 돈다
  useEffect(() => {
    if (reduce) {
      return;
    }
    const dotsRun = Animated.loop(
      Animated.timing(dotsLoop, { toValue: 1, duration: 909, easing: Easing.linear, useNativeDriver: native }),
    );
    const starsRun = Animated.loop(
      Animated.timing(starsLoop, { toValue: 1, duration: SPLASH_STAR_PERIOD * 1000, easing: Easing.linear, useNativeDriver: native }),
    );
    dotsRun.start();
    starsRun.start();
    return () => {
      dotsRun.stop();
      starsRun.stop();
    };
  }, [reduce]);

  // 진행률 숫자: 정수가 바뀔 때만 다시 그린다
  useEffect(() => {
    const id = t.addListener(({ value }) => setPct(pctAt(value)));
    return () => t.removeListener(id);
  }, []);

  // 앞 구간: 두리번 구간만 빠르게(1.5배속) 흘려보낸다
  useEffect(() => {
    if (stage !== 'intro') {
      return;
    }
    let from = 0;
    const steps = T.intro.map(([to, speed]) => {
      const step = play(to, (to - from) / speed);
      from = to;
      return step;
    });
    const run = Animated.sequence(steps);
    run.start(({ finished }) => finished && setStage('load'));
    return () => run.stop();
  }, [stage]);

  // 막대 채우기: 준비가 이미 됐으면 2배속. 8.2초 지점에서 준비가 아직이면 멈춰서 기다린다.
  useEffect(() => {
    if (stage !== 'load') {
      return;
    }
    const speed = goRef.current ? T.loadFastSpeed : 1;
    const run = play(T.holdAt, (T.holdAt - T.loadFrom) / speed);
    run.start(({ finished }) => finished && setStage(goRef.current ? 'end' : 'hold'));
    return () => run.stop();
  }, [stage]);

  // 기다리는 동안: 오리가 제자리에서 폴짝인다. 한 번 폴짝이 끝날 때마다 준비됐는지 보고, 됐으면 이어서 재생한다
  // (폴짝의 끝 자세가 멈춘 자리의 자세와 같아서 이어 붙는 곳이 튀지 않는다).
  useEffect(() => {
    if (stage !== 'hold') {
      return;
    }
    let alive = true;
    let run: Animated.CompositeAnimation | null = null;
    const hop = () => {
      holdHop.setValue(0);
      run = Animated.timing(holdHop, {
        toValue: 1,
        duration: ((T.loadEnd - T.loadFrom) / T.hops) * 1000,
        easing: Easing.linear,
        useNativeDriver: native,
      });
      run.start(({ finished }) => {
        if (!alive || !finished) {
          return;
        }
        if (goRef.current) {
          setStage('end');
        } else {
          hop();
        }
      });
    };
    hop();
    return () => {
      alive = false;
      run?.stop();
    };
  }, [stage]);

  // 끝 구간: 남은 막대 채우기(8.2→9.2, 2배속) → 도착 점프·반짝임 → 막이 덮임. 끝나면 알린다.
  useEffect(() => {
    if (stage !== 'end') {
      return;
    }
    const steps = [play(T.loadEnd, (T.loadEnd - T.holdAt) / T.loadFastSpeed)];
    let from: number = T.loadEnd;
    for (const [to, speed] of T.finish) {
      steps.push(play(to, (to - from) / speed));
      from = to;
    }
    const run = Animated.sequence(steps);
    run.start(({ finished }) => finished && finish());
    return () => run.stop();
  }, [stage]);

  // 동작 줄이기: 마지막 장면을 그대로 두고 막대만 채운다
  useEffect(() => {
    if (stage !== 'calm') {
      return;
    }
    t.setValue(T.reduceFrame);
    const run = Animated.timing(calm, { toValue: 1, duration: T.calmFill * 1000, easing: Easing.linear, useNativeDriver: native });
    run.start(({ finished }) => finished && setStage('calmDone'));
    return () => run.stop();
  }, [stage]);
  useEffect(() => {
    if (stage === 'calmDone' && go) {
      finish();
    }
  }, [stage, go]);

  // 건너뛰기: 준비가 됐으면 바로 끝낸다. 준비 전이면 준비될 때까지 기다린다(빈 화면이 보이지 않게).
  useEffect(() => {
    if (skipped && go) {
      finish();
    }
  }, [skipped, go]);

  // 준비가 오래 걸리면 안내만 띄운다. 준비되면 안내를 치우고 이어서 재생한다.
  useEffect(() => {
    const id = setTimeout(() => {
      if (!goRef.current) {
        setDelayed(true);
      }
    }, T.delayAfter * 1000);
    return () => clearTimeout(id);
  }, []);

  const showDelay = delayed && !go;
  const fontReady = font === 'loaded';
  const moving = !reduce && tl !== null;

  return (
    <Pressable
      ref={rootRef}
      style={styles.root}
      onLayout={measure}
      onPress={() => setSkipped(true)}
      accessibilityRole="button"
      accessibilityLabel={SPLASH_SKIP_LABEL}
    >
      <SplashBackground stars={reduce ? null : stars} />

      {/* 자리를 재기 전에는 보이지 않게 둔다(완성된 장면이 잠깐 비치지 않도록) */}
      <View style={[styles.center, !tl && !reduce && styles.hidden]} pointerEvents="none">
        <Animated.View style={[styles.tagline, moving && { opacity: tl.tag.o, transform: [{ translateY: tl.tag.ty }] }]}>
          <Text style={styles.taglineText}>{SPLASH_TAGLINE}</Text>
        </Animated.View>

        <View style={styles.tagGap} />
        <SplashLogo letters={moving ? tl.letters : null} fontReady={fontReady} titleRef={titleRef} slotRef={slotRef} />

        <LoadingStrip
          tl={moving ? tl : null}
          hold={hold}
          holding={stage === 'hold'}
          fill={reduce || !tl ? calm : tl.fill}
          pct={reduce ? 100 : pct}
          dots={reduce ? null : dots}
          fontReady={fontReady}
        />
      </View>

      {geo && bursts && !reduce ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {bursts.map((b, i) => (
            <Animated.View
              key={i}
              style={[
                styles.burst,
                {
                  left: geo.title.cx,
                  top: geo.title.cy,
                  backgroundColor: b.color,
                  boxShadow: `6px 0 0 ${b.color}, -6px 0 0 ${b.color}, 0 6px 0 ${b.color}, 0 -6px 0 ${b.color}`,
                  opacity: tl!.burst.o,
                  transform: [{ translateX: b.x }, { translateY: b.y }],
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      {/* 돋보기 Q. 시안 시각 t로 등장 → 두리번 → Q 자리로 날아가 앉는다 */}
      {tl ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.icon,
            {
              opacity: tl.icon.show,
              transform: [
                { translateX: tl.icon.x },
                { translateY: tl.icon.y },
                { rotate: tl.icon.rot },
                { scaleX: tl.icon.sx },
                { scaleY: tl.icon.sy },
              ],
            },
          ]}
        >
          {mq ? <MagnifierQ mq={mq} variant={variant} fontReady={fontReady} /> : null}
        </Animated.View>
      ) : null}

      {showDelay ? (
        <View style={styles.delay}>
          <Card>
            <Text style={styles.delayTitle}>{SPLASH_DELAY.title}</Text>
            <Text>{SPLASH_DELAY.message}</Text>
          </Card>
        </View>
      ) : null}

      {/* 시작 막은 위로 걷히고, 끝 막은 아래에서 올라와 덮는다 */}
      {moving ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.curtain, { transform: [{ translateY: tl.curtainTop }] }]} />
          <Animated.View pointerEvents="none" style={[styles.curtain, { transform: [{ translateY: tl.curtainBottom }] }]} />
        </>
      ) : null}
    </Pressable>
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
  hidden: {
    opacity: 0,
  },
  tagline: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: SPLASH_COLORS.brown,
    borderRadius: 14,
    backgroundColor: SPLASH_COLORS.card,
    ...splashShadow(3),
  },
  taglineText: {
    fontSize: 14,
    fontWeight: '700',
    color: SPLASH_COLORS.ink,
  },
  tagGap: {
    height: S.tagGap,
  },
  // 돋보기 아이콘 박스(Q 외곽 크기). 이동·기울기·크기는 값으로 주고, 가운데(Q 외곽의 가운데)를 기준으로 돈다.
  icon: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: S.icon.width,
    height: S.icon.height,
  },
  burst: {
    position: 'absolute',
    width: S.star,
    height: S.star,
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
    borderColor: SPLASH_COLORS.brown,
  },
});
