import { TEMP_USER_ID } from '@/api/mock/ids';
import type { SessionTurn, StudySession } from '@/api/tempContract';

// ?demo=records 의 지난 4주 기록. 달력과 분석 화면이 실제 기록에 화면 안에서 더한다(listSessions에는 섞지 않는다).
// 한계: 이 세션은 저장돼 있지 않아서 달력에서 눌러 지난 리포트로 가면 "찾을 수 없어요"가 나온다.

const CONCEPTS = ['핵심 정의', '사용 예시'];
// 충분 판정을 받지 못하는 개념. 세션마다 3개씩 남아 분석의 "더 보기"를 볼 수 있다.
const WEAK_CONCEPTS = ['비교와 차이', '적용 사례', '예외 상황', '용어 구분', '단계별 순서', '원리 설명', '한계와 조건', '핵심 공식', '오개념 정리'];

function turn(seq: number, concept: string, verdict: 'sufficient' | 'insufficient'): SessionTurn {
  return {
    seq,
    trigger: 'self',
    input_mode: 'chat',
    question_text: null,
    text: '데모 설명',
    analysis: {
      verdict,
      concept,
      missing_concepts: [],
      follow_up_question: null,
      next_topic: null,
      follow_up_count: 0,
    },
  };
}

export function demoRecordSessions(folderIds: string[], now: Date): StudySession[] {
  if (folderIds.length === 0) {
    return [];
  }
  const sessions: StudySession[] = [];
  // 어제부터 28일 전까지, 3일에 한 번은 쉰다
  for (let i = 1; i <= 28; i++) {
    if (i % 3 === 0) {
      continue;
    }
    const ended = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 20, 0).toISOString();
    const turns = [turn(1, CONCEPTS[0], 'sufficient')];
    if (i % 2 === 0) {
      turns.push(turn(2, CONCEPTS[1], 'sufficient'));
    }
    for (let k = 0; k < 3; k++) {
      turns.push(turn(3 + k, WEAK_CONCEPTS[(i * 3 + k) % WEAK_CONCEPTS.length], 'insufficient'));
    }
    sessions.push({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      user_id: TEMP_USER_ID,
      folder_id: folderIds[i % folderIds.length],
      goal: `데모 ${i}일 전 공부`,
      status: 'reported',
      started_at: ended,
      ended_at: ended,
      study_seconds: (15 + ((i * 7) % 35)) * 60,
      turns,
      quiz: null,
    });
  }
  return sessions;
}
