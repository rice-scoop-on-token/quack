import type { QuizPublic } from '@quack/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { PAPER } from '@/theme/assetTokens';
import { PaperInput } from '@/components/ui/PaperInput';
import { Button } from '@/components/ui/Button';
import { useQuackApi } from '@/api';
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
  const api = useQuackApi();
  const { session, params, leave } = useAfterSession(sessionId);
  // 다시 설명해 충분을 받으면 보완할 개념이 줄어들므로, 블록 목록은 세션을 처음 불러왔을 때 것으로 고정한다
  const [items, setItems] = useState<ReExplainItem[] | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quiz, setQuiz] = useState<QuizPublic | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // 블록(개념)별 분석 결과와 보내기 실패 문구
  const [analyses, setAnalyses] = useState<Record<string, ExplanationAnalysis>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  if (session && items === null) {
    setItems(reExplainItems(session));
  }
  const step = quizStarted || items?.length === 0 ? 'quiz' : 'reExplain';

  useEffect(() => {
    if (step !== 'quiz' || !sessionId || quiz) {
      return;
    }
    let current = true;
    api.createQuiz(sessionId).then((r) => current && setQuiz(r.quiz));
    return () => {
      current = false;
    };
  }, [step, sessionId, quiz, api]);

  if (session === undefined || (session && items === null)) {
    return null;
  }
  if (!session || !items) {
    return <NoRecord message="점검할 공부 기록이 없어요." onHome={() => leave(() => router.dismissTo('/home'))} />;
  }

  // 아직 분석을 받지 않았고 입력이 있는 블록만 보낸다(빈 블록은 그대로 둔다)
  const sendable = items.filter((it) => !analyses[it.concept] && drafts[it.concept]?.trim());
  const sentAny = Object.keys(analyses).length > 0;

  // 타이머 설명과 같은 분석 경로(sendTurn)를 쓰고, 블록마다 따로 분석한다
  async function sendAll() {
    setSending(true);
    const done = await Promise.all(
      sendable.map((it) =>
        api
          .sendTurn(session!.id, {
            trigger: 're_explain',
            input_mode: 'chat',
            text: drafts[it.concept].trim(),
            question_text: it.question,
          })
          .then(
            (turn) => ({ it, analysis: turn.analysis }),
            () => ({ it, analysis: null }),
          ),
      ),
    );
    const nextAnalyses: Record<string, ExplanationAnalysis> = {};
    // 이번에 보낸 블록의 실패 문구만 새로 정한다(성공한 블록은 문구를 지운다)
    const nextErrors: Record<string, string> = {};
    done.forEach(({ it, analysis }) => {
      if (analysis) {
        nextAnalyses[it.concept] = analysis;
      } else {
        nextErrors[it.concept] = SEND_ERROR;
      }
    });
    setAnalyses((prev) => ({ ...prev, ...nextAnalyses }));
    setErrors(nextErrors);
    setSending(false);
  }

  if (step === 'quiz') {
    if (!quiz) {
      return null;
    }
    return (
      <QuizRunner
        quiz={quiz}
        header={
          <>
            <Text>짧은 퀴즈로 마무리해요</Text>
            <Text>외웠는지보다, 설명할 수 있는지가 중요해요.</Text>
          </>
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
          <Button variant="primary"
            title={sending ? '살펴보고 있어요…' : '설명 보내기'}
            disabled={sending || sendable.length === 0}
            onPress={sendAll}
          />
          {/* 다시 설명하기는 선택이라 보내지 않고도 퀴즈로 넘어갈 수 있다 */}
          <Button title={sentAny ? '퀴즈 풀기' : '건너뛰고 퀴즈 풀기'} disabled={sending} onPress={() => setQuizStarted(true)} />
        </>
      }
    >
      <Text>배운 내용을 한 번 더 꺼내볼까요?</Text>
      <Text>대답하지 못한 꼬리 질문을 골라 다시 설명해 보세요. 쓴 것만 보내져요.</Text>

      {items.map((it) => {
        const analysis = analyses[it.concept];
        const error = errors[it.concept];
        const expanded = open === it.concept || !!analysis || !!error;
        return (
          <View key={it.concept} style={styles.block}>
            <Pressable
              onPress={() => setOpen(open === it.concept ? null : it.concept)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
            >
              <Text>{it.concept}</Text>
              <Text>{it.question}</Text>
            </Pressable>
            {expanded ? (
              <>
                <PaperInput
                  style={styles.input}
                  value={drafts[it.concept] ?? ''}
                  onChangeText={(value) => setDrafts((prev) => ({ ...prev, [it.concept]: value }))}
                  multiline
                  editable={!analysis && !sending}
                  placeholder="내 말로 다시 설명해 보세요."
                />
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
  // 꼬리 질문을 담는 종이 카드
  block: {
    ...PAPER.card,
    gap: 8,
  },
  input: {
    minHeight: 72,
  },
});
