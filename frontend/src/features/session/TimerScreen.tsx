import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useApiQuery, useQuackApi } from '@/api';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NoRecord } from '@/components/ui/NoRecord';
import { Text } from '@/components/ui/Text';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { growthFromXp } from '@/features/character/growth';
import { useCharacterXp } from '@/features/character/useCharacterXp';
import { phaseView } from '@/features/session/components/SessionPhasePanel';
import { StudyScene } from '@/features/session/StudyScene';
import { useExplanation } from '@/features/session/hooks/useExplanation';
import { useSessionTimer } from '@/features/session/hooks/useSessionTimer';
import { formatElapsed } from '@/features/session/machine';
import { COLORS, FONT, SIZES } from '@/theme/assetTokens';

// S-02 집중 타이머와 S-03 설명·꼬리 질문. 시간이 끊기지 않도록 한 화면 안에서 단계별 본문만 바꾼다.
export function TimerScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const api = useQuackApi();
  const session = useApiQuery((a) => (sessionId ? a.getSession(sessionId) : Promise.resolve(null)), [sessionId]);
  const folders = useApiQuery((a) => a.listFolders(), []);
  // 끝낸 세션으로 돌아오면(주소로 바로 들어오는 등) 진행 중인 공부가 없는 것으로 본다
  const activeSession = session?.status === 'active' ? session : null;
  const folder = folders?.find((f) => f.id === activeSession?.folder_id);
  const goal = activeSession?.goal;
  const timer = useSessionTimer();
  const demo = useDemoVariant();
  const explanation = useExplanation(timer, sessionId);
  const { stage } = growthFromXp(useCharacterXp(folder?.id ?? '') ?? 0);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  // 웹 브라우저 뒤로 가기로 나가려 할 때 띄우는 확인 창
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  // 세션이 진행 중이면 "공부 마치기"로만 나간다. 헤더 뒤로 버튼과 밀어서 뒤로 가기는 (app)/_layout.tsx 에서 숨긴다.
  // 앱(Android 뒤로 가기 버튼 포함)은 그냥 막는다. 웹 브라우저 뒤로 가기는 완전히 막을 수 없어서 기록 없이 나가는지 확인한다.
  // 공부 마치기나 기록 없이 나가기로 떠날 때는 막기를 함께 끈다(usePreventRemove가 둘을 맞추라고 경고한다)
  const [leaving, setLeaving] = useState(false);
  const active = !!folder && !!goal && !leaving;
  const disablePrevention = usePreventRemove(active, () => {
    if (Platform.OS === 'web') {
      setConfirmingLeave(true);
    }
  });

  if (session === undefined || folders === undefined) {
    return null;
  }
  if (!folder || !goal) {
    return <NoRecord message="진행 중인 공부가 없어요. 홈에서 다시 시작해 주세요." onHome={() => router.dismissTo('/home')} />;
  }

  const phase = timer.state.phase;
  // 분석 중에는 공부 마치기를 막는다(machine.ts 규칙)
  const canFinish = phase !== 'analyzing';
  // 설명 단계에서 보내지 않은 입력이 있으면 마치기 확인 창에 알린다
  const hasUnsent = phase === 'explaining' && explanation.draft.text.trim() !== '';

  // 앱은 공부 시간만 보낸다. 종료 상태와 끝낸 시각은 서버가 정하고, 설명 기록은 설명할 때마다 저장됐다.
  async function handleFinish() {
    const studyMs = timer.finish();
    setConfirmingFinish(false);
    await api.finishSession(sessionId!, { study_seconds: Math.floor(studyMs / 1000) });
    setLeaving(true);
    disablePrevention();
    // 세션 점검(S-04)으로 간다. ?demo= 값도 넘긴다(fail, grow 등).
    router.replace({ pathname: '/session/review', params: { sessionId, ...(demo ? { demo } : {}) } });
  }

  // 막힌 뒤로 가기를 다시 실행하지 않고 홈으로 간다
  function leaveWithoutRecord() {
    setConfirmingLeave(false);
    setLeaving(true);
    disablePrevention();
    router.dismissTo('/home');
  }

  const view = phaseView({
    folder,
    goal,
    timer,
    explanation,
    onFinish: () => setConfirmingFinish(true),
  });

  return (
    <BottomActionLayout
      gutter={SIZES.gutter}
      actions={
        <>
          {view.actions}
          {/* 설명하는 동안에는 쉬기·공부 마치기를 숨긴다. 끝내려면 답을 보내거나 돌아가기로 나온다 */}
          {phase === 'explaining' ? null : (
            <View style={styles.row}>
              {timer.running ? (
                <Button style={styles.half} title="잠깐 쉬기" onPress={timer.pause} />
              ) : (
                <Button style={styles.half} title="다시 시작" onPress={timer.resume} />
              )}
              <Button variant="primary" style={styles.half} title="공부 마치기" disabled={!canFinish} onPress={() => setConfirmingFinish(true)} />
            </View>
          )}
        </>
      }
    >
      {/* 장면 카드 안에만 배경 이미지를 그리고, 그 아래는 크림 바탕 위의 정보 영역이다 */}
      <StudyScene
        folder={folder}
        stage={stage}
        action={view.characterAction}
        onBack={() => setConfirmingLeave(true)}
        compact={phase === 'explaining'}
      />

      {/* 모든 단계에서 시간이 흐르고, 쉬기를 눌렀을 때만 멈춘다. AI와 대화하는 동안 멈출지는 미정이고 지금은 임시 구현이다 */}
      <View style={styles.top}>
        <Text>
          {folder.name} · {timer.running ? '집중 중' : '쉬는 중'}
        </Text>
        <Text style={styles.time} accessibilityRole="timer">
          {formatElapsed(timer.elapsedMs)}
        </Text>
        {/* 설명 입력 단계는 한 화면에 들어가도록 보조 문구를 줄인다 */}
        {phase === 'explaining' ? null : (
          <Text style={styles.sub}>{timer.running ? '지금 쌓이는 공부 시간' : '잠시 쉬어가는 중'}</Text>
        )}
      </View>

      {view.body}

      <ConfirmDialog
        visible={confirmingFinish}
        title="공부를 마칠까요?"
        message={`지금까지 ${formatElapsed(timer.elapsedMs)} 공부했어요. 기록을 저장하고 학습 점검으로 가요.${
          hasUnsent ? ' 보내지 않은 설명은 저장되지 않아요.' : ''
        }`}
        confirmLabel="공부 마치기"
        onConfirm={handleFinish}
        onCancel={() => setConfirmingFinish(false)}
      />

      <ConfirmDialog
        visible={confirmingLeave}
        title="공부를 그만두고 나갈까요?"
        message="이대로 나가면 이번 공부는 기록 없이 사라져요. 기록하려면 '공부 마치기'를 눌러 주세요."
        confirmLabel="기록 없이 나가기"
        onConfirm={leaveWithoutRecord}
        onCancel={() => setConfirmingLeave(false)}
      />
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  // 나란히 놓은 버튼이 폭을 반씩 나눈다
  half: {
    flex: 1,
  },
  // 경과 시간을 크게 보여 준다
  time: {
    fontSize: 52,
    fontWeight: FONT.title.fontWeight,
  },
  top: {
    alignItems: 'center',
    gap: 8,
  },
  sub: {
    color: COLORS.textSub,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
});
