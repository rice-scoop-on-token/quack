import { CATALOG_SUBJECTS } from '@/api/mock/data/catalog';
import { dailyQuestionsFor } from '@/api/mock/data/subjectContent';
import type { TempDailyQuiz, TempDailyQuizResult, TempLockQuizSettings } from '@/api/tempContract';

// 오늘의 퀴즈. 사용자의 폴더 과목(지원 과목 3개) 중에서 날짜(일 단위)로 돌려가며 고른다.
// 폴더가 지원 과목 밖뿐이거나 없으면 자료구조 문제다. 실제 문제는 서버가 과목 자료로 낸다.
// 한 과목 안에서도 날짜에 따라 문제가 바뀐다. 같은 날에는 새로고침해도 같은 문제다(날짜만으로 고르기 때문이다).

export type DailyQuizPick = { quiz: TempDailyQuiz; answer: number; explanation: string };

// 로컬 날짜가 1970-01-01부터 며칠째인지. 시각이 바뀌어도 하루 동안은 같은 값이다.
function dayNumber(now: Date): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
}

export function pickDailyQuiz(folderNames: string[], now: Date): DailyQuizPick {
  // 폴더가 있는 지원 과목을 카탈로그 순서로. 없으면 자료구조(첫 과목)
  const owned = CATALOG_SUBJECTS.filter((s) => folderNames.includes(s.name));
  const subjects = owned.length > 0 ? owned : CATALOG_SUBJECTS.slice(0, 1);
  const day = dayNumber(now);
  const subject = subjects[day % subjects.length];
  const questions = dailyQuestionsFor(subject.name);
  const index = Math.floor(day / subjects.length) % questions.length;
  const q = questions[index];
  return {
    quiz: { id: `daily-quiz-${subject.id}-${index}`, prompt: q.prompt, choices: q.choices },
    answer: q.answer,
    explanation: q.explanation,
  };
}

// 채점은 푼 문제의 id로 한다. 문제를 받은 뒤 자정이 지나도 그 문제로 채점된다.
export function gradeDailyQuiz(quizId: string, answer: number, fallback: DailyQuizPick): TempDailyQuizResult {
  const match = /^daily-quiz-(.+)-(\d+)$/.exec(quizId);
  const subject = CATALOG_SUBJECTS.find((s) => s.id === match?.[1]);
  const q = subject ? dailyQuestionsFor(subject.name)[Number(match?.[2])] : undefined;
  const picked = q ?? { answer: fallback.answer, explanation: fallback.explanation };
  return { correct: answer === picked.answer, correct_answer: picked.answer, explanation: picked.explanation };
}

export const DEFAULT_LOCK_QUIZ: TempLockQuizSettings = {
  enabled: true,
  quiet_at_night: true,
  per_day: 3,
  folder_id: null,
};
