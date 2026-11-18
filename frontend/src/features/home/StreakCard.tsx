import { StyleSheet, View } from 'react-native';

import { useApiQuery } from '@/api';
import { Card } from '@/components/ui/Card';
import { CampfireFlame } from '@/components/ui/CampfireFlame';
import { Text } from '@/components/ui/Text';
import { studyStreak } from '@/features/home/streak';
import { COLORS, FONT, RADIUS } from '@/theme/assetTokens';

// 홈 "연속 공부 N일째". 0일이어도 보여 준다. 로딩 중에는 숨겨서 0일째가 잠깐 보이는 깜빡임을 막는다.
export function StreakCard() {
  const sessions = useApiQuery((api) => api.listSessions(), []);
  if (!sessions) {
    return null;
  }
  const days = studyStreak(sessions, new Date());

  return (
    <Card style={styles.card} accessible accessibilityLabel={`연속 공부 ${days}일째`}>
      {/* 장식이라 스크린 리더에는 읽어 주지 않는다. 0일째에도 같은 모양이다. */}
      <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <CampfireFlame size={28} still />
      </View>
      <View style={styles.texts}>
        <Text style={styles.label}>연속 공부</Text>
        <Text style={styles.value}>{days}일째</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.medium,
    backgroundColor: COLORS.primary,
  },
  texts: {
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
