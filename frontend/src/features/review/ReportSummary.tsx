import type { Report } from '@quack/shared';
import { StyleSheet, View } from 'react-native';

import { Banner } from '@/components/ui/Banner';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { COLORS, PAPER, RADIUS } from '@/theme/assetTokens';

// 리포트 본문(공부 시간, 설명한 개념, 설명 시도, 퀴즈 결과, 이해한 개념, 보완할 개념).
// 학습 리포트(S-05)와 과목 상세의 지난 리포트에서 같이 쓴다.
export function ReportSummary({ report }: { report: Report }) {
  const metrics = [
    { label: '공부 시간', value: `${Math.floor(report.duration_seconds / 60)}분` },
    { label: '설명한 개념', value: `${report.covered_concepts.length}개` },
    { label: '설명 시도', value: `${report.turn_count}회` },
    // 퀴즈를 풀지 않았으면 3개만 보인다
    ...(report.quiz_total !== null
      ? [
          {
            label: '퀴즈',
            value: `${report.quiz_correct}/${report.quiz_total}`,
            a11y: `퀴즈 ${report.quiz_total}개 중 ${report.quiz_correct}개 정답`,
          },
        ]
      : []),
  ];

  return (
    <>
      <View style={styles.row}>
        {metrics.map((m) => (
          <View key={m.label} style={styles.metric} accessible accessibilityLabel={'a11y' in m ? m.a11y : `${m.label} ${m.value}`}>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={styles.metricValue}>{m.value}</Text>
          </View>
        ))}
      </View>

      {report.covered_concepts.length === 0 ? (
        <Banner
          variant="hint"
          title="아직 충분한 설명이 없었어요"
          message={
            report.turn_count > 0
              ? '이번엔 설명한 개념이 없어요. 아래 보완할 개념을 한 번만 더 설명해 보면 금방 채워져요.'
              : '이번에는 설명을 보내지 않았어요. 다음에는 한 번만 내 말로 설명해 보세요.'
          }
        />
      ) : (
        <View style={styles.card}>
          <Text>이해한 개념</Text>
          {report.covered_concepts.map((c) => (
            <View key={c} style={styles.concept}>
              <Icon name="check" />
              <Text style={styles.conceptText}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text>보완할 개념</Text>
        {report.weak_concepts.length === 0 ? (
          <Text>보완할 개념이 없어요.</Text>
        ) : (
          report.weak_concepts.map((c) => (
            <View key={c} style={styles.weak}>
              {/* 점은 장식이라 스크린 리더에는 읽어 주지 않는다 */}
              <View style={styles.dot} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
              <Text style={styles.conceptText}>{c} — 다음에 더 알아봐요</Text>
            </View>
          ))
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  // 한 줄에 3~4개가 들어가서 좁은 화면에서는 라벨이 줄바꿈될 수 있다. 그래서 좌우 여백을 줄여 둔다.
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.medium,
    backgroundColor: COLORS.card,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.mutedStrong,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  concept: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conceptText: {
    flex: 1,
  },
  // 줄 높이 최소 44(누르는 곳은 아니지만 줄 간격을 넉넉히 둔다)
  weak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.accent,
  },
  card: {
    ...PAPER.card,
    gap: 4,
  },
});
