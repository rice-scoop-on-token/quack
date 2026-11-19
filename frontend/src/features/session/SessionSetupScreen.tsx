import { startSessionRequestSchema, type StartSessionRequest } from '@quack/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/errors';
import { LoadingView } from '@/components/ui/LoadingView';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { Text } from '@/components/ui/Text';
import { PaperInput } from '@/components/ui/PaperInput';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { useQuackApi } from '@/api';
import { tempId } from '@/api/mock/ids';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { TeacherSummary } from '@/features/character/TeacherSummary';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';
import { SubjectSelect } from '@/features/folder/SubjectSelect';
import { COLORS, FONT } from '@/theme/assetTokens';

const GOAL_MAX_LENGTH = 140;
// 서버의 AI 판정 대기(30초)보다 길게 45초로 둔다. 앱이 먼저 포기하면 서버는 계속 처리 중인데 같은 request_id로 다시 보내
// 사용량이 두 번 차감될 수 있다(PR #32 리뷰). /turns의 TURN_TIMEOUT_MS(45_000)와 같은 값이다.
// 한계: TURN_TIMEOUT_MS는 api/supabase/turns.ts 안의 내보내지 않는 상수이고, 화면은 QuackApi 밖(supabase 구현)을 가져다 쓰지 않는 규칙이라 숫자를 따로 둔다. 두 값은 같이 바꾼다.
// 한계: 서버가 45초 안에 응답하지 않아도 사용자는 45초를 기다려야 한다(그동안 "확인 중" 버튼 외에 안내·취소 수단이 없다).
const START_TIMEOUT_MS = 45_000;

// 범위 확인 결과 안내. 응답에는 문구가 없어서 앱의 고정 문구를 쓴다.
// 제목과 배너 종류는 화면에서 정하고, 본문은 응답이 아니라 앱의 고정 문구다.
const NOTICE = {
  out_of_scope: {
    variant: 'notice',
    title: '안내 · 범위 밖',
    message: '지금은 자료구조, 알고리즘, 컴퓨터구조를 지원해요. 이 세 과목 중 하나로 학습 목표를 바꿔 주세요.',
  },
  needs_clarification: {
    variant: 'hint',
    title: '더 구체적으로',
    message: '세 과목 중 어떤 개념을 공부하고 싶나요? 목표를 조금 더 구체적으로 적어 주세요.',
  },
  // 판정 실패와 타임아웃. 위 두 안내와 달리 목표는 문제가 없고 다시 시도하면 된다.
  failed: { variant: 'error', title: '판정 실패', message: '확인하지 못했어요. 다시 시도해 주세요.' },
} as const;
type Notice = keyof typeof NOTICE;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// S-01 공부 준비
export function SessionSetupScreen() {
  // 홈이나 과목 상세(L-02)에서 고른 과목을 기본값으로 쓴다
  const { folders, selected: selectedFolder, select } = useSelectedFolder();
  const api = useQuackApi();
  // 학습 분석(R-02)의 추천 목표로 들어오면 목표를 미리 채운다
  const { goal: presetGoal } = useLocalSearchParams<{ goal?: string }>();
  const [goal, setGoal] = useState((presetGoal ?? '').slice(0, GOAL_MAX_LENGTH));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [checking, setChecking] = useState(false);
  const demo = useDemoVariant();

  // 확인 중 중복 요청을 막는다(state는 다음 렌더에야 바뀌어서 연타를 못 막으므로 ref를 쓴다)
  const busy = useRef(false);
  // 응답을 못 받았거나 판정이 실패한 뒤 같은 입력으로 다시 시도할 때 같은 request_id를 쓰려고 기억한다.
  // 판정을 받았거나, 409를 받았거나, 목표·과목이 바뀌면 비운다. 화면을 다시 열면 ref가 새로 생겨서 새 id다.
  const pending = useRef<{ id: string; key: string } | null>(null);
  // 요청마다 올리는 번호. 번호가 달라졌거나 화면이 없어졌으면 늦게 온 응답을 무시한다.
  const attempt = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  if (folders === undefined) {
    return <LoadingView />;
  }
  if (!selectedFolder) {
    return (
      <BottomActionLayout
        actions={
          <Button variant="primary" title="과목 만들기" onPress={() => router.replace('/subjects/new')} />
        }
      >
        <EmptyState title="공부할 과목이 없어요." message="과목을 먼저 만들어 주세요." />
      </BottomActionLayout>
    );
  }
  const folderId = selectedFolder.id;

  // 입력(목표·과목)이 바뀌면 이전 확인은 무효다: 같은 id를 다시 쓰지 않고, 진행 중인 응답은 무시한다.
  function resetCheck() {
    pending.current = null;
    attempt.current += 1;
    busy.current = false;
    setChecking(false);
    setNotice(null);
  }

  // canRetryConflict: 409를 받으면 새 request_id로 한 번 더 시도한다
  async function handleStart(canRetryConflict = true) {
    if (busy.current) {
      return;
    }
    const key = `${folderId}|${goal.trim()}`;
    // 한계: tempId는 Math.random 기반이라 보안용이 아니다. 중복 요청을 구분하는 용도라 충분하다.
    const requestId = pending.current?.key === key ? pending.current.id : tempId();
    // 서버와 같은 규칙(goal은 앞뒤 공백을 뺀 1~140자)으로 앱에서도 먼저 검사한다
    const parsed = startSessionRequestSchema.safeParse({ folder_id: folderId, goal, request_id: requestId } satisfies StartSessionRequest);
    if (!parsed.success) {
      setError(goal.trim() ? '학습 목표를 확인해 주세요.' : '오늘의 목표를 적어 주세요.');
      return;
    }

    busy.current = true;
    pending.current = { id: requestId, key };
    const mine = ++attempt.current;
    setError('');
    setNotice(null);
    setChecking(true);
    try {
      const result = await withTimeout(api.requestSessionStart(parsed.data), START_TIMEOUT_MS);
      if (!alive.current || attempt.current !== mine) {
        return;
      }
      pending.current = null;
      if (result.status === 'in_scope') {
        // ?demo= 값은 화면 주소마다 따로라서 타이머 주소에도 넘긴다(?demo=hour 등)
        // 공부 준비는 바꿔 끼운다. 세션이 끝나면 앞 화면으로 돌아오지 않고 홈으로 가게 하기 위해서다.
        // 이동하는 동안 버튼이 다시 눌리지 않게 busy는 그대로 둔다.
        router.replace({
          pathname: '/session/timer',
          params: { sessionId: result.session.id, ...(demo ? { demo } : {}) },
        });
        return;
      }
      setNotice(result.status);
    } catch (e) {
      if (!alive.current || attempt.current !== mine) {
        return;
      }
      if (e instanceof ApiError && e.code === 'INVALID_STATE' && canRetryConflict) {
        // 같은 request_id로 입력이 달라졌다는 뜻이다. 새 id로 다시 보낸다.
        pending.current = null;
        busy.current = false;
        await handleStart(false);
        return;
      }
      // 판정 실패(AI_FAILED)·타임아웃·그 밖의 실패: 같은 입력이면 같은 request_id로 다시 시도한다
      setNotice('failed');
    }
    busy.current = false;
    setChecking(false);
  }

  return (
    <BottomActionLayout
      actions={
        <Button
          variant="primary"
          title={checking ? '학습 목표 확인 중…' : notice === 'failed' ? '다시 시도' : '타이머 시작'}
          loading={checking}
          onPress={() => handleStart()}
        />
      }
    >
      <ScreenTitle title="오늘은 무엇을 알아볼까요?" subtitle="작은 목표 하나면 충분해요." />

      <Text>공부할 과목</Text>
      {/* 홈의 과목 선택과 같은 값을 쓴다 */}
      <SubjectSelect
        folders={folders}
        value={selectedFolder}
        onChange={(f) => {
          resetCheck();
          select(f.id);
        }}
      />

      <TeacherSummary folder={selectedFolder} showCharacter />

      <View style={styles.form}>
        <Text>오늘의 학습 목표 (필수)</Text>
        <PaperInput
          value={goal}
          onChangeText={(value) => {
            setGoal(value);
            setError('');
            resetCheck();
          }}
          maxLength={GOAL_MAX_LENGTH}
          multiline
          placeholder="예: 스택과 큐의 차이를 내 말로 설명하기"
          error={error}
        />
        <Text style={styles.counter}>
          {goal.length} / {GOAL_MAX_LENGTH}자
        </Text>
        <Text>‘이해하기’보다 ‘내 말로 설명하기’로 정해 보세요.</Text>
      </View>

      {notice ? <Banner {...NOTICE[notice]} /> : null}
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 8,
  },
  counter: {
    ...FONT.caption,
    color: COLORS.mutedStrong,
  },
});
