import type { ExplanationTurn, Report, Session, SpeciesId } from '@quack/shared';

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
  // 세션 대화에서 선생님이 하는 말. 질문 내용은 분석 결과가 정하고, 이 문구는 말투만 정한다.
  lines: {
    // 설명이 없을 때 먼저 묻는 질문
    aiQuestion: string;
    // 꼬리 질문 앞에 붙이는 말
    followUpLead: string;
    // 분석하는 동안
    thinking: string;
    // 충분 판정
    praise: string;
    // 꼬리 질문을 다 하거나 넘어가기를 눌러 다음으로 넘어갈 때
    skip: string;
  };
};

// ── 설명 분석 결과 ──
// shared 반영 후 교체, BE·AI와 모양 합의 필요. POST /sessions/:id/turns 응답(설명 턴 + 분석 결과)의 초안이다.

// 충분 / 부족 / 모호(무슨 뜻인지 판단하기 어려움)
export type ExplanationVerdict = 'sufficient' | 'insufficient' | 'ambiguous';

export type ExplanationAnalysis = {
  verdict: ExplanationVerdict;
  // 이번 설명이 다룬 개념. 리포트의 이해한 개념·보완할 개념은 이 단위로 센다.
  concept: string;
  // 설명에서 빠진 개념
  missing_concepts: string[];
  // 부족·모호일 때 이어서 물을 꼬리 질문. 충분이면 null
  follow_up_question: string | null;
  // 충분일 때 제안하는 다음 주제. 부족·모호이거나 제안할 주제가 없으면 null
  next_topic: string | null;
  // 이 개념에서 이 설명 전까지 한 꼬리 질문 수(첫 설명은 0)
  follow_up_count: number;
};

// 설명 한 번과 그 분석 결과. shared ExplanationTurn에서 서버가 채우는 칸(id, session_id, created_at)을 뺐다.
export type SessionTurn = Pick<ExplanationTurn, 'seq' | 'trigger' | 'input_mode' | 'question_text' | 'text'> & {
  analysis: ExplanationAnalysis;
};

// POST /sessions/:id/ai-question 응답 초안. shared에는 AI 분석 스키마와 함께 들어갈 예정이다.
export type TempAiQuestion = { question: string };

// 공부 세션 조회 결과. shared의 Session에 공부 시간, 설명 기록, 점검 퀴즈 결과를 더한다.
// BE에 공부 시간 칸 추가 제안 필요. 쉬는 시간은 빠지므로 ended_at - started_at 으로는 공부 시간을 알 수 없다.
// 지금은 AI와 대화하는 시간(설명, 분석, 꼬리 질문)도 공부 시간에 들어가고, 쉬기를 누른 동안만 빠진다.
// AI와 대화하는 동안 타이머를 멈출지는 미정이다(CLAUDE.md 미정 사항). 지금은 멈추지 않는 것으로 임시 구현했다.
// turns와 quiz는 서버에서는 explanation_turns, quiz_attempts 테이블에 있다.
export type StudySession = Session & {
  study_seconds: number;
  turns: SessionTurn[];
  // 점검(S-04)에서 퀴즈를 풀었으면 맞힌 수와 문항 수
  quiz: { correct_count: number; total_count: number } | null;
  // 조용히 공부하기로 잰 세션. 설명 기록이 없어서 과목 상세의 학습 탭 목록에서는 뺀다.
  quiet?: true;
};

// ── 보상 ──
// shared의 RewardGrant(level_before/level_after) 대신 쓰는 임시 타입이다. BE에 xp_before/xp_after로 바꾸자고 제안할 모양이다.
// 앱은 레벨 대신 성장 단계를 쓰고, 단계는 누적 경험치로 계산하기 때문이다.
// 어느 세션·과목의 보상인지는 함께 오는 리포트(report.session_id)로 알 수 있어서 넣지 않는다.
export type TempRewardGrant = {
  xp: number;
  // 그 과목 캐릭터의 지급 전후 누적 경험치
  xp_before: number;
  xp_after: number;
};

// shared CreateReportResponse에서 rewards만 위 임시 타입으로 바꾼 모양
export type TempReportResponse = { report: Report; rewards: TempRewardGrant };

// ── 친구 ──
// 미정, BE와 합의 필요. 친구 탭 격자 카드에 필요한 값만 담은 시연용 초안이다.
export type TempFriend = {
  id: string;
  name: string;
  species_id: SpeciesId;
  stage: GrowthStage;
  // 지금 공부 중인지
  studying: boolean;
  // 공부 중인 과목 이름. 공부 중이 아니면 화면에 쓰지 않는다.
  subject: string;
  // 오늘 공부한 시간(초)
  today_seconds: number;
};

// ── AI 팟캐스트 ──
// 미정, BE·AI와 모양 합의 필요. 실제 오디오 없이 대화 문구만 돌려주는 시연용 초안이다.
export type TempPodcast = {
  id: string;
  folder_id: string;
  material_ids: string[];
  minutes: 5 | 8 | 12;
  title: string;
  // 선생님이 들려주는 대화 문구. 재생 위치에 따라 차례로 보여 준다.
  lines: string[];
};

// ── 오늘의 퀴즈 / 잠금화면 퀴즈 ──
// 미정, BE와 합의 필요. 포인트·XP 없이 정답 여부와 해설만 돌려준다.
export type TempDailyQuiz = { id: string; prompt: string; choices: string[] };
export type TempDailyQuizResult = { correct: boolean; correct_answer: number; explanation: string };

// 앱 퀴즈(공부와 별개)를 푼 기록. 과목 상세의 퀴즈 탭이 과목별로 보여 준다.
// 오늘의 퀴즈가 과목과 상관없는 문제라, 푼 시점에 고른 과목(홈 선택, 잠금화면 출제 과목)에 붙인다.
export type TempQuizAttempt = {
  id: string;
  folder_id: string;
  source: 'app' | 'lock';
  correct: boolean;
  answered_at: string;
};

export type TempLockQuizSettings = {
  enabled: boolean;
  quiet_at_night: boolean;
  per_day: 1 | 3 | 5;
  // 출제 과목. null이면 고른 적이 없어 첫 과목으로 본다.
  folder_id: string | null;
};
