import { router } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { useQuackApi } from '@/api';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { TeacherSummary } from '@/features/character/TeacherSummary';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';
import { SubjectSelect } from '@/features/folder/SubjectSelect';

const GOAL_MAX_LENGTH = 140;

// S-01 공부 준비
export function SessionSetupScreen() {
  // 홈이나 과목 상세(L-02)에서 고른 과목을 기본값으로 쓴다
  const { folders, selected: selectedFolder, select } = useSelectedFolder();
  const api = useQuackApi();
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const demo = useDemoVariant();

  if (folders === undefined) {
    return null;
  }
  if (!selectedFolder) {
    return (
      <BottomActionLayout
        actions={
          <Button title="과목 만들기" onPress={() => router.replace('/subjects/new')} />
        }
      >
        <Text>공부할 과목이 없어요. 과목을 먼저 만들어 주세요.</Text>
      </BottomActionLayout>
    );
  }

  async function handleStart() {
    const trimmed = goal.trim();
    if (!trimmed) {
      setError('오늘의 목표를 적어 주세요.');
      return;
    }
    // 세션을 먼저 만들어 두고, 설명할 때마다 이 세션에 저장한다. 두 번 눌러 세션이 둘 생기지 않게 막는다.
    // selectedFolder는 위에서 확인했지만 함수 안이라 타입이 좁혀지지 않아 !를 쓴다.
    setStarting(true);
    const session = await api.startSession({ folder_id: selectedFolder!.id, goal: trimmed });
    // ?demo= 값은 화면 주소마다 따로라서 타이머 주소에도 넘긴다(?demo=hour 등)
    // 공부 준비는 바꿔 끼운다. 세션이 끝나면 앞 화면으로 돌아오지 않고 홈으로 가게 하기 위해서다.
    router.replace({
      pathname: '/session/timer',
      params: { sessionId: session.id, ...(demo ? { demo } : {}) },
    });
  }

  return (
    <BottomActionLayout
      actions={
        <Button title="타이머 시작" disabled={starting} onPress={handleStart} />
      }
    >
      <Text>오늘은 무엇을 알아볼까요?</Text>
      <Text>작은 목표 하나면 충분해요.</Text>

      <Text>공부할 과목</Text>
      {/* 홈의 과목 선택과 같은 값을 쓴다 */}
      <SubjectSelect folders={folders} value={selectedFolder} onChange={(f) => select(f.id)} />

      <TeacherSummary folder={selectedFolder} showCharacter />

      <View style={styles.form}>
        <Text>오늘의 학습 목표 (필수)</Text>
        <TextInput
          style={styles.input}
          value={goal}
          onChangeText={(value) => {
            setGoal(value);
            setError('');
          }}
          maxLength={GOAL_MAX_LENGTH}
          multiline
          placeholder="예: TCP와 UDP의 차이를 내 말로 설명하기"
        />
        {error ? <Text accessibilityRole="alert">{error}</Text> : null}
        <Text>
          {goal.length} / {GOAL_MAX_LENGTH}자
        </Text>
        <Text>‘이해하기’보다 ‘내 말로 설명하기’로 정해 보세요.</Text>
      </View>
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    padding: 12,
  },
});
