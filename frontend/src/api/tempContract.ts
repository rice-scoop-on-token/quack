import type { Session } from '@quack/shared';

// BE와 합의했지만 아직 shared에 반영되지 않은 타입을 이 파일 하나에 모은다.
// shared 반영 후 교체: shared에 같은 타입이 생기면 여기 것을 지우고 shared 것을 import한다.

// 캐릭터 성장 단계. 레벨은 쓰지 않고 단계만 쓴다.
export type GrowthStage = 'baby' | 'child' | 'adult';

// 성장 단계에 들어가는 누적 경험치 기준
// 미정, BE와 확정 필요. 지금 값은 FE 임시값이다. shared의 levelFromXp(레벨)는 쓰지 않는다.
export const STAGE_XP = {
  child: 100,
  adult: 300,
} as const;

// 선생님 성격. AI 페르소나(_ai/personas)가 정해지기 전까지 프로토타입 문구를 쓴다.
export type TeacherPersona = {
  label: string;
  tags: string[];
  // 선생님을 고를 때 말풍선으로 보여 주는 말투 미리보기
  greeting: string;
};

// 끝낸 공부 세션 기록. shared의 Session에 공부 시간을 더한다.
// BE에 공부 시간 칸 추가 제안 필요. 쉬는 시간은 빠지므로 ended_at - started_at 으로는 공부 시간을 알 수 없다.
// AI와 대화하는 시간(설명, 분석, 꼬리 질문)도 공부 시간에 들어간다. 쉬기를 누른 동안만 빠진다.
export type StudySession = Session & {
  study_seconds: number;
};
