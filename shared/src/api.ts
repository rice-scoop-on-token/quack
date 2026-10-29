import { z } from 'zod';

import {
  explanationTurnSchema,
  itemSchema,
  materialSchema,
  quizAttemptSchema,
  quizQuestionPublicSchema,
  quizSchema,
  reportSchema,
  sessionSchema,
  userItemSchema,
} from './domain.ts';

// 함수 api의 요청·응답 모양이다. 주소는 {SUPABASE_URL}/functions/v1/api 뒤에 붙는 경로다.

// 경로 파라미터

export const uuidParamSchema = z.object({ id: z.uuid() });
export type UuidParam = z.infer<typeof uuidParamSchema>;

// 아이템 id는 uuid가 아니라 영문 slug다.
export const itemIdParamSchema = z.object({ id: z.string().min(1) });
export type ItemIdParam = z.infer<typeof itemIdParamSchema>;

// POST /materials/:id/process (요청 본문 없음)

export const processMaterialResponseSchema = z.object({ material: materialSchema });
export type ProcessMaterialResponse = z.infer<typeof processMaterialResponseSchema>;

// POST /speech/transcribe
// 요청은 JSON이 아니라 multipart/form-data이고, 음성 파일을 아래 이름의 필드에 담는다.

export const SPEECH_AUDIO_FIELD = 'audio';

export const transcribeResponseSchema = z.object({
  text: z.string(),
  duration_ms: z.int().min(0),
});
export type TranscribeResponse = z.infer<typeof transcribeResponseSchema>;

// POST /sessions/:id/turns
// 응답(설명 턴과 분석 결과)은 AI 분석 결과 스키마가 확정된 뒤 함께 추가한다.
// POST /sessions/:id/ai-question 의 응답도 같은 이유로 아직 없다.

export const createTurnRequestSchema = explanationTurnSchema.pick({
  trigger: true,
  input_mode: true,
  text: true,
  question_text: true,
});
export type CreateTurnRequest = z.infer<typeof createTurnRequestSchema>;

// POST /sessions/:id/finish (요청 본문 없음)

export const sessionReviewSchema = z.object({
  covered_concepts: z.array(z.string()),
  weak_concepts: z.array(z.string()),
  turn_count: z.int().min(0),
  suggested_next: z.enum(['quiz', 're_explain']),
});
export type SessionReview = z.infer<typeof sessionReviewSchema>;

export const finishSessionResponseSchema = z.object({
  session: sessionSchema,
  review: sessionReviewSchema,
});
export type FinishSessionResponse = z.infer<typeof finishSessionResponseSchema>;

// 퀴즈
// 형식은 팀 결정(D7) 전이라 추천안(객관식 4지선다) 기준이다.

export const quizPublicSchema = quizSchema.extend({
  questions: z.array(quizQuestionPublicSchema).min(1),
});
export type QuizPublic = z.infer<typeof quizPublicSchema>;

// POST /sessions/:id/quiz (요청 본문 없음), GET /quizzes/:id 가 같은 응답을 쓴다.
export const quizResponseSchema = z.object({ quiz: quizPublicSchema });
export type QuizResponse = z.infer<typeof quizResponseSchema>;

// POST /quizzes/:id/submit

export const submitQuizRequestSchema = z.object({
  answers: quizAttemptSchema.shape.answers.min(1),
});
export type SubmitQuizRequest = z.infer<typeof submitQuizRequestSchema>;

// 정답 위치는 제출한 뒤에만 알려준다. 제출 전 응답(quizPublicSchema)에는 없다.
export const quizQuestionResultSchema = z.object({
  question_id: z.uuid(),
  correct: z.boolean(),
  correct_answer: z.int().min(0).max(3),
  explanation: z.string(),
});
export type QuizQuestionResult = z.infer<typeof quizQuestionResultSchema>;

export const submitQuizResponseSchema = z.object({
  attempt: quizAttemptSchema,
  results: z.array(quizQuestionResultSchema),
});
export type SubmitQuizResponse = z.infer<typeof submitQuizResponseSchema>;

// POST /sessions/:id/report (요청 본문 없음)
// 여러 번 호출해도 보상은 한 번만 지급되고, 이미 만든 리포트를 그대로 돌려준다.

export const rewardGrantSchema = z.object({
  xp: z.int().min(0),
  points: z.int().min(0),
  items: z.array(itemSchema),
  // level.ts의 levelFromXp로 계산한 지급 전후 레벨
  level_before: z.int().min(1),
  level_after: z.int().min(1),
});
export type RewardGrant = z.infer<typeof rewardGrantSchema>;

export const createReportResponseSchema = z.object({
  report: reportSchema,
  rewards: rewardGrantSchema,
});
export type CreateReportResponse = z.infer<typeof createReportResponseSchema>;

// POST /items/:id/purchase (요청 본문 없음)

export const purchaseItemResponseSchema = z.object({
  user_item: userItemSchema,
  points_balance: z.int().min(0),
});
export type PurchaseItemResponse = z.infer<typeof purchaseItemResponseSchema>;
