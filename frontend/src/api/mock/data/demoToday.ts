import type { Folder } from '@quack/shared';

import { contentFor } from '@/api/mock/data/subjectContent';
import { TEMP_USER_ID } from '@/api/mock/ids';
import type { SessionTurn, StudySession } from '@/api/tempContract';

// ?demo=today 의 오늘 기록: 두 과목으로 나뉜 세션 2건(25분, 18분), 충분 판정을 받은 개념 2개.
// 과목은 사용자의 과목을 쓴다(과목이 하나면 두 세션 모두 그 과목). 과목 선택에 가짜 과목이 섞이지 않게 하기 위해서다.

function demoTurn(seq: number, concept: string): SessionTurn {
  return {
    seq,
    trigger: 'self',
    input_mode: 'chat',
    question_text: null,
    text: `${concept}에 대해 내 말로 설명한 내용이에요.`,
    analysis: {
      verdict: 'sufficient',
      concept,
      missing_concepts: [],
      follow_up_question: null,
      next_topic: null,
      follow_up_count: 0,
    },
  };
}

// 폴더의 과목에 맞는 개념과 목표를 쓴다(폴더 이름이 지원 과목 밖이면 자료구조 것).
export function demoTodaySessions(folders: Pick<Folder, 'id' | 'name'>[], now: Date): StudySession[] {
  if (folders.length === 0) {
    return [];
  }
  const first = folders[0];
  const second = folders[1] ?? first;
  const firstConcepts = contentFor(first.name).concepts;
  const secondConcepts = contentFor(second.name).concepts;
  const ended = now.toISOString();
  const base = {
    user_id: TEMP_USER_ID,
    status: 'reported',
    started_at: ended,
    ended_at: ended,
    quiz: null,
  } as const;
  return [
    {
      ...base,
      id: '00000000-0000-4000-8000-0000000000d1',
      folder_id: first.id,
      goal: `'${firstConcepts[0]}' 개념을 내 말로 설명하기`,
      study_seconds: 25 * 60,
      turns: [demoTurn(1, firstConcepts[0]), demoTurn(2, firstConcepts[1])],
    },
    {
      ...base,
      id: '00000000-0000-4000-8000-0000000000d2',
      folder_id: second.id,
      goal: `'${secondConcepts[2]}' 개념을 내 말로 설명하기`,
      study_seconds: 18 * 60,
      turns: [],
    },
  ];
}
