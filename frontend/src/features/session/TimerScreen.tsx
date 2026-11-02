import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Button, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TEMP_USER_ID, tempId, useTempStore } from '@/api/mock/tempStore';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { growthFromXp } from '@/features/character/growth';
import { useCharacterXp } from '@/features/character/useCharacterXp';
import { useSessionTimer } from '@/features/session/hooks/useSessionTimer';
import { formatElapsed } from '@/features/session/machine';

// S-02 집중 타이머
export function TimerScreen() {
  const { folderId, goal } = useLocalSearchParams<{ folderId?: string; goal?: string }>();
  const { folders, addSession } = useTempStore();
  const folder = folders.find((f) => f.id === folderId);
  const timer = useSessionTimer();
  const { stage } = growthFromXp(useCharacterXp(folderId ?? ''));
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  // 웹 브라우저 뒤로 가기로 나가려 할 때 띄우는 확인 창
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  // 세션이 진행 중이면 "공부 마치기"로만 나간다. 헤더 뒤로 버튼과 밀어서 뒤로 가기는 (app)/_layout.tsx 에서 숨긴다.
  // 앱(Android 뒤로 가기 버튼 포함)은 그냥 막는다. 웹 브라우저 뒤로 가기는 완전히 막을 수 없어서 기록 없이 나가는지 확인한다.
  const active = !!folder && !!goal;
  const disablePrevention = usePreventRemove(active, () => {
    if (Platform.OS === 'web') {
      setConfirmingLeave(true);
    }
  });

  if (!folder || !goal) {
    return (
      <View style={styles.container}>
        {/* 세션 없음 안내 (주소로 바로 들어오거나 새로고침한 경우) */}
        <Text>진행 중인 공부가 없어요. 홈에서 다시 시작해 주세요.</Text>
        {/* 홈으로 가는 버튼 */}
        <Button title="홈으로" onPress={() => router.dismissTo('/home')} />
      </View>
    );
  }

  function handleFinish() {
    const { endedAt, studyMs } = timer.finish();
    // QuackApi 교체 지점: POST /sessions/:id/finish
    addSession({
      id: tempId(),
      user_id: TEMP_USER_ID,
      folder_id: folder!.id,
      goal: goal!,
      status: 'finished',
      started_at: new Date(timer.state.startedAt).toISOString(),
      ended_at: new Date(endedAt).toISOString(),
      study_seconds: Math.floor(studyMs / 1000),
    });
    setConfirmingFinish(false);
    disablePrevention();
    // 세션 점검·리포트(S-04, S-05)는 커밋 7에서 만든다. 그때 이동 위치를 점검 화면으로 바꾼다.
    router.dismissTo('/home');
  }

  // 막힌 뒤로 가기(공부 준비로 돌아가기)를 다시 실행하지 않고, 공부 마치기와 같게 홈으로 간다
  function leaveWithoutRecord() {
    setConfirmingLeave(false);
    disablePrevention();
    router.dismissTo('/home');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 과목과 집중 중 표시 */}
      <Text>{folder.name} · {timer.running ? '집중 중' : '쉬는 중'}</Text>
      {/* 오늘의 학습 목표 */}
      <Text>{goal}</Text>

      {/* 선생님 캐릭터와 한 줄 안내 */}
      <View style={styles.character}>
        <CharacterBox speciesId={folder.species_id} stage={stage} size={160} />
        <Text>{timer.running ? '나도 옆에서 읽고 있을게.' : '잠깐 쉬어가자.'}</Text>
      </View>

      {/* 경과 시간 (쉬는 시간은 빠지고, 선생님과 대화하는 시간은 들어간다) */}
      <View style={styles.character}>
        <Text accessibilityRole="timer">{formatElapsed(timer.elapsedMs)}</Text>
        <Text>{timer.running ? '지금 쌓이는 공부 시간' : '잠시 쉬어가는 중'}</Text>
      </View>

      {/* 쉬기·다시 시작, 공부 마치기 버튼 */}
      <View style={styles.row}>
        {/* 쉬기 또는 다시 시작 버튼 */}
        {timer.running ? (
          <Button title="잠깐 쉬기" onPress={timer.pause} />
        ) : (
          <Button title="다시 시작" onPress={timer.resume} />
        )}
        {/* 공부 마치기 버튼 */}
        <Button title="공부 마치기" onPress={() => setConfirmingFinish(true)} />
      </View>

      {/* 설명 시작 버튼 (설명 화면은 커밋 6에서 만든다) */}
      <Button title="이제 설명해 볼게 (준비 중)" disabled onPress={() => {}} />
      {/* AI 선제 질문 바로 보기 버튼 (커밋 6에서 만든다) */}
      <Button title="기다리지 않고 반응 보기 (준비 중)" disabled onPress={() => {}} />

      {/* 공부 마치기 확인 창 */}
      <ConfirmDialog
        visible={confirmingFinish}
        title="공부를 마칠까요?"
        message={`지금까지 ${formatElapsed(timer.elapsedMs)} 공부했어요. 기록을 저장하고 홈으로 가요.`}
        confirmLabel="공부 마치기"
        onConfirm={handleFinish}
        onCancel={() => setConfirmingFinish(false)}
      />

      {/* 웹 브라우저 뒤로 가기 확인 창 */}
      <ConfirmDialog
        visible={confirmingLeave}
        title="공부를 그만두고 나갈까요?"
        message="이대로 나가면 이번 공부는 기록 없이 사라져요. 기록하려면 '공부 마치기'를 눌러 주세요."
        confirmLabel="기록 없이 나가기"
        onConfirm={leaveWithoutRecord}
        onCancel={() => setConfirmingLeave(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  character: {
    alignItems: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
});
