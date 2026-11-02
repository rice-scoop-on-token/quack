import { useEffect, useReducer, useState } from 'react';

import { useDemoVariant } from '@/api/mock/useDemoVariant';
import {
  elapsedMs,
  isIdleOver,
  NO_EXPLANATION_MS,
  sessionReducer,
  startSession,
} from '@/features/session/machine';

// ?demo=hour: 59:50부터 시작해 1시간을 넘길 때 표시를 10초 만에 확인한다
const DEMO_HOUR_START_MS = (59 * 60 + 50) * 1000;
// ?demo=idle: "설명 없음" 판단 시간을 10초로 줄인다
const DEMO_IDLE_MS = 10 * 1000;

// 세션 상태 머신을 화면에 연결한다. 시간이 흐르는 동안 1초마다 다시 그린다.
// ponytail: 진행 중인 세션은 화면 메모리에만 있다. 앱을 끄면 사라지고, 웹에서 새로고침하면 주소에 남은 과목·목표로 00:00부터 다시 시작한다.
// 서버 연결 때(POST /sessions) 서버의 진행 중 세션을 이어서 쓸지 다시 정한다.
export function useSessionTimer() {
  const demo = useDemoVariant();
  const [state, dispatch] = useReducer(sessionReducer, null, () =>
    startSession(Date.now(), demo === 'hour' ? DEMO_HOUR_START_MS : 0),
  );
  const [now, setNow] = useState(Date.now);
  const noExplanationMs = demo === 'idle' ? DEMO_IDLE_MS : NO_EXPLANATION_MS;

  useEffect(() => {
    if (state.runningSince === null) {
      return;
    }
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.runningSince]);

  // 설명 없이 시간이 지나면 선생님이 먼저 질문한다(timing → aiQuestion)
  useEffect(() => {
    if (isIdleOver(state, now, noExplanationMs)) {
      dispatch({ type: 'idleTimeout' });
    }
  }, [state, now, noExplanationMs]);

  // 세션을 끝내고 끝낸 시각과 공부 시간을 돌려준다
  function finish(): { endedAt: number; studyMs: number } {
    const endedAt = Date.now();
    dispatch({ type: 'finish', now: endedAt });
    return { endedAt, studyMs: elapsedMs(state, endedAt) };
  }

  return {
    state,
    elapsedMs: elapsedMs(state, now),
    running: state.runningSince !== null,
    send: dispatch,
    pause: () => dispatch({ type: 'pause', now: Date.now() }),
    resume: () => dispatch({ type: 'resume', now: Date.now() }),
    finish,
  };
}
