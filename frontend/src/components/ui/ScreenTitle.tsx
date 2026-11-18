import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { COLORS, FONT } from '@/theme/assetTokens';

type Props = {
  title: string;
  subtitle?: string;
};

// 화면 맨 위 제목과 부제. 항상 왼쪽 정렬이고, 제목 아래 4, 부제(또는 제목) 아래 16을 띄운다.
// 아래 16은 BottomActionLayout 본문의 칸 간격 12에 4를 더한 값이다.
export function ScreenTitle({ title, subtitle }: Props) {
  return (
    <View style={styles.box}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 4,
    marginBottom: 4,
  },
  title: {
    ...FONT.title,
  },
  subtitle: {
    ...FONT.body,
    color: COLORS.textSub,
  },
});
