import { Animated, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text';
import { ip, SPLASH_COLORS, SPLASH_SIZE, SPLASH_TIME } from '@/features/splash/splashSpec';

const LETTERS = ['Q', 'u', 'a', 'c', 'k'];
// 글자 외곽선처럼 보이게 갈색 사본을 상하좌우로 겹치고, 아래에 그림자 사본을 한 장 더 둔다
const OUTLINE = [
  [-3, 0],
  [3, 0],
  [0, -3],
  [0, 3],
] as const;
const SHADOW_DROP = 6;
const LINE_HEIGHT = SPLASH_SIZE.logo * 1.2;

type Props = {
  // 시간표 t. 동작 줄이기에서는 null이라 글자가 처음부터 보이고 움직이지 않는다.
  t: Animated.Value | null;
};

// 로고 "Quack". 글자는 오리가 지나가는 시점에 하나씩 튀어 오르고, 끝에서 로고 전체가 한 번 눌린다.
// 한계: RN 글자에는 외곽선이 없어서 글자마다 사본을 겹쳐 그린다(Text 6개). 웹에서 깨지면 그림자 한 방향만 두는 쪽으로 줄인다.
export function SplashLogo({ t }: Props) {
  const T = SPLASH_TIME;
  const press = t
    ? {
        scaleX: ip(t, [[T.burstFrom, 1], [T.burstFrom + 0.15, 1.12], [T.burstTo, 1]]),
        scaleY: ip(t, [[T.burstFrom, 1], [T.burstFrom + 0.15, 0.92], [T.burstTo, 1]]),
      }
    : { scaleX: 1, scaleY: 1 };

  return (
    <Animated.View
      style={[styles.row, { transform: [{ scaleX: press.scaleX }, { scaleY: press.scaleY }] }]}
      accessible
      accessibilityRole="header"
      accessibilityLabel="Quack"
    >
      {LETTERS.map((ch, i) => (
        <Letter key={ch} ch={ch} t={t} start={T.letters[i]} />
      ))}
    </Animated.View>
  );
}

function Letter({ ch, t, start }: { ch: string; t: Animated.Value | null; start: number }) {
  const style = t
    ? {
        opacity: ip(t, [[0, 0], [start - 0.001, 0], [start, 1]]),
        transform: [
          { translateY: ip(t, [[start, 30], [start + 0.2, -30], [start + 0.36, 0], [start + 0.45, 0]]) },
          { scaleX: ip(t, [[start, 1], [start + 0.2, 1], [start + 0.36, 1.16], [start + 0.45, 1]]) },
          { scaleY: ip(t, [[start, 1], [start + 0.2, 1], [start + 0.36, 0.8], [start + 0.45, 1]]) },
        ],
      }
    : null;

  return (
    <Animated.View style={[styles.letter, style]} importantForAccessibility="no-hide-descendants">
      <Text style={[styles.text, styles.outline, { left: 0, top: SHADOW_DROP }]}>{ch}</Text>
      {OUTLINE.map(([dx, dy]) => (
        <Text key={`${dx}${dy}`} style={[styles.text, styles.outline, { left: dx, top: dy }]}>
          {ch}
        </Text>
      ))}
      <Text style={[styles.text, styles.fill]}>{ch}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  // 가장자리 사본이 잘리지 않게 여백을 둔다
  letter: {
    paddingHorizontal: 3,
    paddingBottom: SHADOW_DROP,
  },
  text: {
    fontSize: SPLASH_SIZE.logo,
    lineHeight: LINE_HEIGHT,
    fontWeight: '700',
  },
  outline: {
    position: 'absolute',
    color: SPLASH_COLORS.outline,
  },
  fill: {
    color: SPLASH_COLORS.yellow,
  },
});
