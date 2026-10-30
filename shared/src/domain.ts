import { z } from 'zod';

// Supabase는 시각을 "2026-10-29T05:47:40.539876+00:00"처럼 시간대 표기를 붙여 돌려준다.
// zod 기본 옵션은 이 형식을 거절하므로 offset을 허용한다.
const timestamp = z.iso.datetime({ offset: true });

// 사용자가 만드는 행의 id는 uuid, 기본 데이터(동물)의 id는 읽기 쉬운 영문 slug를 쓴다.
const id = z.uuid();

// 프로필과 동물

export const profileSchema = z.object({
  id,
  display_name: z.string().min(1),
  onboarding_completed_at: timestamp.nullable(),
  created_at: timestamp,
});
export type Profile = z.infer<typeof profileSchema>;

export const speciesIdSchema = z.enum(['rubber_duck', 'raccoon', 'cat']);
export type SpeciesId = z.infer<typeof speciesIdSchema>;

export const speciesSchema = z.object({
  id: speciesIdSchema,
  name: z.string().min(1),
  // AI 페르소나 파일 이름과 맞추기 위해 id와 같은 값을 쓴다.
  persona_key: speciesIdSchema,
  description: z.string(),
});
export type Species = z.infer<typeof speciesSchema>;

// 폴더와 캐릭터
// 캐릭터는 과목 폴더마다 한 마리다. 따로 테이블을 두지 않고 폴더의 동물과 경험치로 나타낸다.

export const folderSchema = z.object({
  id,
  user_id: id,
  name: z.string().min(1),
  // 폴더를 만들 때 고르고 이후 바꿀 수 없다. 같은 동물을 여러 폴더에서 고를 수 있다.
  species_id: speciesIdSchema,
  created_at: timestamp,
});
export type Folder = z.infer<typeof folderSchema>;

// 경험치는 폴더의 지급 내역(ledger) 합계다. 레벨은 level.ts의 levelFromXp로 계산한다.
export const characterStatsSchema = z.object({
  folder_id: id,
  user_id: id,
  species_id: speciesIdSchema,
  total_xp: z.int().min(0),
});
export type CharacterStats = z.infer<typeof characterStatsSchema>;

// 자료

export const materialSchema = z.object({
  id,
  user_id: id,
  folder_id: id,
  kind: z.enum(['text', 'pdf', 'image']),
  title: z.string().min(1),
  storage_path: z.string().nullable(),
  status: z.enum(['uploaded', 'processing', 'ready', 'failed']),
  key_concepts: z.array(z.string()),
  error_message: z.string().nullable(),
  created_at: timestamp,
});
export type Material = z.infer<typeof materialSchema>;

// 세션과 설명

export const sessionSchema = z.object({
  id,
  user_id: id,
  folder_id: id,
  goal: z.string().min(1),
  status: z.enum(['active', 'finished', 'reported']),
  started_at: timestamp,
  ended_at: timestamp.nullable(),
});
export type Session = z.infer<typeof sessionSchema>;

export const explanationTurnSchema = z.object({
  id,
  session_id: id,
  seq: z.int().min(1),
  trigger: z.enum(['self', 'ai_question', 'follow_up', 're_explain']),
  question_text: z.string().nullable(),
  input_mode: z.enum(['voice', 'chat']),
  text: z.string().min(1),
  created_at: timestamp,
});
export type ExplanationTurn = z.infer<typeof explanationTurnSchema>;

// 퀴즈와 리포트

export const quizSchema = z.object({
  id,
  session_id: id,
  created_at: timestamp,
});
export type Quiz = z.infer<typeof quizSchema>;

// 앱에 보여주는 문항이다. 정답과 해설은 서버 전용이라 넣지 않는다.
// 형식은 팀 결정(D7) 전이라 추천안(객관식 4지선다) 기준이다.
export const quizQuestionPublicSchema = z.object({
  id,
  quiz_id: id,
  seq: z.int().min(1),
  type: z.literal('multiple_choice'),
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).length(4),
});
export type QuizQuestionPublic = z.infer<typeof quizQuestionPublicSchema>;

export const quizAttemptSchema = z.object({
  id,
  quiz_id: id,
  answers: z.array(
    z.object({
      question_id: id,
      // 객관식에서 고른 보기의 위치(0부터)
      answer: z.int().min(0).max(3),
    }),
  ),
  correct_count: z.int().min(0),
  total_count: z.int().min(0),
  graded_at: timestamp,
});
export type QuizAttempt = z.infer<typeof quizAttemptSchema>;

export const reportSchema = z.object({
  id,
  session_id: id,
  summary: z.string(),
  covered_concepts: z.array(z.string()),
  weak_concepts: z.array(z.string()),
  duration_seconds: z.int().min(0),
  turn_count: z.int().min(0),
  quiz_correct: z.int().min(0).nullable(),
  quiz_total: z.int().min(0).nullable(),
  created_at: timestamp,
});
export type Report = z.infer<typeof reportSchema>;

// 경험치 지급 내역

// 세션 보상은 활동별(세션 완료, 충분 판정 개념, 퀴즈 정답)로 나누지 않고 세션마다 한 줄로 쌓는다.
export const ledgerReasonSchema = z.enum(['session_reward']);
export type LedgerReason = z.infer<typeof ledgerReasonSchema>;

export const ledgerEntrySchema = z.object({
  id,
  user_id: id,
  // 폴더를 지우면 그 폴더의 내역도 함께 지워진다.
  folder_id: id,
  amount: z.int(),
  reason: ledgerReasonSchema,
  session_id: id.nullable(),
  created_at: timestamp,
});
export type XpLedgerEntry = z.infer<typeof ledgerEntrySchema>;
