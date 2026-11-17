import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/Text';
import { COLORS, PAPER } from '@/theme/assetTokens';

type Props = TextInputProps & {
  // 문자열이면 입력창 아래에 오류 문구를 보여 주고, true면 테두리만 오류 색으로 바꾼다
  error?: string | boolean;
};

// 종이 UI 입력창: 흰 바탕, 갈색 테두리, 안쪽 그림자. 포커스는 주황 테두리와 링, 오류는 빨간 테두리와 한 줄 문구.
// style은 TextInput에 적용된다(높이 등). 바깥 View는 폭만 따라간다.
export function PaperInput({ style, multiline, error, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;

  return (
    <View style={styles.wrap}>
      <TextInput
        placeholderTextColor={COLORS.textSub}
        selectionColor={COLORS.accent}
        cursorColor={COLORS.accent}
        multiline={multiline}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[PAPER.input, multiline && styles.multiline, focused && styles.focused, hasError && styles.error, style]}
      />
      {typeof error === 'string' && error ? (
        <View style={styles.errorRow} accessibilityRole="alert">
          <View style={styles.errorMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text style={styles.errorMarkText}>!</Text>
          </View>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  multiline: {
    textAlignVertical: 'top',
  },
  // 안쪽 그림자는 유지하고 바깥에 링을 더한다
  // 한계: 안드로이드 9 미만에서는 링이 그려지지 않고 주황 테두리만 보인다.
  focused: {
    borderColor: COLORS.accent,
    boxShadow: '0px 0px 0px 4px rgba(233,138,58,0.30), inset 0px 2px 0px rgba(75,50,38,0.12)',
  },
  error: {
    borderColor: COLORS.danger,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorMark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
  },
  errorMarkText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: COLORS.inputBg,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    color: COLORS.danger,
  },
});
