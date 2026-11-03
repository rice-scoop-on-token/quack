import type { QuizPublic, QuizQuestionResult } from '@quack/shared';

import { tempId } from '@/api/mock/ids';

// 점검(S-04) 퀴즈 mock. 형식은 shared 추천안(객관식 4지선다)을 따른다.
// 자료 분석이 없어서 과목과 상관없는 "설명하며 공부하기" 문항 3개를 쓴다.
// 서버의 POST /sessions/:id/quiz (문항), POST /quizzes/:id/submit (채점) 역할이다.

type MockQuestion = { prompt: string; choices: string[]; answer: number; explanation: string };

const QUESTIONS: MockQuestion[] = [
  {
    prompt: '내 말로 설명해 보는 공부가 도움이 되는 가장 큰 이유는?',
    choices: ['글자를 빨리 읽게 돼서', '모르는 부분이 드러나서', '외울 양이 줄어서', '시간이 덜 걸려서'],
    answer: 1,
    explanation: '설명하다 막히는 곳이 바로 아직 이해하지 못한 부분이에요.',
  },
  {
    prompt: '선생님이 꼬리 질문을 하는 때는?',
    choices: ['설명이 충분할 때', '공부를 마칠 때', '설명에 빠진 부분이 있을 때', '쉬기를 눌렀을 때'],
    answer: 2,
    explanation: '부족하거나 모호한 설명에는 빠진 부분을 채우도록 꼬리 질문을 해요.',
  },
  {
    prompt: '개념을 잘 이해했는지 확인하기 좋은 방법은?',
    choices: ['제목만 다시 읽기', '실제 예시를 들어 설명하기', '형광펜으로 칠하기', '책을 덮고 쉬기'],
    answer: 1,
    explanation: '예시를 들 수 있으면 개념을 실제 상황과 연결해 이해한 거예요.',
  },
];

// 앱에 주는 문항에는 정답과 해설을 넣지 않는다(서버 계약과 같게)
export function createMockQuiz(sessionId: string): QuizPublic {
  const quizId = tempId();
  return {
    id: quizId,
    session_id: sessionId,
    created_at: new Date().toISOString(),
    questions: QUESTIONS.map((q, i) => ({
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
export function gradeMockQuiz(quiz: QuizPublic, answers: number[]): QuizQuestionResult[] {
  return quiz.questions.map((q, i) => ({
    question_id: q.id,
    correct: answers[i] === QUESTIONS[i].answer,
    correct_answer: QUESTIONS[i].answer,
    explanation: QUESTIONS[i].explanation,
  }));
}
