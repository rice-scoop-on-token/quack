import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { COLORS, FEEDBACK, PAPER } from '@/theme/assetTokens';
import { Button } from '@/components/ui/Button';
import { useApiQuery, useQuackApi } from '@/api';
import type { TempDailyQuizResult } from '@/api/tempContract';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { growthFromXp } from '@/features/character/growth';
import { SCREEN_ACTIONS } from '@/features/character/screenActions';
import { useCharacterXp } from '@/features/character/useCharacterXp';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';

const CHARACTER_SIZE = 120;

// Q-01 오늘의 퀴즈. 포인트나 경험치 없이 선생님 반응만 보여 준다.
export function DailyQuizScreen() {
  const api = useQuackApi();
  const quiz = useApiQuery((a) => a.getDailyQuiz(), []);
  const { selected } = useSelectedFolder();
  const xp = useCharacterXp(selected?.id ?? '');
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<TempDailyQuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!quiz) {
    return null;
  }
  const stage = xp === undefined ? undefined : growthFromXp(xp).stage;
  const action = !result
    ? SCREEN_ACTIONS.quizAsking
    : result.correct
      ? SCREEN_ACTIONS.quizCorrect
      : SCREEN_ACTIONS.quizWrong;

  return (
    <BottomActionLayout
      actions={
        <>
          {result ? (
            <Button variant="primary" title="잠금화면에서도 복습하기" onPress={() => router.push('/settings')} />
          ) : (
            <Button variant="primary"
              title="답 확인하기"
              disabled={picked === null || submitting}
              onPress={async () => {
                // 보내는 중에 다시 눌러 풀이가 두 번 기록되지 않게 막는다
                setSubmitting(true);
                try {
                  setResult(await api.submitDailyQuiz(quiz.id, picked!, { folder_id: selected?.id, source: 'app' }));
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          )}
        </>
      }
    >
      {selected ? (
        <>
          <Text>{selected.name} 선생님과 오늘의 퀴즈</Text>
          <View style={styles.character}>
            <CharacterBox speciesId={selected.species_id} stage={stage} size={CHARACTER_SIZE} action={action} />
          </View>
        </>
      ) : null}

      <Text>{quiz.prompt}</Text>

      {quiz.choices.map((choice, ci) => {
        const mark = !result ? null : ci === result.correct_answer ? 'correct' : ci === picked ? 'wrong' : null;
        return (
          <Pressable
            key={ci}
            style={[styles.choice, picked === ci && styles.selected, mark === 'correct' && styles.correct, mark === 'wrong' && styles.wrong]}
            disabled={!!result}
            onPress={() => setPicked(ci)}
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

      {/* 해설 자리는 늘 잡아 두어 답을 확인해도 보기가 밀리지 않는다 */}
      <View style={styles.explanation}>
        <Text style={styles.label}>해설</Text>
        <Text accessibilityLiveRegion="polite">
          {result ? `${result.correct ? '맞았어요! ' : '괜찮아요, 다시 연결해 봐요. '}${result.explanation}` : ' '}
        </Text>
      </View>
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  character: {
    height: CHARACTER_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  choice: {
    ...PAPER.option,
  },
  // 고른 보기는 주요색, 정답·오답은 FEEDBACK 색(글자 "(정답)", "(내 답)"도 함께 쓴다)
  selected: {
    backgroundColor: COLORS.primary,
  },
  correct: {
    backgroundColor: FEEDBACK.positive,
  },
  wrong: {
    backgroundColor: FEEDBACK.negative,
  },
  explanation: {
    ...PAPER.card,
    gap: 4,
    minHeight: 96,
  },
  // "해설" 작은 문구
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSub,
  },
});
