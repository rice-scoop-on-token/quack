import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { analyzeExplanation } from '@/api/mock/scenarios/analysis';
import { createMockQuiz } from '@/api/mock/scenarios/quiz';
import { useTempStore } from '@/api/mock/tempStore';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import type { ExplanationAnalysis } from '@/api/tempContract';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NoRecord } from '@/components/ui/NoRecord';
import { QuizRunner } from '@/features/review/QuizRunner';
import { reExplainItems, VERDICT_LABEL, type ReExplainItem } from '@/features/review/report';
import { useAfterSession } from '@/features/review/useAfterSession';

const SEND_ERROR = '연결이 끊겼어요. 작성한 설명은 그대로 있어요. 다시 보내 주세요.';

// S-04 학습 점검. 보완할 개념이 있으면 다시 설명하기(선택)부터, 그다음 퀴즈(필수)를 풀고 리포트로 간다.
export function ReviewScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { session, params, leave } = useAfterSession(sessionId);
  const { addSessionTurn, setSessionQuiz } = useTempStore();
  const demo = useDemoVariant();
  // 다시 설명해 충분을 받으면 보완할 개념이 줄어들므로, 블록 목록은 처음 들어왔을 때 것으로 고정한다
  const [items] = useState<ReExplainItem[]>(() => (session ? reExplainItems(session) : []));
  const [step, setStep] = useState<'reExplain' | 'quiz'>(items.length > 0 ? 'reExplain' : 'quiz');
  const [quiz] = useState(() => createMockQuiz(sessionId ?? ''));
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // 블록(개념)별 분석 결과와 보내기 실패 문구
  const [analyses, setAnalyses] = useState<Record<string, ExplanationAnalysis>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  // ?demo=fail 은 여기서도 첫 분석 요청만 실패시킨다
  const callCount = useRef(0);

  if (!session) {
    return <NoRecord message="점검할 공부 기록이 없어요." onHome={() => leave(() => router.dismissTo('/home'))} />;
  }

  // 아직 분석을 받지 않았고 입력이 있는 블록만 보낸다(빈 블록은 그대로 둔다)
  const sendable = items.filter((it) => !analyses[it.concept] && drafts[it.concept]?.trim());
  const sentAny = Object.keys(analyses).length > 0;

  async function sendAll() {
    setSending(true);
    const batch = sendable.map((it) => {
      // React Compiler가 callCount.current++ 를 "먼저 올리고 쓰기"로 바꿀 수 있어서, 읽고 나서 따로 올린다
      const callIndex = callCount.current;
      callCount.current = callIndex + 1;
      const text = drafts[it.concept].trim();
      // 타이머 설명과 같은 분석 경로를 쓴다. 블록마다 따로 분석한다.
      return analyzeExplanation({
        concept: it.concept,
        text,
        trigger: 're_explain',
        followUpCount: 0,
        nextConcept: null,
        demo,
        callIndex,
      }).then(
        (analysis) => ({ it, text, analysis }),
        () => ({ it, text, analysis: null }),
      );
    });
    const done = await Promise.all(batch);
    const nextAnalyses: Record<string, ExplanationAnalysis> = {};
    // 이번에 보낸 블록의 실패 문구만 새로 정한다(성공한 블록은 문구를 지운다)
    const nextErrors: Record<string, string> = {};
    let seq = session!.turns.length;
    done.forEach(({ it, text, analysis }) => {
      if (!analysis) {
        nextErrors[it.concept] = SEND_ERROR;
        return;
      }
      nextAnalyses[it.concept] = analysis;
      seq += 1;
      addSessionTurn(session!.id, {
        seq,
        trigger: 're_explain',
        input_mode: 'chat',
        question_text: it.question,
        text,
        analysis,
      });
    });
    setAnalyses((prev) => ({ ...prev, ...nextAnalyses }));
    setErrors(nextErrors);
    setSending(false);
  }

  if (step === 'quiz') {
    return (
      <QuizRunner
        quiz={quiz}
        header={
          <>
            {/* 퀴즈 제목 */}
            <Text>짧은 퀴즈로 마무리해요</Text>
            <Text>외웠는지보다, 설명할 수 있는지가 중요해요.</Text>
          </>
        }
        onComplete={(graded) =>
          setSessionQuiz(session.id, {
            correct_count: graded.filter((r) => r.correct).length,
            total_count: graded.length,
          })
        }
        finishLabel="결과 리포트 보기"
        onFinish={() => leave(() => router.replace({ pathname: '/session/report', params }))}
      />
    );
  }

  return (
    <BottomActionLayout
      actions={
        <>
          {/* 입력한 블록만 한꺼번에 보내는 버튼 */}
          <Button
            title={sending ? '살펴보고 있어요…' : '설명 보내기'}
            disabled={sending || sendable.length === 0}
            onPress={sendAll}
          />
          {/* 퀴즈로 넘어가는 버튼 (다시 설명하기는 선택이다) */}
          <Button title={sentAny ? '퀴즈 풀기' : '건너뛰고 퀴즈 풀기'} disabled={sending} onPress={() => setStep('quiz')} />
        </>
      }
    >
      {/* 화면 제목과 설명 */}
      <Text>배운 내용을 한 번 더 꺼내볼까요?</Text>
      <Text>대답하지 못한 꼬리 질문을 골라 다시 설명해 보세요. 쓴 것만 보내져요.</Text>

      {items.map((it) => {
        const analysis = analyses[it.concept];
        const error = errors[it.concept];
        const expanded = open === it.concept || !!analysis || !!error;
        return (
          // 꼬리 질문 블록 (누르면 아래에 입력창이 펼쳐진다)
          <View key={it.concept} style={styles.block}>
            <Pressable
              onPress={() => setOpen(open === it.concept ? null : it.concept)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
            >
              {/* 개념 이름과 꼬리 질문 */}
              <Text>{it.concept}</Text>
              <Text>{it.question}</Text>
            </Pressable>
            {expanded ? (
              <>
                {/* 블록 설명 입력창 (분석을 받은 뒤에는 고칠 수 없다) */}
                <TextInput
                  style={styles.input}
                  value={drafts[it.concept] ?? ''}
                  onChangeText={(value) => setDrafts((prev) => ({ ...prev, [it.concept]: value }))}
                  multiline
                  editable={!analysis && !sending}
                  placeholder="내 말로 다시 설명해 보세요."
                />
                {/* 분석 결과 또는 실패 문구 */}
                {analysis ? (
                  <Text accessibilityLiveRegion="polite">
                    판정: {VERDICT_LABEL[analysis.verdict]} ·{' '}
                    {analysis.verdict === 'sufficient'
                      ? '이제 잘 설명했어요! 리포트에 이해한 개념으로 넣을게요.'
                      : `아직 조금 부족해요. 보완할 개념으로 남겨 둘게요.${
                          analysis.missing_concepts.length > 0
                            ? ` 더 채우면 좋은 부분: ${analysis.missing_concepts.join(', ')}`
                            : ''
                        }`}
                  </Text>
                ) : error ? (
                  <Text accessibilityRole="alert">{error}</Text>
                ) : null}
              </>
            ) : null}
          </View>
        );
      })}
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
  input: {
    minHeight: 72,
    borderWidth: 1,
    padding: 12,
  },
});
