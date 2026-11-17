import type { SpeciesId } from '@quack/shared';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, View } from 'react-native';

import type { GrowthStage } from '@/api/tempContract';
import { Text } from '@/components/ui/Text';
import { CHARACTER_IMAGES } from '@/features/character/characterAssets';
import { pixelated } from '@/features/character/pixelated';
import { useReduceMotion } from '@/features/character/useReduceMotion';
import { josa } from '@/lib/josa';
import { COLORS, FONT, GROWTH, hardShadow, RADIUS, SIZES } from '@/theme/assetTokens';

// 성장 연출. 결과(성장 전·후 단계)를 받은 뒤 한 번 재생만 한다. 경험치나 성장 값은 여기서 만들거나 바꾸지 않는다.
// 시간표(초)는 모두 t 하나(0→끝, Animated.Value)에서 interpolate로 뽑아서, 요소마다 타이머를 따로 두지 않는다.

type Props = {
  speciesId: SpeciesId;
  before: GrowthStage;
  after: GrowthStage;
  // 캐릭터(동물) 이름. 비면 이름 없는 문구를 쓴다.
  name?: string;
  // 연출이 끝나거나 건너뛰면 한 번만 부른다
  onDone: () => void;
};

const BEFORE_SIZE = 110;
const AFTER_SIZE = 170;
const RING_SIZES = [300, 220, 140];
const BURST_SIZE = 120;
const SPARK_SQUARE = 6;
const SPARK_RISE = 90;
const SPARK_MS = 1600;
const SPARK_COUNT = 6;
const SPARK_X = [-70, -40, -12, 16, 44, 72];
const SHAKE_STEP = 0.18;
// 카드가 뜬 뒤 이 시간이 지나면 결과로 넘어간다
const CARD_HOLD = 1.6;

// 전체 연출 시간표(초)
const FULL = { fadeIn: 0.5, chargeEnd: 2.3, flashPeak: 2.55, flashEnd: 2.9, appearEnd: 3.7, burstEnd: 3.75, cardFrom: 3.1, cardTo: 3.6 };
// 동작 줄이기: 그림만 서서히 바꾸고 카드만 보여 준다
const CALM = { swapFrom: 0.4, swapTo: 0.8, cardFrom: 1.0, cardTo: 1.3 };

type Keys = [number, number][];

const native = Platform.OS !== 'web';

// 변신 뒤 안내 문구
function cardTexts(after: GrowthStage, name?: string) {
  const title = after === 'adult' ? '다 자랐어요!' : '자랐어요!';
  const stage = after === 'adult' ? '어른이' : after === 'child' ? '어린이가' : null;
  const subtitle = name && stage ? `${name}${josa(name, '이', '가')} ${stage} 됐어요` : '새로운 모습이 됐어요';
  return { title, subtitle };
}

export function GrowthEffect(props: Props) {
  const reduce = useReduceMotion();
  // 동작 줄이기 값을 받기 전에는 시작하지 않는다
  if (reduce === undefined) {
    return <View style={styles.root} />;
  }
  return <Playback {...props} reduce={reduce} />;
}

function Playback({ speciesId, before, after, name, onDone, reduce }: Props & { reduce: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  const sparks = useRef(Array.from({ length: SPARK_COUNT }, () => new Animated.Value(0))).current;
  const master = useRef<Animated.CompositeAnimation | null>(null);
  const done = useRef(false);

  const total = reduce ? CALM.cardTo + CARD_HOLD : FULL.cardTo + CARD_HOLD;

  const finish = () => {
    if (done.current) {
      return;
    }
    done.current = true;
    onDone();
  };

  useEffect(() => {
    const main = Animated.timing(t, {
      toValue: total,
      duration: total * 1000,
      easing: Easing.linear,
      useNativeDriver: native,
    });
    master.current = main;
    main.start(({ finished }) => {
      if (finished) {
        finish();
      }
    });
    // 반짝임: 아래에서 위로 올라가는 한 번 도는 움직임을 시차를 두고 두 번 반복한다(충전이 끝나면 위 층이 숨긴다)
    const sparkRuns = reduce
      ? []
      : sparks.map((p, i) =>
          Animated.sequence([
            Animated.delay((FULL.fadeIn + 0.2 * i) * 1000),
            Animated.loop(
              Animated.timing(p, { toValue: 1, duration: SPARK_MS, easing: Easing.linear, useNativeDriver: native }),
              { iterations: 2 },
            ),
          ]),
        );
    sparkRuns.forEach((a) => a.start());
    // 화면을 벗어나면 모든 애니메이션을 멈춘다
    return () => {
      main.stop();
      sparkRuns.forEach((a) => a.stop());
    };
    // 연출은 한 번만 재생한다
  }, []);

  const ip = (keys: Keys) =>
    t.interpolate({
      inputRange: keys.map((k) => k[0]),
      outputRange: keys.map((k) => k[1]),
      extrapolate: 'clamp',
    });

  // 끊어서 움직이는 떨림: 180ms마다 좌우로 바뀐다. ±3dp에서 ±4dp로 커진다.
  const shakeKeys = useMemo<Keys>(() => {
    const keys: Keys = [
      [0, 0],
      [FULL.fadeIn - 0.001, 0],
    ];
    const steps = Math.round((FULL.chargeEnd - FULL.fadeIn) / SHAKE_STEP);
    for (let i = 0; i < steps; i++) {
      const from = FULL.fadeIn + SHAKE_STEP * i;
      const x = (i % 2 === 0 ? 1 : -1) * (i < steps / 2 ? 3 : 4);
      keys.push([from, x], [from + SHAKE_STEP - 0.001, x]);
    }
    keys.push([FULL.chargeEnd, 0]);
    return keys;
  }, []);

  const f = FULL;
  const dimOpacity = ip([[0, 0], [f.fadeIn, 1]]);
  const beforeOpacity = reduce
    ? ip([[0, 1], [CALM.swapFrom, 1], [CALM.swapTo, 0]])
    : ip([[0, 1], [f.flashPeak - 0.001, 1], [f.flashPeak, 0]]);
  const afterOpacity = reduce
    ? ip([[0, 0], [CALM.swapFrom, 0], [CALM.swapTo, 1]])
    : ip([[0, 0], [f.flashPeak - 0.001, 0], [f.flashPeak, 1]]);
  const afterScale = reduce ? 1 : ip([[f.chargeEnd, 0.6], [2.9, 1.18], [3.2, 0.96], [3.45, 1.04], [f.appearEnd, 1]]);
  const cardFrom = reduce ? CALM.cardFrom : f.cardFrom;
  const cardTo = reduce ? CALM.cardTo : f.cardTo;
  const cardOpacity = ip([[cardFrom, 0], [cardTo, 1]]);
  const cardRise = reduce ? 0 : ip([[cardFrom, 24], [cardTo, 0]]);

  const texts = cardTexts(after, name);
  const beforeImage = CHARACTER_IMAGES[speciesId][before].base;
  const afterImage = CHARACTER_IMAGES[speciesId][after].base;

  return (
    <Pressable style={styles.root} onPress={() => {
      master.current?.stop();
      finish();
    }} accessibilityRole="button" accessibilityLabel="연출 건너뛰기">
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: GROWTH.dim, opacity: dimOpacity }]} />

      {reduce ? null : (
        <>
          {/* 빛 테두리 3겹 */}
          <Animated.View
            pointerEvents="none"
            style={[styles.layer, { opacity: ip([[0, 0], [f.fadeIn, 0], [0.7, 1], [f.chargeEnd, 1], [f.flashEnd, 0]]) }]}
          >
            {RING_SIZES.map((size, i) => (
              <Animated.View
                key={size}
                style={{
                  position: 'absolute',
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: GROWTH.glow[i],
                  transform: [{ scale: ip([[f.fadeIn, 0.6], [f.chargeEnd, 1.25]]) }],
                }}
              />
            ))}
          </Animated.View>

          {/* 사각 퍼짐 */}
          <Animated.View pointerEvents="none" style={[styles.layer, { opacity: ip([[0, 0], [f.flashPeak - 0.001, 0], [f.flashPeak, 1], [f.burstEnd, 0]]) }]}>
            <Animated.View
              style={{
                width: BURST_SIZE,
                height: BURST_SIZE,
                borderWidth: 4,
                borderColor: GROWTH.burst,
                transform: [{ rotate: '45deg' }, { scale: ip([[f.flashPeak, 0.3], [f.burstEnd, 2.6]]) }],
              }}
            />
          </Animated.View>
        </>
      )}

      {/* 성장 전 캐릭터(충전 중 칸 단위로 떨린다) */}
      <Animated.View
        pointerEvents="none"
        style={[styles.layer, { opacity: beforeOpacity, transform: [{ translateX: reduce ? 0 : ip(shakeKeys) }] }]}
      >
        <Image source={beforeImage} style={[{ width: BEFORE_SIZE, height: BEFORE_SIZE }, pixelated]} resizeMode="contain" />
      </Animated.View>

      {/* 성장 후 캐릭터 */}
      <Animated.View pointerEvents="none" style={[styles.layer, { opacity: afterOpacity, transform: [{ scale: afterScale }] }]}>
        <Image source={afterImage} style={[{ width: AFTER_SIZE, height: AFTER_SIZE }, pixelated]} resizeMode="contain" />
      </Animated.View>

      {reduce ? null : (
        <>
          {/* 픽셀 반짝임 6개 */}
          <Animated.View pointerEvents="none" style={[styles.layer, { opacity: ip([[0, 0], [f.fadeIn, 0], [f.fadeIn + 0.01, 1], [f.chargeEnd - 0.01, 1], [f.chargeEnd, 0]]) }]}>
            {sparks.map((p, i) => (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  width: SPARK_SQUARE * 3,
                  height: SPARK_SQUARE * 3,
                  left: '50%',
                  top: '50%',
                  marginLeft: SPARK_X[i] - SPARK_SQUARE * 1.5,
                  marginTop: 30 - SPARK_SQUARE * 1.5,
                  opacity: p.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -SPARK_RISE] }) }],
                }}
              >
                {/* 6dp 사각형 5개를 십자로 */}
                {[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]].map(([cx, cy]) => (
                  <View
                    key={`${cx}${cy}`}
                    style={{
                      position: 'absolute',
                      left: cx * SPARK_SQUARE,
                      top: cy * SPARK_SQUARE,
                      width: SPARK_SQUARE,
                      height: SPARK_SQUARE,
                      backgroundColor: GROWTH.spark[i % 2],
                    }}
                  />
                ))}
              </Animated.View>
            ))}
          </Animated.View>

          {/* 충전 문구 */}
          <Animated.View pointerEvents="none" style={[styles.layer, { opacity: ip([[f.fadeIn, 0], [0.7, 1], [2.2, 1], [f.chargeEnd, 0]]) }]}>
            <Text style={styles.charging}>무럭무럭 자라는 중이에요…</Text>
          </Animated.View>

          {/* 번쩍임. 한 번만 */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: GROWTH.flash, opacity: ip([[0, 0], [f.chargeEnd, 0], [f.flashPeak, 1], [f.flashEnd, 0]]) }]}
          />
        </>
      )}

      {/* 안내 카드 */}
      <Animated.View
        pointerEvents="none"
        style={[styles.cardLayer, { opacity: cardOpacity, transform: [{ translateY: cardRise }] }]}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{texts.title}</Text>
          <Text style={styles.cardSubtitle}>{texts.subtitle}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.screen,
    overflow: 'hidden',
  },
  // 화면 가운데에 겹쳐 놓는 층
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charging: {
    ...FONT.button,
    color: GROWTH.text,
    marginTop: 240,
  },
  cardLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    paddingHorizontal: SIZES.gutter,
    paddingBottom: 48,
  },
  card: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.large,
    backgroundColor: COLORS.card,
    ...hardShadow(SIZES.card.shadow),
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSub,
  },
});
