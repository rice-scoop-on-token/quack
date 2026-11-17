import { StyleSheet } from 'react-native';

import { useApiQuery } from '@/api';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { studyStreak } from '@/features/home/streak';
import { COLORS, FONT } from '@/theme/assetTokens';

// 홈 "연속 공부 N일째". 0일이어도 보여 준다. 로딩 중에는 숨겨서 0일째가 잠깐 보이는 깜빡임을 막는다.
export function StreakCard() {
  const sessions = useApiQuery((api) => api.listSessions(), []);
  if (!sessions) {
    return null;
  }
  const days = studyStreak(sessions, new Date());

  return (
    <Card style={styles.card} accessible accessibilityLabel={`연속 공부 ${days}일째`}>
      <Text style={styles.label}>연속 공부</Text>
      <Text style={styles.value}>{days}일째</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 2,
  },
  label: {
    ...FONT.caption,
    color: COLORS.textSub,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
});
