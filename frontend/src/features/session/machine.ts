import type { ExplanationVerdict } from '@/api/tempContract';

// 세션 상태 머신 (CLAUDE.md "세션 상태"). 화면과 상관없는 순수 함수만 둔다.

export type SessionPhase =
  | 'timing'
  | 'aiQuestion'
  | 'explaining'
  | 'analyzing'
  | 'followUp'
  | 'confirmed'
  | 'finished';

// "설명 없음"으로 판단하는 시간. timing에서 이만큼 설명이 없으면 aiQuestion으로 간다.
// 미정, 팀과 확정 필요. 지금 값은 임시값이다.
export const NO_EXPLANATION_MS = 10 * 60 * 1000;

// 한 개념에서 꼬리 질문을 묻는 최대 횟수. 다 묻고도 부족하면 바로 공부(timing)로 돌아가 다음 개념으로 넘어가고,
// 그 개념은 리포트에서 보완할 개념이 된다.
// 꼬리 질문 단계의 "넘어가기" 버튼 허용도 함께 정한다.
// 미정, 팀과 확정 필요. 지금 값(2번, 넘어가기 허용)은 임시값이다.
export const MAX_FOLLOW_UPS = 2;

export type SessionState = {
  phase: SessionPhase;
  startedAt: number;
  // 쉬기를 누르기 전까지 쌓인 공부 시간
  accumulatedMs: number;
  // 마지막으로 시작하거나 다시 시작한 시각. 쉬는 중이거나 끝났으면 null
  runningSince: number | null;
  // timing에 들어온 때의 공부 시간. 설명 없음 시간은 여기서부터 센다(쉬는 동안은 늘지 않는다).
  timingSinceMs: number;
  // 지금 개념에서 한 꼬리 질문 수. 다음 개념으로 가면(continue) 0이 된다.
  followUpCount: number;
};

// 쉬기·다시 시작은 단계와 따로 둔다. AI와 대화하는 단계에서도 시간이 흐르고, 쉬기를 눌렀을 때만 멈춘다.
// 시각이 필요한 이벤트는 now를 받는다.
export type SessionEvent =
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  // timing에서 설명 없이 NO_EXPLANATION_MS가 지났거나 "기다리지 않고 반응 보기"
  | { type: 'idleTimeout' }
  // aiQuestion의 "조금 이따가"
  | { type: 'snooze'; now: number }
  // "이제 설명해 볼게", "설명하기", "답할게"
  | { type: 'startExplain' }
  // 녹음 또는 채팅 제출
  | { type: 'submit' }
  | { type: 'analyzed'; verdict: ExplanationVerdict; now: number }
  // 분석 요청 실패. 입력을 그대로 두고 다시 보낼 수 있게 explaining으로 돌아간다.
  | { type: 'analysisFailed' }
  // followUp의 "넘어가기". 이어서 공부하기 버튼을 거치지 않고 바로 공부(timing)로 돌아간다.
  | { type: 'skip'; now: number }
  // 이해 확인 뒤 "이어서 공부하기"
  | { type: 'continue'; now: number }
  | { type: 'finish'; now: number };

// 단계 전환표. 표에 없는 이벤트는 무시한다. analyzed는 판정에 따라 갈라져서 아래 reducer에서 처리한다.
// 공부 마치기(finish)는 분석 중(analyzing)에만 막는다.
const NEXT: Partial<Record<SessionPhase, Partial<Record<SessionEvent['type'], SessionPhase>>>> = {
  timing: { idleTimeout: 'aiQuestion', startExplain: 'explaining', finish: 'finished' },
  aiQuestion: { startExplain: 'explaining', snooze: 'timing', finish: 'finished' },
  explaining: { submit: 'analyzing', finish: 'finished' },
  analyzing: { analysisFailed: 'explaining' },
  followUp: { startExplain: 'explaining', skip: 'timing', finish: 'finished' },
  confirmed: { continue: 'timing', finish: 'finished' },
};

export function startSession(now: number, elapsedMs = 0): SessionState {
  return {
    phase: 'timing',
    startedAt: now,
    accumulatedMs: elapsedMs,
    runningSince: now,
    timingSinceMs: elapsedMs,
    followUpCount: 0,
  };
}

// 지금까지의 공부 시간. 1초마다 더하지 않고 시각 차이로 계산해서, 웹 탭이 뒤로 가 있어도 밀리지 않는다.
export function elapsedMs(state: SessionState, now: number): number {
  if (state.runningSince === null) {
    return state.accumulatedMs;
  }
  return state.accumulatedMs + Math.max(0, now - state.runningSince);
}

// timing에서 설명 없음 시간이 지났는지
export function isIdleOver(state: SessionState, now: number, limitMs: number): boolean {
  return state.phase === 'timing' && elapsedMs(state, now) - state.timingSinceMs >= limitMs;
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
      if (state.phase !== 'analyzing') {
        return state;
      }
      // 충분이면 이해 확인. 부족·모호면 한도까지 꼬리 질문, 한도를 넘으면 넘어가기처럼 바로 공부로 돌아간다.
      if (event.verdict === 'sufficient') {
        return { ...state, phase: 'confirmed' };
      }
      if (state.followUpCount < MAX_FOLLOW_UPS) {
        return { ...state, phase: 'followUp', followUpCount: state.followUpCount + 1 };
      }
      return { ...state, phase: 'timing', timingSinceMs: elapsedMs(state, event.now), followUpCount: 0 };
    default: {
      const next = NEXT[state.phase]?.[event.type];
      if (!next) {
        return state;
      }
      // 끝나면 시간을 멈춘다
      if (event.type === 'finish') {
        return { ...state, phase: next, accumulatedMs: elapsedMs(state, event.now), runningSince: null };
      }
      // timing으로 돌아오면 설명 없음 시간을 처음부터 센다. 다음 개념으로 가면(이어서 공부, 넘어가기) 꼬리 질문 수도 0부터 센다.
      if (event.type === 'snooze' || event.type === 'continue' || event.type === 'skip') {
        return {
          ...state,
          phase: next,
          timingSinceMs: elapsedMs(state, event.now),
          followUpCount: event.type === 'snooze' ? state.followUpCount : 0,
        };
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
