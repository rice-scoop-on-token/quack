import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/features/navigation/icons';
import { COLORS, hardShadow, SIZES } from '@/theme/assetTokens';

type Props = {
  icon: IconName;
  // 아이콘만 있어서 글자가 없으므로 스크린 리더용 이름이 꼭 필요하다
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

// 44×44 아이콘 버튼. 테두리·하드 그림자·눌림은 Button과 같다(그림자 자리를 아래에 늘 비워 둔다).
export function IconButton({ icon, label, onPress, disabled = false }: Props) {
  const { shadow, border, radius } = SIZES.button;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ paddingBottom: shadow }}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.box,
            { borderWidth: border, borderRadius: radius },
            disabled ? styles.disabled : [{ backgroundColor: COLORS.card }, pressed ? { transform: [{ translateY: shadow }] } : hardShadow(shadow)],
          ]}
        >
          {/* 비활성은 불투명도 대신 아이콘 색을 바꿔 알린다 */}
          <Icon name={icon} tint={disabled ? COLORS.textSub : COLORS.text} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: COLORS.outline,
  },
  disabled: {
    backgroundColor: COLORS.disabledBg,
    borderColor: COLORS.textSub,
  },
});
