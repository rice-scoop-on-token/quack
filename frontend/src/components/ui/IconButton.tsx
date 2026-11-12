import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { COLORS, hardShadow, SIZES } from '@/theme/assetTokens';

type Props = {
  // 투명 배경 도트 이미지. 색은 tint로 칠한다.
  icon: ImageSourcePropType;
  // 아이콘만 있어서 글자가 없으므로 스크린 리더용 이름이 꼭 필요하다
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tint?: string;
};

const ICON_SIZE = 24;

// 44×44 아이콘 버튼. 테두리·하드 그림자·눌림은 Button과 같다(그림자 자리를 아래에 늘 비워 둔다).
export function IconButton({ icon, label, onPress, disabled = false, tint = COLORS.text }: Props) {
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
          <Image source={icon} style={{ width: ICON_SIZE, height: ICON_SIZE, tintColor: disabled ? COLORS.textSub : tint }} />
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
