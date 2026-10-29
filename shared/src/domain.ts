import { z } from 'zod';

// Supabase는 시각을 "2026-10-29T05:47:40.539876+00:00"처럼 시간대 표기를 붙여 돌려준다.
// zod 기본 옵션은 이 형식을 거절하므로 offset을 허용한다.
const timestamp = z.iso.datetime({ offset: true });

// 사용자가 만드는 행의 id는 uuid, 기본 데이터(동물, 아이템)의 id는 읽기 쉬운 영문 slug를 쓴다.
const id = z.uuid();

// 프로필과 캐릭터

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

export const characterSchema = z.object({
  id,
  user_id: id,
  species_id: speciesIdSchema,
  created_at: timestamp,
});
export type Character = z.infer<typeof characterSchema>;

// 경험치와 포인트는 지급 내역(ledger)의 합계다. 레벨은 level.ts의 levelFromXp로 계산한다.
export const characterStatsSchema = z.object({
  user_id: id,
  total_xp: z.int().min(0),
  points_balance: z.int().min(0),
});
export type CharacterStats = z.infer<typeof characterStatsSchema>;

// 아이템

export const itemSlotSchema = z.enum(['head', 'face', 'body', 'accessory']);
export type ItemSlot = z.infer<typeof itemSlotSchema>;

// 획득 방식은 팀 결정(D9) 전이라 추천안(레벨 조건 또는 포인트 구매) 기준이다.
export const itemUnlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('level'), level: z.int().min(1) }),
  z.object({ type: z.literal('points'), price: z.int().min(1) }),
]);
export type ItemUnlock = z.infer<typeof itemUnlockSchema>;

export const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slot: itemSlotSchema,
  asset_key: z.string().min(1),
  unlock: itemUnlockSchema,
});
export type Item = z.infer<typeof itemSchema>;

export const userItemSchema = z.object({
  user_id: id,
  item_id: z.string().min(1),
  source: z.enum(['reward', 'purchase']),
  equipped: z.boolean(),
  acquired_at: timestamp,
});
export type UserItem = z.infer<typeof userItemSchema>;

// 폴더와 자료

export const folderSchema = z.object({
  id,
  user_id: id,
  name: z.string().min(1),
  created_at: timestamp,
});
export type Folder = z.infer<typeof folderSchema>;

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

// 지급 내역

// 포인트 차감(아이템 구매)은 음수 amount로 기록한다.
export const ledgerReasonSchema = z.enum(['session_reward', 'item_purchase']);
export type LedgerReason = z.infer<typeof ledgerReasonSchema>;

export const ledgerEntrySchema = z.object({
  id,
  user_id: id,
  amount: z.int(),
  reason: ledgerReasonSchema,
  session_id: id.nullable(),
  created_at: timestamp,
});
export type XpLedgerEntry = z.infer<typeof ledgerEntrySchema>;
export type PointLedgerEntry = z.infer<typeof ledgerEntrySchema>;
