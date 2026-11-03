import type { ExplanationTurn } from '@quack/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

import { rewardGrantFor } from '@/api/mock/ledger';
import { createMockQuiz } from '@/api/mock/scenarios/quiz';
import { useTempStore } from '@/api/mock/tempStore';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NoRecord } from '@/components/ui/NoRecord';
import { QuizRunner } from '@/features/review/QuizRunner';
import { buildReport, VERDICT_LABEL } from '@/features/review/report';
import { ReportSummary } from '@/features/review/ReportSummary';

const TRIGGER_LABEL: Record<ExplanationTurn['trigger'], string> = {
  self: '스스로 설명',
  ai_question: '선생님 질문',
  follow_up: '꼬리 질문',
  re_explain: '다시 설명하기',
};

// 과목 상세(L-02)의 지난 학습 리포트. 설명 내용을 다시 보고 퀴즈를 다시 풀 수 있다.
// 퀴즈 다시 풀기는 연습이라 세션의 퀴즈 결과와 경험치를 바꾸지 않는다.
export function SessionHistoryScreen() {
  const { sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const { sessions, xpLedger } = useTempStore();
  const session = sessions.find((s) => s.id === sessionId);
  // 다시 풀 때마다 새 퀴즈(처음 상태)로 시작한다
  const [practice, setPractice] = useState<ReturnType<typeof createMockQuiz> | null>(null);

  if (!session) {
    return <NoRecord message="학습 기록을 찾을 수 없어요." onHome={() => router.dismissTo('/home')} />;
  }

  if (practice) {
    return (
      <QuizRunner
        quiz={practice}
        header={<Text>다시 풀어 보는 연습이에요. 리포트의 퀴즈 결과와 경험치는 바뀌지 않아요.</Text>}
        finishLabel="리포트로 돌아가기"
        onFinish={() => setPractice(null)}
      />
    );
  }

  const report = buildReport(session);
  const grant = rewardGrantFor(session.id, xpLedger);

  return (
    <BottomActionLayout
      actions={
        <Button title="퀴즈 다시 풀기" onPress={() => setPractice(createMockQuiz(session.id))} />
      }
    >
      <Stack.Screen options={{ title: '학습 리포트' }} />

      <Text>{session.goal}</Text>
      <Text>{session.ended_at ? new Date(session.ended_at).toLocaleString() : ''}</Text>

      <ReportSummary report={report} />
      {grant ? <Text>받은 경험치 +{grant.xp} XP</Text> : null}

      <Text>설명 내용</Text>
      {session.turns.length === 0 ? (
        <Text>이 공부에서는 설명한 내용이 없어요.</Text>
      ) : (
        session.turns.map((t) => (
          <View key={t.seq} style={styles.card}>
            <Text>
              {TRIGGER_LABEL[t.trigger]} · {t.analysis.concept} · 판정 {VERDICT_LABEL[t.analysis.verdict]}
            </Text>
            {t.question_text ? <Text>Q. {t.question_text}</Text> : null}
            <Text>{t.text}</Text>
          </View>
        ))
      )}
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    padding: 12,
    borderWidth: 1,
  },
});
