import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { COLORS, PAPER } from '@/theme/assetTokens';
import { Button } from '@/components/ui/Button';
import { useApiQuery } from '@/api';
import { demoRecordSessions } from '@/api/mock/data/demoRecords';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { MoreList } from '@/components/ui/MoreList';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';
import {
  inRange,
  percentChange,
  periodBars,
  periodRange,
  recommendedGoal,
  weakConcepts,
  type PeriodKind,
} from '@/features/records/recordSummary';

const BAR_AREA_HEIGHT = 100;
const TABS: { id: PeriodKind; label: string; unit: string }[] = [
  { id: 'week', label: '이번 주', unit: '주' },
  { id: 'month', label: '이번 달', unit: '달' },
];

const sum = (sessions: { study_seconds: number }[]) => sessions.reduce((n, s) => n + s.study_seconds, 0);

// R-02 학습 분석
export function AnalysisScreen() {
  const demo = useDemoVariant();
  const sessions = useApiQuery((a) => a.listSessions(), []);
  const { folders, select } = useSelectedFolder();
  const [kind, setKind] = useState<PeriodKind>('week');

  if (!sessions || !folders) {
    return null;
  }
  const now = new Date();
  const all = demo === 'records' ? [...sessions, ...demoRecordSessions(folders.map((f) => f.id), now)] : sessions;

  const unit = TABS.find((t) => t.id === kind)!.unit;
  const current = inRange(all, periodRange(kind, now));
  const previous = inRange(all, periodRange(kind, now, 1));
  const change = percentChange(sum(current), sum(previous));
  const bars = periodBars(all, kind, now);
  const maxSeconds = Math.max(...bars.map((b) => b.seconds), 1);
  const weak = weakConcepts(current);
  const top = weak[0];

  const compare =
    change === null
      ? `지난 ${unit} 기록이 없어 비교할 수 없어요.`
      : change === 0
        ? `지난 ${unit}과 공부 시간이 같아요.`
        : `지난 ${unit}보다 ${Math.abs(change)}% ${change > 0 ? '늘었어요' : '줄었어요'}.`;

  // 추천 목표로 공부 준비를 연다. 그 개념을 공부한 과목을 고르고 목표를 미리 채운다.
  const startRecommended = () => {
    select(top.folder_id);
    router.push({ pathname: '/session/setup', params: { goal: recommendedGoal(top.concept) } });
  };

  return (
    <BottomActionLayout
      actions={<Button variant="primary" title="추천 목표로 공부하기" disabled={!top} onPress={startRecommended} />}
    >
      <View style={styles.row}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.tab, t.id === kind && styles.selected]}
            onPress={() => setKind(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: t.id === kind }}
          >
            <Text>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text>공부 시간 {Math.floor(sum(current) / 60)}분</Text>
      <Text accessibilityLiveRegion="polite">{compare}</Text>

      {/* 막대 그래프. 기간이 바뀌어도 높이가 변하지 않는다 */}
      <View style={styles.chart}>
        {bars.map((b) => (
          <View key={b.label} style={styles.barColumn}>
            <View style={styles.barArea}>
              <View
                style={[styles.bar, { height: Math.round((b.seconds / maxSeconds) * BAR_AREA_HEIGHT) }]}
                accessibilityLabel={`${b.label} ${Math.floor(b.seconds / 60)}분`}
              />
            </View>
            <Text>{b.label}</Text>
            <Text>{Math.floor(b.seconds / 60)}분</Text>
          </View>
        ))}
      </View>

      <Text>보완할 개념</Text>
      <MoreList
        key={kind}
        empty="보완할 개념이 없어요. 잘하고 있어요!"
        items={weak.map((w) => (
          <View key={w.concept} style={styles.card}>
            <Text>{w.concept}</Text>
            <Text>
              {folders.find((f) => f.id === w.folder_id)?.name ?? ''} · {w.count}번 부족했어요
            </Text>
          </View>
        ))}
      />

      <Text>추천 다음 공부</Text>
      <Text>{top ? recommendedGoal(top.concept) : '추천할 개념이 아직 없어요.'}</Text>
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    ...PAPER.option,
    flex: 1,
    alignItems: 'center',
  },
  selected: {
    backgroundColor: COLORS.primary,
  },
  chart: {
    ...PAPER.card,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barArea: {
    height: BAR_AREA_HEIGHT,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.outline,
  },
  bar: {
    width: '60%',
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: COLORS.outline,
  },
  card: {
    ...PAPER.card,
    gap: 4,
  },
});
