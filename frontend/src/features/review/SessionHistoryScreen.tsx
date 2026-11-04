import type { ExplanationTurn, QuizPublic } from '@quack/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useApiQuery, useQuackApi } from '@/api';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NoRecord } from '@/components/ui/NoRecord';
import { QuizRunner } from '@/features/review/QuizRunner';
import { VERDICT_LABEL } from '@/features/review/report';
import { ReportSummary } from '@/features/review/ReportSummary';
import { useSessionReport } from '@/features/review/useAfterSession';

const TRIGGER_LABEL: Record<ExplanationTurn['trigger'], string> = {
  self: '스스로 설명',
  ai_question: '선생님 질문',
  follow_up: '꼬리 질문',
  re_explain: '다시 설명하기',
};

// 과목 상세(L-02)의 지난 학습 리포트. 설명 내용을 다시 보고 퀴즈를 다시 풀 수 있다.
// 퀴즈 다시 풀기는 연습이라 세션의 퀴즈 결과와 경험치를 바꾸지 않는다(리포트를 이미 받은 세션이라 서버가 바꾸지 않는다).
// 리포트를 받기 전에 점검에서 나간 세션은 여기서 리포트를 요청할 때 보상이 지급된다.
export function SessionHistoryScreen() {
  const { sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const api = useQuackApi();
  const session = useApiQuery((a) => a.getSession(sessionId), [sessionId]);
  const result = useSessionReport(sessionId);
  // 다시 풀 때마다 새 퀴즈(처음 상태)로 시작한다
  const [practice, setPractice] = useState<QuizPublic | null>(null);

  if (session === undefined || result === undefined) {
    return null;
  }
  if (!session || !result) {
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

  return (
    <BottomActionLayout
      actions={
        <Button variant="primary"
          title="퀴즈 다시 풀기"
          onPress={() => api.createQuiz(session.id).then((r) => setPractice(r.quiz))}
        />
      }
    >
      <Stack.Screen options={{ title: '학습 리포트' }} />

      <Text>{session.goal}</Text>
      <Text>{session.ended_at ? new Date(session.ended_at).toLocaleString() : ''}</Text>

      <ReportSummary report={result.report} />
      <Text>받은 경험치 +{result.rewards.xp} XP</Text>

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
