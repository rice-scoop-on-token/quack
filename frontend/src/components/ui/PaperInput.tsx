import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { COLORS, PAPER } from '@/theme/assetTokens';

// 종이 UI 입력창: 크림 바탕, 갈색 테두리, 입력값과 placeholder 색을 구분한다.
export function PaperInput({ style, multiline, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={COLORS.textSub}
      selectionColor={COLORS.accent}
      cursorColor={COLORS.accent}
      multiline={multiline}
      {...props}
      style={[PAPER.input, multiline && styles.multiline, style]}
    />
  );
}

const styles = StyleSheet.create({
  multiline: {
    textAlignVertical: 'top',
  },
});
