import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import type { IconName } from '@/features/navigation/icons';
import { COLORS, FONT, hardShadow, SIZES } from '@/theme/assetTokens';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  // primary: 화면에서 흐름을 앞으로 보내는 주요 동작 하나에만 쓴다. small: 목록·카드 안의 작은 버튼.
  variant?: 'primary' | 'secondary' | 'small';
  // 글자 앞에 놓는 아이콘(선택)
  icon?: IconName;
  // 나란히 놓을 때 폭을 나누는 용도(flex 등)
  style?: StyleProp<ViewStyle>;
  // true면 비활성 모양에 스피너를 붙이고 누르지 못하게 한다(요청을 기다리는 동안)
  loading?: boolean;
};

// 앱 공용 버튼. React Native 기본 Button 대신 쓴다.
// 그림자 높이만큼 아래 자리를 늘 비워 두어서, 눌렸을 때나 비활성일 때도 주변이 밀리지 않는다.
// 한계: 윗면 하이라이트(inset)와 하드 그림자는 안드로이드 9 미만에서 그려지지 않는다. 테두리와 색은 그대로다.
export function Button({ title, onPress, icon, disabled = false, loading = false, variant = 'secondary', style }: Props) {
  const dims = variant === 'small' ? SIZES.buttonSmall : SIZES.button;
  const off = disabled || loading;
  const highlight = variant === 'primary' ? 'rgba(255,255,255,0.55)' : '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      style={[{ alignSelf: 'stretch', paddingBottom: dims.shadow }, style]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.base,
            { minHeight: dims.height, borderRadius: dims.radius, borderWidth: dims.border },
            off
              ? styles.disabled
              : [
                  { backgroundColor: variant === 'primary' ? COLORS.primary : COLORS.card },
                  // 눌리면 그림자와 하이라이트를 빼고 그만큼 내려서 눌린 느낌을 준다
                  pressed
                    ? { transform: [{ translateY: dims.shadow }] }
                    : { boxShadow: `${hardShadow(dims.shadow).boxShadow}, inset 0px 2px 0px ${highlight}` },
                ],
          ]}
        >
          {loading ? (
            // 스피너 자체의 "불러오는 중" 낭독이 버튼 상태(busy)와 겹치지 않게 숨긴다
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Spinner />
            </View>
          ) : icon ? (
            <Icon name={icon} tint={off ? COLORS.mutedStrong : COLORS.text} />
          ) : null}
          <Text style={[styles.label, variant === 'small' && styles.smallLabel, off && styles.disabledLabel]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    color: COLORS.mutedStrong,
  },
});
