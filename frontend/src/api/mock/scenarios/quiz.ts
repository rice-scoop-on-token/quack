import type { QuizPublic, QuizQuestionResult } from '@quack/shared';

import { contentFor } from '@/api/mock/data/subjectContent';
import { tempId } from '@/api/mock/ids';

// 점검(S-04) 퀴즈 mock. 형식은 shared 추천안(객관식 4지선다)을 따른다.
// 자료 분석이 없어서 그 폴더 과목의 문항 3개를 쓴다(data/subjectContent.ts). 지원 과목 밖 폴더는 자료구조 문항이다.
// 서버의 POST /sessions/:id/quiz (문항), POST /quizzes/:id/submit (채점) 역할이다.

// 앱에 주는 문항에는 정답과 해설을 넣지 않는다(서버 계약과 같게)
export function createMockQuiz(sessionId: string, folderName: string | undefined): QuizPublic {
  const quizId = tempId();
  return {
    id: quizId,
    session_id: sessionId,
    created_at: new Date().toISOString(),
    questions: contentFor(folderName).quiz.map((q, i) => ({
      id: tempId(),
      quiz_id: quizId,
      seq: i + 1,
      type: 'multiple_choice',
      prompt: q.prompt,
      choices: q.choices,
    })),
  };
}

// 고른 보기 위치로 채점한다. 정답 위치와 해설은 제출한 뒤에만 돌려준다.
export function gradeMockQuiz(quiz: QuizPublic, answers: number[], folderName: string | undefined): QuizQuestionResult[] {
  const questions = contentFor(folderName).quiz;
  return quiz.questions.map((q, i) => ({
    question_id: q.id,
    correct: answers[i] === questions[i].answer,
    correct_answer: questions[i].answer,
    explanation: questions[i].explanation,
  }));
}
