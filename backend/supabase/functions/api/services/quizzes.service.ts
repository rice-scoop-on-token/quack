import type { SupabaseClient } from '@supabase/supabase-js';

import type { QuizPublic, SubmitQuizRequest, SubmitQuizResponse } from '@quack/shared';

import { AppError, appErrorFromDb } from '../middleware/error.ts';

// 채점에 쓰는 quiz_questions 칸이다. answer와 explanation은 서버 전용이라 제출 전에는 앱으로 보내지 않는다.
type QuestionForGrading = {
  id: string;
  answer: number;
  explanation: string;
};

type SubmittedAnswers = SubmitQuizRequest['answers'];

const ALREADY_SUBMITTED_MESSAGE = '이미 제출한 퀴즈예요.';

// adminDb는 다른 사용자의 퀴즈도 읽을 수 있으므로, 그 전에 RLS가 적용되는 userDb로 내 세션의 퀴즈인지 확인한다.
async function getMyQuiz(userDb: SupabaseClient, quizId: string) {
  const { data, error } = await userDb
    .from('quizzes')
    .select('id, session_id, created_at')
    .eq('id', quizId)
    .maybeSingle();

  if (error) throw appErrorFromDb(error);

  // 퀴즈가 없거나 다른 사용자의 것이다. 어느 쪽인지 알리지 않는다.
  if (!data) throw new AppError('NOT_FOUND');

  return data;
}

// GET /quizzes/:id: 정답과 해설을 뺀 문항을 돌려준다.
export async function getQuiz(userDb: SupabaseClient, adminDb: SupabaseClient, quizId: string): Promise<QuizPublic> {
  const quiz = await getMyQuiz(userDb, quizId);

  // quiz_questions는 정답이 있어 앱 역할에 조회 권한이 없는 서버 전용 테이블이라 adminDb로 읽는다.
  // 정답 칸(answer, explanation)은 아예 조회하지 않는다.
  const { data, error } = await adminDb
    .from('quiz_questions')
    .select('id, quiz_id, seq, type, prompt, choices')
    .eq('quiz_id', quiz.id)
    .order('seq');

  if (error) throw appErrorFromDb(error);

  return { ...quiz, questions: data };
}

// 모든 문항에 정확히 한 번씩 답했는지 확인하고 채점한다. DB를 쓰지 않는 순수 함수다.
export function gradeQuiz(questions: QuestionForGrading[], answers: SubmittedAnswers) {
  const answerByQuestion = new Map<string, number>();

  for (const { question_id, answer } of answers) {
    if (answerByQuestion.has(question_id)) {
      console.warn('[api] 퀴즈 답 중복');
      throw new AppError('VALIDATION_FAILED');
    }
    answerByQuestion.set(question_id, answer);
  }

  // 답의 개수가 문항 수와 같고 모든 문항에 답이 있으면, 없는 문항에 낸 답도 없다.
  const answeredAll =
    answerByQuestion.size === questions.length && questions.every((q) => answerByQuestion.has(q.id));
  if (!answeredAll) {
    console.warn('[api] 퀴즈 답이 문항과 맞지 않음');
    throw new AppError('VALIDATION_FAILED');
  }

  const results = questions.map((q) => ({
    question_id: q.id,
    correct: answerByQuestion.get(q.id) === q.answer,
    correct_answer: q.answer,
    explanation: q.explanation,
  }));

  return {
    results,
    correct_count: results.filter((r) => r.correct).length,
    total_count: questions.length,
  };
}

// POST /quizzes/:id/submit: 채점하고 결과를 저장한다. 한 퀴즈는 한 번만 제출할 수 있다.
export async function submitQuiz(
  userDb: SupabaseClient,
  adminDb: SupabaseClient,
  quizId: string,
  answers: SubmittedAnswers,
): Promise<SubmitQuizResponse> {
  const quiz = await getMyQuiz(userDb, quizId);

  const { data: submitted, error: submittedError } = await userDb
    .from('quiz_attempts')
    .select('id')
    .eq('quiz_id', quiz.id)
    .maybeSingle();

  if (submittedError) throw appErrorFromDb(submittedError);
  if (submitted) throw new AppError('INVALID_STATE', ALREADY_SUBMITTED_MESSAGE);

  // 정답을 읽어야 하는데 quiz_questions는 서버 전용 테이블이라 adminDb로 읽는다.
  const { data: questions, error: questionsError } = await adminDb
    .from('quiz_questions')
    .select('id, answer, explanation')
    .eq('quiz_id', quiz.id)
    .order('seq');

  if (questionsError) throw appErrorFromDb(questionsError);

  const grade = gradeQuiz(questions, answers);

  // 점수를 앱이 정하면 안 되므로 quiz_attempts에는 앱 역할의 추가 권한이 없다. 그래서 adminDb로 쓴다.
  const { data: attempt, error: insertError } = await adminDb
    .from('quiz_attempts')
    .insert({
      quiz_id: quiz.id,
      answers,
      correct_count: grade.correct_count,
      total_count: grade.total_count,
    })
    .select('id, quiz_id, answers, correct_count, total_count, graded_at')
    .single();

  if (insertError) {
    // 같은 퀴즈를 동시에 두 번 제출하면 둘 다 위의 확인을 통과하고, quiz_id unique 제약에서 한쪽이 막힌다.
    if (insertError.code === '23505') throw new AppError('INVALID_STATE', ALREADY_SUBMITTED_MESSAGE);
    throw appErrorFromDb(insertError);
  }

  return { attempt, results: grade.results };
}
