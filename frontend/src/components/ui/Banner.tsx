import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { COLORS, RADIUS } from '@/theme/assetTokens';

type Variant = 'notice' | 'hint' | 'error' | 'success';

type Props = {
  variant: Variant;
  title: string;
  message: string;
};

const BADGE = 28;

// 안내 배너. 색만으로 구분하지 않도록 배지 모양이 다르다: notice 원, hint 둥근 사각형, error 마름모, success 원(체크).
// error와 notice는 바로 알려야 해서 alert로 읽히고, 나머지는 role 없이 읽힌다.
export function Banner({ variant, title, message }: Props) {
  const tone = TONE[variant];

  return (
    <View
      style={[styles.box, { backgroundColor: tone.bg, borderColor: tone.border }]}
      accessibilityRole={variant === 'error' || variant === 'notice' ? 'alert' : undefined}
    >
      <Badge variant={variant} />
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const TONE: Record<Variant, { bg: string; border: string }> = {
  notice: { bg: COLORS.noticeBg, border: COLORS.outline },
  hint: { bg: COLORS.card, border: COLORS.outline },
  error: { bg: COLORS.dangerBg, border: COLORS.danger },
  success: { bg: COLORS.successBg, border: COLORS.outline },
};

// 장식이라 스크린 리더에는 읽어 주지 않는다(뜻은 제목과 본문이 전한다)
// 한계: ! ? 는 PNG가 아니라 글자로 그려서 폰트에 따라 1px 정도 어긋날 수 있다.
function Badge({ variant }: { variant: Variant }) {
  const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

  if (variant === 'error') {
    // 바깥 칸은 그대로 두고 안쪽 사각형만 45° 돌려 마름모로 만든다. 안의 글자는 반대로 돌려 바로 세운다.
    return (
      <View style={styles.badgeBox} {...hidden}>
        <View style={styles.diamond}>
          <Text style={[styles.glyph, { fontSize: 13, lineHeight: 15, color: COLORS.danger, transform: [{ rotate: '-45deg' }] }]}>
            !
          </Text>
        </View>
      </View>
    );
  }
  if (variant === 'hint') {
    return (
      <View style={[styles.badge, styles.square]} {...hidden}>
        <Text style={styles.glyph}>?</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.circle]} {...hidden}>
      {variant === 'success' ? <Icon name="check" /> : <Text style={styles.glyph}>!</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderRadius: RADIUS.medium,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    lineHeight: 13 * 1.55,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
  circle: {
    borderRadius: BADGE / 2,
    backgroundColor: COLORS.card,
  },
  square: {
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  badgeBox: {
    width: BADGE,
    height: BADGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamond: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.danger,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    transform: [{ rotate: '45deg' }],
  },
  glyph: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
});
