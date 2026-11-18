import type { RefObject } from 'react';
import { Animated, StyleSheet, View, type HostInstance } from 'react-native';

import { OutlinedText } from '@/features/splash/OutlinedText';
import { SPLASH_COLORS, SPLASH_FONT, SPLASH_SIZE } from '@/features/splash/splashSpec';
import type { buildTimeline } from '@/features/splash/splashChannels';

const LETTERS = ['u', 'a', 'c', 'k'];
const S = SPLASH_SIZE.title;

type Props = {
  // 시안 t로 움직이는 값. 동작 줄이기에서는 null이라 글자가 처음부터 보이고 움직이지 않는다.
  letters: ReturnType<typeof buildTimeline>['letters'] | null;
  // 글꼴을 쓸 수 있으면 true
  fontReady: boolean;
  // 화면에서 위치를 재려고 부모가 붙잡는 칸들
  titleRef: RefObject<HostInstance | null>;
  slotRef: RefObject<HostInstance | null>;
};

// 로고 줄: 왼쪽 Q 자리(96×112, 돋보기가 날아와 앉는다)와 오른쪽 "uack" 글자 4개.
// 글자는 오리가 지나가는 시점에 하나씩 튀어 오르고, 끝에서 로고 전체가 출렁인다(출렁임은 값에 들어 있다).
export function SplashLogo({ letters, fontReady, titleRef, slotRef }: Props) {
  return (
    <View ref={titleRef} style={styles.title} accessible accessibilityRole="header" accessibilityLabel="Quack">
      <View ref={slotRef} style={styles.slot} />
      <View style={styles.word}>
        {LETTERS.map((ch, i) => {
          const a = letters?.[i];
          return (
            <Animated.View
              key={ch}
              style={[
                styles.letter,
                a && {
                  opacity: a.o,
                  transform: [{ translateY: a.ty }, { scaleX: a.sx }, { scaleY: a.sy }],
                },
              ]}
            >
              <OutlinedText
                text={ch}
                size={S.letterSize}
                fill={SPLASH_COLORS.yellow}
                family={fontReady ? SPLASH_FONT : undefined}
                letterSpacing={S.letterSpacing}
                drop
              />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    height: S.height,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  slot: {
    width: SPLASH_SIZE.slot.width,
    height: SPLASH_SIZE.slot.height,
  },
  word: {
    flexDirection: 'row',
    marginLeft: S.wordGap,
    paddingBottom: S.wordPadBottom,
  },
  // 글자는 아래 가운데를 기준으로 눌리고 늘어난다
  letter: {
    transformOrigin: '50% 100%',
  },
});
