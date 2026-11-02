import { router } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { TeacherSummary } from '@/features/character/TeacherSummary';
import { SubjectSelect } from '@/features/folder/SubjectSelect';

const GOAL_MAX_LENGTH = 140;

// S-01 공부 준비
export function SessionSetupScreen() {
  // 홈이나 과목 상세(L-02)에서 고른 과목을 기본값으로 쓴다
  const { folders, selectedFolder, setSelectedFolderId } = useTempStore();
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');
  const demo = useDemoVariant();

  if (!selectedFolder) {
    return (
      <View style={styles.empty}>
        {/* 과목 없음 안내 */}
        <Text>공부할 과목이 없어요. 과목을 먼저 만들어 주세요.</Text>
        {/* 과목 만들기 버튼 */}
        <Button title="과목 만들기" onPress={() => router.replace('/subjects/new')} />
      </View>
    );
  }

  function handleStart() {
    const trimmed = goal.trim();
    if (!trimmed) {
      setError('오늘의 목표를 적어 주세요.');
      return;
    }
    // selectedFolder는 위에서 확인했지만 함수 안이라 타입이 좁혀지지 않아 !를 쓴다.
    // QuackApi 교체 지점: 여기서 sessions 행을 만들고(POST /sessions) 받은 세션 id로 타이머에 간다.
    // ?demo= 값은 화면 주소마다 따로라서 타이머 주소에도 넘긴다(?demo=hour 등)
    router.push({
      pathname: '/session/timer',
      params: { folderId: selectedFolder!.id, goal: trimmed, ...(demo ? { demo } : {}) },
    });
  }

  return (
    <BottomActionLayout
      actions={
        // 타이머 시작 버튼
        <Button title="타이머 시작" onPress={handleStart} />
      }
    >
      {/* 화면 제목과 설명 */}
      <Text>오늘은 무엇을 알아볼까요?</Text>
      <Text>작은 목표 하나면 충분해요.</Text>

      {/* 공부할 과목 선택 */}
      <Text>공부할 과목</Text>
      {/* 과목 선택 바 (홈의 과목 선택과 같이 바뀐다) */}
      <SubjectSelect folders={folders} value={selectedFolder} onChange={(f) => setSelectedFolderId(f.id)} />

      {/* 고른 과목의 선생님 요약 */}
      <TeacherSummary folder={selectedFolder} />

      {/* 오늘의 학습 목표 입력 */}
      <View style={styles.form}>
        {/* 입력창 제목 */}
        <Text>오늘의 학습 목표 (필수)</Text>
        {/* 학습 목표 입력창 */}
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
        {/* 입력 오류 문구 */}
        {error ? <Text accessibilityRole="alert">{error}</Text> : null}
        {/* 글자 수와 목표 작성 안내 */}
        <Text>
          {goal.length} / {GOAL_MAX_LENGTH}자
        </Text>
        <Text>‘이해하기’보다 ‘내 말로 설명하기’로 정해 보세요.</Text>
      </View>
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  form: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    padding: 12,
  },
});
