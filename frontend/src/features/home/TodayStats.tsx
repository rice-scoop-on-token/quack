import type { Folder } from '@quack/shared';
import { StyleSheet, Text, View } from 'react-native';

import { TEMP_USER_ID, useTempStore } from '@/api/mock/tempStore';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import type { StudySession } from '@/api/tempContract';
import { summarizeToday } from '@/features/home/todaySummary';

// 홈 오늘의 학습 기록. 모든 과목의 합이다.
export function TodayStats() {
  const { sessions, folders } = useTempStore();
  const demo = useDemoVariant();
  // ?demo=today: 저장된 기록 대신 두 과목으로 나뉜 오늘 기록 2건을 보여 준다(저장하지 않는다)
  const summary =
    demo === 'today'
      ? summarizeToday(demoSessions(), DEMO_FOLDERS, new Date())
      : summarizeToday(sessions, folders, new Date());

  return (
    <View style={styles.container}>
      {/* 오늘의 학습 기록 제목 */}
      <Text>오늘의 학습 기록</Text>

      {summary.count === 0 ? (
        // 오늘 기록 없음 안내
        <Text>아직 오늘 공부 기록이 없어요. 공부를 시작하면 여기에 쌓여요.</Text>
      ) : (
        <>
          {/* 오늘 숫자 기록 (공부 시간, 공부 횟수, 설명한 개념) */}
          <View style={styles.row}>
            <Text>오늘의 공부 {Math.floor(summary.totalSeconds / 60)}분</Text>
            <Text>공부 횟수 {summary.count}회</Text>
            {/* 설명한 개념 수는 설명 분석(커밋 6)이 생기면 연결한다 */}
            <Text>설명한 개념 0개</Text>
          </View>

          {/* 과목별 공부 시간 비율 막대 (스크린 리더는 아래 범례를 읽는다) */}
          <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {summary.bySubject.map((s) => (
              // 과목 한 칸 (공부 시간만큼 폭을 차지한다)
              <View key={s.folderId} style={{ flex: s.seconds, backgroundColor: s.color }} />
            ))}
          </View>

          {/* 과목별 범례 (색, 과목 이름, 공부 시간) */}
          {summary.bySubject.map((s) => (
            // 범례 항목
            <View key={s.folderId} style={styles.legend}>
              {/* 과목 색 표시 */}
              <View style={[styles.swatch, { backgroundColor: s.color }]} />
              <Text>{s.name}</Text>
              <Text>{Math.floor(s.seconds / 60)}분</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const DEMO_FOLDERS: Folder[] = [
  { id: 'demo-a', user_id: TEMP_USER_ID, name: '과목 A', species_id: 'rubber_duck', created_at: '' },
  { id: 'demo-b', user_id: TEMP_USER_ID, name: '과목 B', species_id: 'cat', created_at: '' },
];

function demoSessions(): StudySession[] {
  const ended = new Date().toISOString();
  const base = { user_id: TEMP_USER_ID, status: 'finished' as const, started_at: ended, ended_at: ended };
  return [
    { ...base, id: 'demo-1', folder_id: 'demo-a', goal: '데모', study_seconds: 25 * 60 },
    { ...base, id: 'demo-2', folder_id: 'demo-b', goal: '데모', study_seconds: 18 * 60 },
  ];
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
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
