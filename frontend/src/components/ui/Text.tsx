import { Platform, StyleSheet, Text as RNText, type TextProps } from 'react-native';

import { COLORS, FONT } from '@/theme/assetTokens';

// 글자색을 고정 토큰으로 지정한 Text. 기본 Text는 시스템 다크 모드에서 글자색이 바뀌어 크림 바탕 위에서 흐려질 수 있다.
// 한국어는 띄어쓰기(어절) 단위로 줄바꿈한다.
// - iOS: lineBreakStrategyIOS="hangul-word"
// - 웹: word-break: keep-all (띄어쓰기 없는 아주 긴 글자는 overflow-wrap: anywhere로 넘치지 않게 한다)
// 한계: Android는 React Native가 한국어 어절 단위 줄바꿈 옵션(lineBreakWordStyle)을 주지 않아서 기본 줄바꿈을 따른다.
export function Text({ style, ...props }: TextProps) {
  return <RNText lineBreakStrategyIOS="hangul-word" {...props} style={[styles.body, style]} />;
}

const styles = StyleSheet.create({
  body: {
    ...FONT.body,
    color: COLORS.text,
    ...Platform.select({ web: { wordBreak: 'keep-all', overflowWrap: 'anywhere' } }),
  },
});
