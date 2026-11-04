import { StyleSheet, Text as RNText, type TextProps } from 'react-native';

import { COLORS, FONT } from '@/theme/assetTokens';

// 글자색을 고정 토큰으로 지정한 Text. 기본 Text는 시스템 다크 모드에서 글자색이 바뀌어 크림 바탕 위에서 흐려질 수 있다.
export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[styles.body, style]} />;
}

const styles = StyleSheet.create({
  body: {
    ...FONT.body,
    color: COLORS.text,
  },
});
