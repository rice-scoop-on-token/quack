import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { COLORS, FONT, hardShadow, SIZES } from '@/theme/assetTokens';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  // primary: 화면에서 흐름을 앞으로 보내는 주요 동작 하나에만 쓴다. small: 목록·카드 안의 작은 버튼.
  variant?: 'primary' | 'secondary' | 'small';
  // 나란히 놓을 때 폭을 나누는 용도(flex 등)
  style?: StyleProp<ViewStyle>;
};

// 앱 공용 버튼. React Native 기본 Button 대신 쓴다.
// 그림자 높이만큼 아래 자리를 늘 비워 두어서, 눌렸을 때나 비활성일 때도 주변이 밀리지 않는다.
export function Button({ title, onPress, disabled = false, variant = 'secondary', style }: Props) {
  const dims = variant === 'small' ? SIZES.buttonSmall : SIZES.button;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[{ alignSelf: 'stretch', paddingBottom: dims.shadow }, style]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.base,
            { minHeight: dims.height, borderRadius: dims.radius, borderWidth: dims.border },
            disabled
              ? styles.disabled
              : [
                  { backgroundColor: variant === 'primary' ? COLORS.primary : COLORS.card },
                  // 눌리면 그림자를 빼고 그만큼 내려서 눌린 느낌을 준다
                  pressed ? { transform: [{ translateY: dims.shadow }] } : hardShadow(dims.shadow),
                ],
          ]}
        >
          <Text style={[styles.label, variant === 'small' && styles.smallLabel, disabled && styles.disabledLabel]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderColor: COLORS.outline,
  },
  disabled: {
    backgroundColor: COLORS.disabledBg,
    borderColor: COLORS.textSub,
  },
  label: {
    ...FONT.button,
    textAlign: 'center',
  },
  smallLabel: {
    fontSize: 14,
  },
  disabledLabel: {
    color: COLORS.textSub,
  },
});
