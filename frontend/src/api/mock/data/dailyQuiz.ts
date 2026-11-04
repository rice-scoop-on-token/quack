import type { TempDailyQuiz, TempDailyQuizResult, TempLockQuizSettings } from '@/api/tempContract';

// 오늘의 퀴즈는 과목과 상관없는 고정 1문제다. 실제 문제는 서버가 과목 자료로 낸다.
export const DAILY_QUIZ_ANSWER = 0;

export const DAILY_QUIZ: TempDailyQuiz = {
  id: 'daily-quiz-1',
  prompt: '배운 내용을 내 말로 설명하며 공부하는 방법을 무엇이라고 할까요?',
  choices: ['설명하며 배우기', '소리 내어 외우기', '밑줄 긋기'],
};

export const DAILY_QUIZ_RESULT: Omit<TempDailyQuizResult, 'correct'> = {
  correct_answer: DAILY_QUIZ_ANSWER,
  explanation: '남에게 설명해 보면 내가 정확히 이해했는지 바로 알 수 있어요.',
};

export const DEFAULT_LOCK_QUIZ: TempLockQuizSettings = {
  enabled: true,
  quiet_at_night: true,
  per_day: 3,
  folder_id: null,
};
