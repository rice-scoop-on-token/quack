import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LoadingView } from '@/components/ui/LoadingView';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { COLORS, PAPER, SIZES } from '@/theme/assetTokens';
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
const OS_TABS = [
  { id: 'android', label: 'Android' },
  { id: 'ios', label: 'iOS' },
] as const;

// Q-03 잠금화면 미리보기
// 한계: 실제 잠금화면에는 띄울 수 없어서 앱 안의 가짜 화면으로 흉내 낸다.
export function LockPreviewScreen() {
  const api = useQuackApi();
  const settings = useApiQuery((a) => a.getLockQuizSettings(), []);
  const quiz = useApiQuery((a) => a.getDailyQuiz(), []);
  const { folders, selected } = useSelectedFolder();
  const xp = useCharacterXp(selected?.id ?? '');
  const [os, setOs] = useState<'android' | 'ios'>('android');
  const [step, setStep] = useState<'asking' | 'answered' | 'skipped'>('asking');
  const [result, setResult] = useState<TempDailyQuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!settings || !quiz || folders === undefined) {
    return <LoadingView />;
  }
  const folder = folders.find((f) => f.id === settings.folder_id) ?? selected;
  const stage = xp === undefined ? undefined : growthFromXp(xp).stage;
  const reset = () => {
    setStep('asking');
    setResult(null);
  };
  const answer = async (ci: number) => {
    // 보내는 중에 다시 눌러 풀이가 두 번 기록되지 않게 막는다
    setSubmitting(true);
    try {
      setResult(await api.submitDailyQuiz(quiz.id, ci, { folder_id: folder?.id, source: 'lock' }));
      setStep('answered');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomActionLayout
      actions={
        <>
          <Button title="설정 열기" onPress={() => router.push('/settings')} />
          <Button variant="primary" title="앱에서 이어보기" onPress={() => router.push('/quizzes/today')} />
        </>
      }
    >
      <View style={styles.row}>
        {OS_TABS.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.tab, t.id === os && styles.selected]}
            onPress={() => {
              setOs(t.id);
              reset();
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: t.id === os }}
          >
            <Text>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {!settings.enabled ? (
        <Text>잠금화면 퀴즈가 꺼져 있어요. 설정에서 켜면 이렇게 보여요.</Text>
      ) : null}

      <View style={styles.phone}>
        <View style={styles.lockRow}>
          <Icon name="lock" />
          <Text>잠김 · 오전 9:41</Text>
        </View>
        {folder ? (
          <View style={styles.character}>
            <CharacterBox
              speciesId={folder.species_id}
              stage={stage}
              size={CHARACTER_SIZE}
              action={SCREEN_ACTIONS.lockPreview}
            />
          </View>
        ) : null}

        <View style={styles.card}>
          <Text>{os === 'ios' ? '알림 · 오늘의 퀴즈' : '오늘의 퀴즈 · 지금'}</Text>
          {step === 'skipped' ? (
            <Text>이번엔 쉬었어요. 다음 퀴즈에서 만나요.</Text>
          ) : (
            <>
              <Text>{quiz.prompt}</Text>
              {quiz.choices.map((choice, ci) => (
                <Pressable
                  key={ci}
                  style={styles.choice}
                  disabled={step === 'answered' || submitting}
                  onPress={() => answer(ci)}
                  accessibilityRole="button"
                >
                  <Text>
                    {String.fromCharCode(65 + ci)}. {choice}
                  </Text>
                </Pressable>
              ))}
              {result ? (
                <Text accessibilityLiveRegion="polite">
                  {result.correct ? '맞았어요! ' : '아쉬워요. '}
                  {result.explanation}
                </Text>
              ) : null}
            </>
          )}
        </View>

        {step === 'asking' ? <Button variant="small" title="이번엔 쉬기" onPress={() => setStep('skipped')} /> : <Button variant="small" title="처음으로" onPress={reset} />}
      </View>
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
  // 단계가 바뀌어도 가짜 화면이 흔들리지 않도록 최소 높이를 잡는다
  phone: {
    ...PAPER.card,
    gap: 8,
    minHeight: 520,
  },
  character: {
    height: CHARACTER_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  card: {
    ...PAPER.card,
    gap: 8,
    minHeight: 200,
  },
  choice: {
    ...PAPER.option,
    minHeight: SIZES.touchMin,
  },
});
