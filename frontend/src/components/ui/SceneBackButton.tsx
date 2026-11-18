import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { COLORS, SIZES } from '@/theme/assetTokens';

// 장면 왼쪽 위에 얹는 뒤로가기 버튼(44×44)
export function SceneBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.button} accessibilityRole="button" accessibilityLabel="뒤로">
      <Icon name="back" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: SIZES.button.border,
    borderColor: COLORS.outline,
    borderRadius: SIZES.button.radius,
    backgroundColor: COLORS.card,
  },
});
