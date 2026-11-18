import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { COLORS, FONT } from '@/theme/assetTokens';

type Props = {
  // 첫 줄(굵게)
  title: string;
  // 둘째 줄. 에러에는 다시 시도할 방법을 적는다
  message?: string;
  // 캐릭터나 그림처럼 위에 놓을 장식(선택)
  icon?: ReactNode;
  // 에러 상태이면 스크린 리더에 바로 알린다
  error?: boolean;
};

// 비어 있거나 실패했을 때의 안내. 항상 왼쪽 정렬이다.
export function EmptyState({ title, message, icon, error = false }: Props) {
  return (
    <View style={styles.box} accessibilityRole={error ? 'alert' : undefined}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 4,
  },
  title: {
    ...FONT.body,
    fontWeight: '700',
  },
  message: {
    ...FONT.body,
    color: COLORS.textSub,
  },
});
