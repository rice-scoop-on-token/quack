import type { Report } from '@quack/shared';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { PAPER } from '@/theme/assetTokens';

// 리포트 본문(공부 시간, 설명한 개념, 설명 시도, 퀴즈 결과, 이해한 개념, 보완할 개념).
// 학습 리포트(S-05)와 과목 상세의 지난 리포트에서 같이 쓴다.
export function ReportSummary({ report }: { report: Report }) {
  return (
    <>
      <View style={styles.row}>
        <Text>공부 시간 {Math.floor(report.duration_seconds / 60)}분</Text>
        <Text>설명한 개념 {report.covered_concepts.length}개</Text>
        <Text>설명 시도 {report.turn_count}회</Text>
      </View>
      {report.quiz_total !== null ? (
        <Text>
          퀴즈 {report.quiz_correct} / {report.quiz_total}개 정답
        </Text>
      ) : null}

      <View style={styles.card}>
        <Text>이해한 개념</Text>
        {report.covered_concepts.length === 0 ? (
          <Text>이번에는 충분히 설명한 개념이 없어요.</Text>
        ) : (
          report.covered_concepts.map((c) => (
            <Text key={c}>✓ {c}</Text>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text>보완할 개념</Text>
        {report.weak_concepts.length === 0 ? (
          <Text>보완할 개념이 없어요.</Text>
        ) : (
          report.weak_concepts.map((c) => (
            <Text key={c}>· {c} — 다음에 더 알아봐요</Text>
          ))
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  card: {
    ...PAPER.card,
    gap: 4,
  },
});
