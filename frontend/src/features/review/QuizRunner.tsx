import type { QuizPublic, QuizQuestionResult } from '@quack/shared';
import { useState, type ReactNode } from 'react';
import { Button, Pressable, StyleSheet, Text } from 'react-native';

import { gradeMockQuiz } from '@/api/mock/scenarios/quiz';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';

type Props = {
  quiz: QuizPublic;
  // 문제 위에 보여 줄 내용(제목, 개념 칩 등)
  header?: ReactNode;
  // 마지막 문제까지 답을 확인했을 때 한 번 부른다
  onComplete?: (results: QuizQuestionResult[]) => void;
  // 마지막 문제를 확인한 뒤의 하단 버튼
  finishLabel: string;
  onFinish: () => void;
};

// 점검 퀴즈. 한 화면에 한 문제씩 보여 주고, 버튼은 하단에 고정해 해설이 늘어나도 위치가 바뀌지 않는다.
// 학습 점검(S-04)과 과목 상세의 지난 리포트(퀴즈 다시 풀기)에서 같이 쓴다.
export function QuizRunner({ quiz, header, onComplete, finishLabel, onFinish }: Props) {
  const total = quiz.questions.length;
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  // 답을 확인한 문제 수와 채점 결과
  const [checkedCount, setCheckedCount] = useState(0);
  const [results, setResults] = useState<QuizQuestionResult[] | null>(null);

  const current = quiz.questions[page];
  const picked = answers[page];
  const result = page < checkedCount ? results?.[page] : undefined;

  function checkAnswer() {
    // QuackApi 교체 지점: POST /quizzes/:id/submit (마지막 문제에서 한 번 보낸다)
    const graded = gradeMockQuiz(quiz, answers.map((a) => a ?? -1));
    setResults(graded);
    setCheckedCount(page + 1);
    if (page + 1 === total) {
      onComplete?.(graded);
    }
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
