import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useQuackApi } from '@/api';
import { MIN_QUIET_STUDY_SECONDS } from '@/api/tempContract';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';
import { SubjectSelect } from '@/features/folder/SubjectSelect';

// 초 → HH:MM:SS
function hms(total: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(total / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`;
}

// 조용히 공부하기. 선생님 없이 공부하는 시간만 잰다. 끝내면 그 시간이 공부 기록으로 남는다.
export function QuietStudyScreen() {
  const api = useQuackApi();
  const { folders, selected, select } = useSelectedFolder();
  // 쉬기 전까지 쌓인 시간(ms)과, 지금 재는 중이면 그 시작 시각(ms). 쉬는 중이면 runningSince가 null이다.
  const [started, setStarted] = useState(false);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const [doneSeconds, setDoneSeconds] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (runningSince === null) {
      return;
    }
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [runningSince]);

  if (folders === undefined) {
    return null;
  }
  if (!selected) {
    return (
      <BottomActionLayout actions={<Button variant="primary" title="과목 만들기" onPress={() => router.replace('/subjects/new')} />}>
        <Text>공부 시간을 기록할 과목이 없어요. 과목을 먼저 만들어 주세요.</Text>
      </BottomActionLayout>
    );
  }

  const finished = doneSeconds !== null;
  const running = runningSince !== null;
  const totalMs = accumulatedMs + (running ? now - runningSince : 0);
  const seconds = finished ? doneSeconds : Math.floor(totalMs / 1000);

  const start = () => {
    setStarted(true);
    setRunningSince(Date.now());
  };
  const pause = () => {
    setAccumulatedMs(totalMs);
    setRunningSince(null);
  };

  // 기록은 공부 시간으로 남고 경험치도 조금 쌓이지만, 경험치는 화면에 보여 주지 않는다. 쉰 시간은 빠진다.
  // 한계: 앱을 닫거나 새로고침하면 재던 시간이 사라진다. 끝내기 전에는 뒤로 가기를 막아 둔다.
  async function finish() {
    setSaving(true);
    setSaveFailed(false);
    const total = Math.floor(totalMs / 1000);
    // 시간을 멈추고 저장한다. 저장에 실패해도 잰 시간은 그대로 두어 다시 마칠 수 있다.
    setAccumulatedMs(totalMs);
    setRunningSince(null);
    try {
      // 짧은 시간은 저장하지 않는다(서버도 같은 기준으로 거른다)
      if (total >= MIN_QUIET_STUDY_SECONDS) {
        await api.saveQuietStudy({ folder_id: selected!.id, study_seconds: total });
      }
      setDoneSeconds(total);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomActionLayout
      actions={
        started ? (
          <>
            <Button
              title={running ? '잠시 쉬기' : '이어서 공부하기'}
              disabled={saving || finished}
              onPress={running ? pause : start}
            />
            <Button variant="primary" title="공부 마치기" disabled={saving || finished} onPress={finish} />
          </>
        ) : (
          <Button variant="primary" title="공부 시작" onPress={start} />
        )
      }
    >
      <Stack.Screen options={started && !finished ? { headerBackVisible: false, gestureEnabled: false } : {}} />

      <Text>과목</Text>
      {started ? (
        <Text>{selected.name}</Text>
      ) : (
        <SubjectSelect folders={folders} value={selected} onChange={(f) => select(f.id)} />
      )}

      <Text style={styles.time} accessibilityLiveRegion="none">
        {hms(seconds)}
      </Text>
      {/* 안내 자리는 늘 한 줄을 잡아 둔다 */}
      <Text accessibilityRole={saveFailed ? 'alert' : undefined}>
        {saveFailed
          ? '기록을 저장하지 못했어요. 다시 눌러 주세요.'
          : !started
            ? '시작하면 공부 시간만 재요.'
            : running
              ? '조용히 공부하는 중이에요.'
              : '잠시 쉬는 중이에요. 쉬는 시간은 기록하지 않아요.'}
      </Text>

      <ConfirmDialog
        visible={finished}
        title="공부를 마쳤어요"
        message={
          seconds < MIN_QUIET_STUDY_SECONDS
            ? '1분 미만은 기록하지 않아요.'
            : `오늘 ${hms(seconds)} 공부했어요. 공부 기록에 남겼어요.`
        }
        confirmLabel="확인"
        onConfirm={() => router.dismissTo('/home')}
      />
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  time: {
    textAlign: 'center',
    fontSize: 48,
    fontWeight: '700',
    paddingVertical: 24,
  },
});
