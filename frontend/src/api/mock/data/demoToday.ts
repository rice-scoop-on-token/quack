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
    text: '데모 설명',
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

export function demoTodaySessions(folderIds: string[], now: Date): StudySession[] {
  const ended = now.toISOString();
  const base = {
    user_id: TEMP_USER_ID,
    goal: '데모',
    status: 'reported',
    started_at: ended,
    ended_at: ended,
    quiz: null,
  } as const;
  return [
    {
      ...base,
      id: '00000000-0000-4000-8000-0000000000d1',
      folder_id: folderIds[0],
      study_seconds: 25 * 60,
      turns: [demoTurn(1, '핵심 정의'), demoTurn(2, '사용 예시')],
    },
    {
      ...base,
      id: '00000000-0000-4000-8000-0000000000d2',
      folder_id: folderIds[1] ?? folderIds[0],
      study_seconds: 18 * 60,
      turns: [],
    },
  ];
}
