import type { QuizPublic, QuizQuestionResult } from '@quack/shared';
import { useState, type ReactNode } from 'react';
import { Button, Pressable, StyleSheet, Text } from 'react-native';

import { useQuackApi } from '@/api';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';

type Props = {
  quiz: QuizPublic;
  header?: ReactNode;
  // 마지막 문제를 확인한 뒤의 하단 버튼
  finishLabel: string;
  onFinish: () => void;
};

// 점검 퀴즈. 버튼은 하단에 고정해 해설이 늘어나도 위치가 바뀌지 않는다.
// 학습 점검(S-04)과 과목 상세의 지난 리포트(퀴즈 다시 풀기)에서 같이 쓴다.
export function QuizRunner({ quiz, header, finishLabel, onFinish }: Props) {
  const api = useQuackApi();
  const total = quiz.questions.length;
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  // 답을 확인한 문제 수와 채점 결과
  const [checkedCount, setCheckedCount] = useState(0);
  const [results, setResults] = useState<QuizQuestionResult[] | null>(null);

  const current = quiz.questions[page];
  const picked = answers[page];
  const result = page < checkedCount ? results?.[page] : undefined;

  // 한 문제씩 정답과 해설을 보여 주려고, 답을 확인할 때마다 지금까지 푼 답을 모두 보낸다. 마지막 제출에 모든 답이 들어간다.
  // 한계: 서버에 풀이 시도가 문제 수만큼 남는다. 서버가 문제마다 제출을 받을지, 시도를 하나로 합칠지 BE와 정해야 한다.
  async function checkAnswer() {
    const answered = quiz.questions.slice(0, page + 1).map((q, i) => ({ question_id: q.id, answer: answers[i] ?? 0 }));
    const { results: graded } = await api.submitQuiz(quiz.id, { answers: answered });
    setResults(graded);
    setCheckedCount(page + 1);
  }

  return (
    <BottomActionLayout
      actions={
        !result ? (
          <Button title="답 확인하기" disabled={picked === null} onPress={checkAnswer} />
        ) : page + 1 < total ? (
          <Button title="다음 문제" onPress={() => setPage(page + 1)} />
        ) : (
          <Button title={finishLabel} onPress={onFinish} />
        )
      }
    >
      {header}

      <Text>
        문제 {page + 1} / {total}
      </Text>
      <Text>{current.prompt}</Text>

      {current.choices.map((choice, ci) => {
        // 답을 확인하면 정답 보기는 초록, 내가 고른 오답 보기는 빨강
        const mark = !result ? null : ci === result.correct_answer ? 'correct' : ci === picked ? 'wrong' : null;
        return (
          <Pressable
            key={ci}
            style={[
              styles.choice,
              picked === ci && styles.selected,
              mark === 'correct' && styles.correct,
              mark === 'wrong' && styles.wrong,
            ]}
            disabled={!!result}
            onPress={() => setAnswers((prev) => prev.map((a, i) => (i === page ? ci : a)))}
            accessibilityRole="radio"
            accessibilityState={{ checked: picked === ci, disabled: !!result }}
          >
            <Text>
              {String.fromCharCode(65 + ci)}. {choice}
              {/* 색만으로 구분하지 않도록 글자로도 알린다 */}
              {mark === 'correct' ? ' (정답)' : mark === 'wrong' ? ' (내 답)' : ''}
            </Text>
          </Pressable>
        );
      })}

      {result ? (
        <Text accessibilityLiveRegion="polite">
          {result.correct ? '맞았어요! ' : '괜찮아요, 다시 연결해 봐요. '}
          {result.explanation}
        </Text>
      ) : null}
      {result && page + 1 === total && results ? (
        <Text>
          {results.filter((r) => r.correct).length} / {total}개 맞혔어요.
        </Text>
      ) : null}
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  choice: {
    padding: 12,
    borderWidth: 1,
  },
  // 고른 보기 강조 (임시 스타일)
  selected: {
    borderWidth: 3,
  },
  // 정답·오답 표시 색 (임시 색, 디자인 작업 때 바꾼다)
  correct: {
    borderColor: '#2e7d32',
    backgroundColor: '#e8f5e9',
  },
  wrong: {
    borderColor: '#c62828',
    backgroundColor: '#ffebee',
  },
});
