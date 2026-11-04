import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text';
import { COLORS, SIZES } from '@/theme/assetTokens';

// 장면 왼쪽 위에 얹는 뒤로가기 버튼(44×44)
export function SceneBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.button} accessibilityRole="button" accessibilityLabel="뒤로">
      <Text style={styles.arrow}>←</Text>
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
  arrow: {
    fontSize: 20,
    fontWeight: '700',
  },
});
