import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LoadingView } from '@/components/ui/LoadingView';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { Text } from '@/components/ui/Text';
import { COLORS, FEEDBACK, PAPER, SIZES } from '@/theme/assetTokens';
import { Button } from '@/components/ui/Button';
import { useApiQuery } from '@/api';
import { demoRecordSessions } from '@/api/mock/data/demoRecords';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { MoreList } from '@/components/ui/MoreList';
import { calendarCells, dayKey, DAY_NAMES, groupByDay, monthSummary } from '@/features/records/recordSummary';

const CELL_HEIGHT = 44;

// R-01 학습 달력
export function CalendarScreen() {
  const demo = useDemoVariant();
  const sessions = useApiQuery((a) => a.listSessions(), []);
  const folders = useApiQuery((a) => a.listFolders(), []);
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(dayKey(now));

  if (!sessions || !folders) {
    return <LoadingView />;
  }
  // ?demo=records: 실제 기록에 지난 4주 mock 세션을 더한다. 오늘 기록과 과목 상세에는 섞지 않는다.
  const all = demo === 'records' ? [...sessions, ...demoRecordSessions(folders.map((f) => f.id), now)] : sessions;
  const byDay = groupByDay(all);
  const summary = monthSummary(all, cursor.year, cursor.month);
  const cells = calendarCells(cursor.year, cursor.month);
  const todayKey = dayKey(now);

  const moveMonth = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    // 다른 달로 가면 고른 날짜는 풀어서, 안 보이는 날짜의 기록이 아래에 남지 않게 한다
    setSelected(null);
  };
  const keyOf = (day: number) => dayKey(new Date(cursor.year, cursor.month, day));
  const daySessions = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <BottomActionLayout
      inTab
      gutter={SIZES.gutter}
      actions={
        <Button variant="primary"
          title="기간별 분석 보기"
          onPress={() => router.push({ pathname: '/records/analysis', params: demo ? { demo } : {} })}
        />
      }
    >
      <ScreenTitle title="기록" subtitle="날짜를 눌러 그날의 공부를 돌아봐요." />

      <View style={styles.monthRow}>
        <Pressable
          style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
          onPress={() => moveMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="이전 달"
        >
          <Text style={styles.arrowMark}>‹</Text>
        </Pressable>
        <Text style={styles.month}>
          {cursor.year}년 {cursor.month + 1}월
        </Text>
        <Pressable
          style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
          onPress={() => moveMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="다음 달"
        >
          <Text style={styles.arrowMark}>›</Text>
        </Pressable>
      </View>

      <View style={styles.summary}>
        <Text>이번 달 요약</Text>
        <Text>
          공부한 날 {summary.days}일 · 공부 시간 {Math.floor(summary.seconds / 60)}분 · 설명한 개념 {summary.concepts}개
        </Text>
      </View>

      <View style={styles.week}>
        {DAY_NAMES.map((n) => (
          <Text key={n} style={styles.cell}>
            {n}
          </Text>
        ))}
      </View>
      {/* 달이 바뀌어도 높이가 변하지 않도록 늘 6주를 그린다 */}
      <View style={styles.grid}>
        {cells.map((day, i) =>
          day === null ? (
            <View key={i} style={styles.cell} />
          ) : (
            <Pressable
              key={i}
              style={[
                styles.cell,
                styles.day,
                byDay.has(keyOf(day)) && styles.studied,
                keyOf(day) === selected && styles.selected,
              ]}
              onPress={() => setSelected(keyOf(day))}
              accessibilityRole="button"
              accessibilityLabel={`${cursor.month + 1}월 ${day}일${byDay.has(keyOf(day)) ? ', 공부한 날' : ''}`}
              accessibilityState={{ selected: keyOf(day) === selected }}
            >
              <Text style={keyOf(day) === todayKey && styles.today}>{day}</Text>
            </Pressable>
          ),
        )}
      </View>

      <Text>{selected ? `${Number(selected.slice(5, 7))}월 ${Number(selected.slice(8))}일의 공부` : '날짜를 골라 주세요.'}</Text>
      {selected ? (
        <MoreList
          key={selected}
          empty="이 날은 공부 기록이 없어요."
          items={daySessions.map((s) => {
            const info = (
              <>
                <Text>{s.goal}</Text>
                <Text>
                  {folders.find((f) => f.id === s.folder_id)?.name ?? ''} · {Math.floor(s.study_seconds / 60)}분
                </Text>
              </>
            );
            // 조용히 공부한 세션은 볼 리포트가 없어서 누를 수 없는 카드로 둔다
            return s.quiet ? (
              <View key={s.id} style={styles.card}>
                {info}
              </View>
            ) : (
              <Pressable
                key={s.id}
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: '/subjects/[id]/sessions/[sessionId]', params: { id: s.folder_id, sessionId: s.id } })
                }
                accessibilityRole="button"
              >
                {info}
              </Pressable>
            );
          })}
        />
      ) : null}
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // 터치 영역 44×44, 화살표 글자는 28로 크게 보이게 한다
  arrow: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: SIZES.row.border,
    borderColor: COLORS.outline,
    borderRadius: SIZES.row.radius,
    backgroundColor: COLORS.card,
  },
  arrowPressed: {
    backgroundColor: COLORS.cream,
  },
  arrowMark: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  // 연·월은 두 버튼 사이 가운데에 둔다
  month: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  summary: {
    ...PAPER.card,
    gap: 4,
  },
  week: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // 7등분
  cell: {
    width: `${100 / 7}%`,
    height: CELL_HEIGHT,
    textAlign: 'center',
  },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 공부한 날은 칸을 칠한다. 스크린 리더에는 접근성 라벨로 알린다.
  studied: {
    backgroundColor: FEEDBACK.positive,
  },
  selected: {
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
  today: {
    fontWeight: '700',
  },
  card: {
    ...PAPER.card,
    gap: 4,
  },
});
