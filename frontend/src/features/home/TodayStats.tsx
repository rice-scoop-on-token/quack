import { StyleSheet, View } from 'react-native';

import { useApiQuery } from '@/api';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { summarizeToday } from '@/features/home/todaySummary';

// 홈 오늘의 학습 기록. 모든 과목의 합이다.
export function TodayStats() {
  const sessions = useApiQuery((api) => api.listSessions(), []);
  const folders = useApiQuery((api) => api.listFolders(), []);
  if (!sessions || !folders) {
    return null;
  }
  const summary = summarizeToday(sessions, folders, new Date());

  return (
    <Card style={styles.container}>
      <Text>오늘의 학습 기록</Text>

      {summary.count === 0 ? (
        <Text>아직 오늘 공부 기록이 없어요. 공부를 시작하면 여기에 쌓여요.</Text>
      ) : (
        <>
          <View style={styles.row}>
            <Text style={styles.stat}>오늘의 공부 {Math.floor(summary.totalSeconds / 60)}분</Text>
            <Text style={styles.stat}>공부 횟수 {summary.count}회</Text>
            {/* 충분 판정을 받은 개념만 센다 */}
            <Text style={styles.stat}>설명한 개념 {summary.conceptCount}개</Text>
          </View>

          {/* 스크린 리더는 막대 대신 아래 범례를 읽는다 */}
          <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {summary.bySubject.map((s) => (
              <View key={s.folderId} style={{ flex: s.seconds, backgroundColor: s.color }} />
            ))}
          </View>

          {summary.bySubject.map((s) => (
            <View key={s.folderId} style={styles.legend}>
              <View style={[styles.swatch, { backgroundColor: s.color }]} />
              <Text style={styles.legendName}>{s.name}</Text>
              <Text>{Math.floor(s.seconds / 60)}분</Text>
            </View>
          ))}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  // 세 칸이 폭을 나눠 갖고, 글자가 넓은 갈무리 글꼴에서도 박스를 넘지 않고 어절 단위로 줄바꿈한다. minWidth 0이 없으면 칸이 줄어들지 못한다.
  stat: {
    flex: 1,
    minWidth: 0,
  },
  // 과목 이름이 길어도 분 숫자가 오른쪽에 남고 이름이 줄바꿈된다
  legendName: {
    flex: 1,
    minWidth: 0,
  },
  bar: {
    flexDirection: 'row',
    height: 12,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 12,
    height: 12,
  },
});
