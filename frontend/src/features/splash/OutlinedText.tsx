import { Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { SPLASH_COLORS } from '@/features/splash/splashSpec';

// 시안의 text-shadow 8방향 3px 외곽선. RN 글자에는 외곽선이 없어서 갈색 사본을 겹쳐 그린다.
const OUTLINE = [
  [3, 0],
  [-3, 0],
  [0, 3],
  [0, -3],
  [3, 3],
  [-3, -3],
  [3, -3],
  [-3, 3],
] as const;
// 로고 글자 아래의 그림자(시안의 0 7px 계열 3개)
const DROP = [
  [0, 7],
  [3, 7],
  [-3, 7],
] as const;

type Props = {
  text: string;
  size: number;
  fill: string;
  // 글꼴 이름. 없으면(불러오지 못했으면) 시스템 글꼴로 굵게 그린다.
  family?: string;
  letterSpacing?: number;
  // true면 아래 그림자까지 그린다(로고 글자). false면 외곽선만(말풍선).
  drop?: boolean;
};

// 사본 11장(또는 8장) + 본문 1장이 겹친 글자. 본문이 칸의 크기를 정하고 사본은 그 위치에서 어긋나게 그려진다.
// 한계: 글자 하나에 Text가 12개라서 로고(4글자)만 해도 48개다. 장식이라 스크린 리더에는 읽어 주지 않는다.
export function OutlinedText({ text, size, fill, family, letterSpacing = 0, drop = false }: Props) {
  const base = {
    fontSize: size,
    lineHeight: size,
    letterSpacing,
    fontFamily: family,
    // 글꼴 파일이 이미 굵은 글꼴(Pixelify Sans Bold) 한 가지라서 굵기는 normal로 고정한다.
    // 더 굵게 요청하면 안드로이드·브라우저가 가짜 볼드를 겹쳐 글자가 두꺼워진다. 폴백(시스템 글꼴)일 때만 굵게 그린다.
    fontWeight: family ? ('normal' as const) : ('700' as const),
    // 웹: 브라우저가 가짜 볼드·기울임을 만들지 못하게 한다
    ...(Platform.OS === 'web' ? ({ fontSynthesis: 'none' } as object) : null),
  };
  const copies = drop ? [...OUTLINE, ...DROP] : OUTLINE;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {copies.map(([dx, dy]) => (
        <Text key={`${dx},${dy}`} style={[base, styles.copy, { left: dx, top: dy }]}>
          {text}
        </Text>
      ))}
      <Text style={[base, { color: fill }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    position: 'absolute',
    color: SPLASH_COLORS.brown,
  },
});
