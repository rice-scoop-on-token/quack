import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LoadingView } from '@/components/ui/LoadingView';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { Text } from '@/components/ui/Text';
import { COLORS, FEEDBACK, FONT, PAPER, SIZES } from '@/theme/assetTokens';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
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
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

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
        <IconButton icon="arrow-left" label="이전 달" onPress={() => moveMonth(-1)} />
        <Text style={styles.month}>
          {cursor.year}년 {cursor.month + 1}월
        </Text>
        {/* 이번 달이 마지막이라 미래 달로는 넘기지 않는다 */}
        <IconButton icon="arrow-right" label="다음 달" disabled={isCurrentMonth} onPress={() => moveMonth(1)} />
      </View>

      <View style={styles.summary}>
        <Text>이번 달 요약</Text>
        <Text>
          공부한 날 {summary.days}일 · 공부 시간 {Math.floor(summary.seconds / 60)}분 · 설명한 개념 {summary.concepts}개
        </Text>
      </View>

      <View style={styles.week}>
        {DAY_NAMES.map((n) => (
          <View key={n} style={[styles.cell, styles.day]}>
            <Text>{n}</Text>
          </View>
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
    // 버튼 아래에 그림자 자리가 있어서 가운데 맞춤 대신 위에 맞추고, 연·월은 버튼 몸통 높이(44)에 직접 맞춘다
    alignItems: 'flex-start',
    gap: 8,
  },
  // 연·월은 두 버튼 사이 가운데에 둔다
  month: {
    ...FONT.heading,
    flex: 1,
    height: SIZES.touchMin,
    lineHeight: SIZES.touchMin,
    textAlign: 'center',
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
  // 7등분. 요일 칸도 날짜 칸과 같은 day 스타일로 가운데에 맞춘다.
  cell: {
    width: `${100 / 7}%`,
    height: CELL_HEIGHT,
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
