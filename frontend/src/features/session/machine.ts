// 세션 상태 머신 (CLAUDE.md "세션 상태"). 화면과 상관없는 순수 함수만 둔다.
// 커밋 5는 timing의 쉬기, 다시 시작, 마치기만 화면에 연결한다. 나머지 단계 화면은 커밋 6에서 만든다.

export type SessionPhase =
  | 'timing'
  | 'aiQuestion'
  | 'explaining'
  | 'analyzing'
  | 'followUp'
  | 'confirmed'
  | 'finished';

// "설명 없음"으로 판단하는 시간. timing에서 이만큼 설명이 없으면 aiQuestion으로 간다.
// 미정, 팀과 확정 필요. 지금 값은 임시값이다. 커밋 6에서 idleTimeout 전환에 연결한다.
export const NO_EXPLANATION_MS = 10 * 60 * 1000;

export type SessionState = {
  phase: SessionPhase;
  startedAt: number;
  // 쉬기를 누르기 전까지 쌓인 공부 시간
  accumulatedMs: number;
  // 마지막으로 시작하거나 다시 시작한 시각. 쉬는 중이거나 끝났으면 null
  runningSince: number | null;
};

// 쉬기·다시 시작은 단계와 따로 둔다. AI와 대화하는 단계에서도 시간이 흐르고, 쉬기를 눌렀을 때만 멈춘다.
export type SessionEvent =
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  // timing에서 설명 없이 NO_EXPLANATION_MS가 지났다
  | { type: 'idleTimeout' }
  // "이제 설명해 볼게" 또는 질문에 답하기 시작
  | { type: 'startExplain' }
  // 녹음 또는 채팅 제출
  | { type: 'submit' }
  // 분석 결과
  | { type: 'analyzed'; result: 'followUp' | 'confirmed' }
  // 이해 확인 뒤 계속 공부
  | { type: 'continue' }
  | { type: 'finish'; now: number };

// 단계 전환표. 표에 없는 이벤트는 무시한다.
const NEXT: Partial<Record<SessionPhase, Partial<Record<SessionEvent['type'], SessionPhase>>>> = {
  // 타이머 화면의 "공부 마치기"로 timing에서도 끝낼 수 있다
  timing: { idleTimeout: 'aiQuestion', startExplain: 'explaining', finish: 'finished' },
  aiQuestion: { startExplain: 'explaining' },
  explaining: { submit: 'analyzing' },
  followUp: { startExplain: 'explaining' },
  confirmed: { continue: 'timing', finish: 'finished' },
};

export function startSession(now: number, elapsedMs = 0): SessionState {
  return { phase: 'timing', startedAt: now, accumulatedMs: elapsedMs, runningSince: now };
}

// 지금까지의 공부 시간. 1초마다 더하지 않고 시각 차이로 계산해서, 웹 탭이 뒤로 가 있어도 밀리지 않는다.
export function elapsedMs(state: SessionState, now: number): number {
  if (state.runningSince === null) {
    return state.accumulatedMs;
  }
  return state.accumulatedMs + Math.max(0, now - state.runningSince);
}

export function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
  if (state.phase === 'finished') {
    return state;
  }
  switch (event.type) {
    case 'pause':
      return state.runningSince === null
        ? state
        : { ...state, accumulatedMs: elapsedMs(state, event.now), runningSince: null };
    case 'resume':
      return state.runningSince === null ? { ...state, runningSince: event.now } : state;
    case 'analyzed':
      return state.phase === 'analyzing' ? { ...state, phase: event.result } : state;
    default: {
      const next = NEXT[state.phase]?.[event.type];
      if (!next) {
        return state;
      }
      // 끝나면 시간을 멈춘다
      if (event.type === 'finish') {
        return { phase: next, startedAt: state.startedAt, accumulatedMs: elapsedMs(state, event.now), runningSince: null };
      }
      return { ...state, phase: next };
    }
  }
}

// 1:05:09 또는 05:09
export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}
