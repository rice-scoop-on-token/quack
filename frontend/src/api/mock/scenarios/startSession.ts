// 공부 시작 범위 판정 mock(POST /sessions/start 의 판정 부분). 실제 판정은 AI가 한다.
// 한계: 키워드 일치만 본다. 키워드에 없는 컴퓨터공학 개념은 범위 밖으로 나오고, 키워드가 다른 말 속에 들어 있으면
// (예: '스트리밍'의 '트리') 범위 안으로 나온다. 시연용이라 같은 입력은 늘 같은 판정이다.

export type GoalVerdict = 'in_scope' | 'out_of_scope' | 'needs_clarification';

// 지원 과목 3개의 대표 개념. 공백을 없애고 소문자로 바꾼 목표와 비교한다.
const CONCEPT_KEYWORDS = [
  // 자료구조
  '스택', '큐', '연결리스트', '링크드리스트', '트리', '해시', '힙', '배열', '그래프',
  // 알고리즘
  '이분탐색', '이진탐색', '탐색', '정렬', '재귀', '시간복잡도', '공간복잡도', '빅오', '동적계획', '분할정복', '그리디', '점화식', 'bfs', 'dfs',
  // 컴퓨터구조
  '직접사상', '캐시', '캐시히트', '히트', '메모리', '파이프라인', '해저드', '레지스터', '명령어', 'cpu', '분기예측', '페이지',
];

const SUBJECT_NAMES = ['자료구조', '알고리즘', '컴퓨터구조'];

// 띄어쓰기 차이(이분 탐색/이분탐색)를 없애고 비교한다
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '');

// 개념 키워드가 있으면 범위 안, 과목 이름만 있으면 더 구체적으로, 둘 다 없으면 범위 밖이다.
// 예) "스택과 큐의 차이를 내 말로 설명하기" → in_scope
//     "자료구조 공부하기" → needs_clarification
//     "영어 단어 외우기", "TCP와 UDP의 차이" → out_of_scope
export function judgeGoal(goal: string): GoalVerdict {
  const text = normalize(goal);
  if (CONCEPT_KEYWORDS.some((k) => text.includes(k))) {
    return 'in_scope';
  }
  if (SUBJECT_NAMES.some((s) => text.includes(s))) {
    return 'needs_clarification';
  }
  return 'out_of_scope';
}
