import { z } from 'zod';

import {
  explanationTurnSchema,
  materialSchema,
  quizAttemptSchema,
  quizQuestionPublicSchema,
  quizSchema,
  reportSchema,
  sessionSchema,
} from './domain.ts';

// 함수 api의 요청·응답 모양이다. 주소는 {SUPABASE_URL}/functions/v1/api 뒤에 붙는 경로다.

// 경로 파라미터

export const uuidParamSchema = z.object({ id: z.uuid() });
export type UuidParam = z.infer<typeof uuidParamSchema>;

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

// POST /sessions/start
export const startSessionRequestSchema = z.strictObject({
  folder_id: z.uuid(),
  goal: z.string().trim().min(1).max(140),
  request_id: z.uuid(),
});
export type StartSessionRequest = z.infer<typeof startSessionRequestSchema>;

const studyGoalGuidance = z.string().trim().min(1);

export const startSessionResponseSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('in_scope'), session: sessionSchema }),
  z.strictObject({ status: z.literal('out_of_scope'), message: studyGoalGuidance }),
  z.strictObject({ status: z.literal('needs_clarification'), message: studyGoalGuidance }),
]);
export type StartSessionResponse = z.infer<typeof startSessionResponseSchema>;

// POST /sessions/:id/turns

export const createTurnRequestSchema = explanationTurnSchema.pick({
  trigger: true,
  input_mode: true,
  text: true,
  // 앱 값은 표시·요청 기록용이다. AI 분석 이력에는 서버에 저장된 실제 이전 AI 질문을 사용한다.
  // 이 스키마는 입력 형식만 검사하며 실제 이력 조회·대조는 서버 서비스에서 수행한다.
  question_text: true,
});
export type CreateTurnRequest = z.infer<typeof createTurnRequestSchema>;

// 텍스트 시연 연동을 위한 공동 계약 제안이다. FE·BE의 기존 임시 계약을 자동으로 대체하지 않는다.
// 실제 AI 발화를 그대로 전달하기 위해 공백만 검사하고 문자열을 trim으로 변환하지 않는다.
const dialogueText = z.string().refine((value) => value.trim().length > 0, {
  message: 'AI 발화는 공백이 아닌 내용을 포함해야 합니다.',
});

const explanationResponseSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ask'), message: dialogueText, question: dialogueText }),
  z.object({ action: z.literal('explain'), message: dialogueText, question: dialogueText }),
  z.object({ action: z.literal('correct'), message: dialogueText, question: z.null() }),
  z.object({ action: z.literal('acknowledge'), message: dialogueText, question: z.null() }),
]);

// 공개 상태와 발화만 선택한다. 내부 판단 근거·개념 목록·사용량은 respond에서 제외한다.
// FE가 상태를 다른 값으로 바꾸지 않고 분기할 수 있도록 다음 공개 조합만 허용한다.
// response.action의 correct는 계산 등의 교정 행동, answer_status의 correct는 답이 정답이라는 뜻이다.
// action      | understanding_status             | question | 추가 조건
// ask         | insufficient/ambiguous/unverified | 문자열   | 없음
// explain     | unverified                        | 문자열   | independent_performance_status=unverified
// correct     | sufficient                        | null     | 없음
// acknowledge | sufficient/unverified             | null     | answer_status가 incorrect가 아님
// 내부 오류·근거의 타당성 검증은 이 공개 조합 검사와 별도로 수행한다.
export const explanationAnalysisSchema = z.object({
  answer_status: z.enum(['correct', 'incorrect', 'not_applicable', 'unverified']),
  understanding_status: z.enum(['sufficient', 'insufficient', 'ambiguous', 'unverified']),
  // 이 상태만으로 독립 수행의 범위·숙달·보상 자격을 판단하지 않는다. 근거는 서버 내부에 보존한다.
  independent_performance_status: z.enum(['confirmed', 'unverified']),
  response: explanationResponseSchema,
}).superRefine((analysis, ctx) => {
  const { action } = analysis.response;

  if (action === 'ask' && analysis.understanding_status === 'sufficient') {
    ctx.addIssue({
      code: 'custom', path: ['response', 'action'],
      message: '충분한 설명 뒤에 확인 질문을 강제로 붙이지 않습니다.',
    });
  }

  if (action === 'correct' && analysis.understanding_status !== 'sufficient') {
    ctx.addIssue({
      code: 'custom', path: ['understanding_status'],
      message: '짧은 계산 교정은 개념·접근이 충분한 경우에 사용합니다.',
    });
  }

  if (action === 'acknowledge' && analysis.answer_status === 'incorrect') {
    ctx.addIssue({
      code: 'custom', path: ['answer_status'],
      message: '틀린 답을 교정·확인 없이 인정하고 종료할 수 없습니다.',
    });
  }

  if (action === 'acknowledge' && (
    analysis.understanding_status === 'insufficient' || analysis.understanding_status === 'ambiguous'
  )) {
    ctx.addIssue({
      code: 'custom', path: ['understanding_status'],
      message: '부족하거나 모호한 설명을 짧은 인정만으로 종료하지 않습니다.',
    });
  }

  if (action === 'explain' && (
    analysis.understanding_status !== 'unverified' || analysis.independent_performance_status !== 'unverified'
  )) {
    ctx.addIssue({
      code: 'custom', path: ['response', 'action'],
      message: '해설 제공 자체로 학습자의 이해나 독립 수행을 확정하지 않습니다.',
    });
  }
});
export type ExplanationAnalysis = z.infer<typeof explanationAnalysisSchema>;

// ask/explain은 답변을 기다리고 correct/acknowledge는 해당 대화를 마무리한다.
// 대화 마무리는 세션 종료·충분 판정·독립 숙달·보상 지급과 별개다.
export const createTurnResponseSchema = z.object({
  turn: explanationTurnSchema,
  analysis: explanationAnalysisSchema,
});
export type CreateTurnResponse = z.infer<typeof createTurnResponseSchema>;

// POST /sessions/:id/ai-question 응답은 아직 정의하지 않는다.

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
// 경험치는 세션이 속한 폴더의 캐릭터에 쌓인다.

export const rewardGrantSchema = z.object({
  xp: z.int().min(0),
  // level.ts의 levelFromXp로 계산한 폴더(캐릭터)의 지급 전후 레벨
  level_before: z.int().min(1),
  level_after: z.int().min(1),
});
export type RewardGrant = z.infer<typeof rewardGrantSchema>;

export const createReportResponseSchema = z.object({
  report: reportSchema,
  rewards: rewardGrantSchema,
});
export type CreateReportResponse = z.infer<typeof createReportResponseSchema>;
