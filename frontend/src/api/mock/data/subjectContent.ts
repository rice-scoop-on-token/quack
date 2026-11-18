// 과목별 시연 내용(분석 개념, 점검 퀴즈, 팟캐스트 대사). 폴더 이름이 지원 과목 3개 중 하나면 그 과목 것을 쓰고,
// 3개 밖 이름의 폴더(예전 저장값)는 자료구조(기본 세트)로 대신한다. 알고리즘 폴더에서 스택 개념이 나오지 않게 하려는 분리다.
// 개념 이름에는 공부 시작 범위 판정(키워드)이 알아보는 말이 들어 있어야 한다. 분석 화면의 추천 목표가 거절되지 않게 하기 위해서다.

export type MockQuestion = { prompt: string; choices: string[]; answer: number; explanation: string };

type SubjectContent = {
  // 설명 분석이 순서대로 쓰는 개념 3개. 앞의 둘은 데모 기록에서 충분 판정을 받은 개념으로도 쓴다.
  concepts: string[];
  // 충분 판정을 받지 못하는 개념(데모 기록의 보완할 개념)
  weakConcepts: string[];
  quiz: MockQuestion[];
  // 팟캐스트 대사 중 과목에 맞는 두 줄(첫 줄과 마지막 줄 사이)
  podcastLines: [string, string];
};

const DEFAULT_SUBJECT = '자료구조';

const CONTENT: Record<string, SubjectContent> = {
  자료구조: {
    concepts: ['스택의 LIFO 구조', '큐의 FIFO 구조', '스택과 큐 비교'],
    weakConcepts: [
      '연결 리스트의 삽입과 삭제',
      '배열과 연결 리스트 비교',
      '이진 트리 순회 방법',
      '해시 충돌 해결 방법',
      '힙과 우선순위 큐',
      '트리 높이와 균형',
    ],
    quiz: [
      {
        prompt: '스택에서 가장 나중에 들어온 데이터를 가장 먼저 꺼내는 방식은?',
        choices: ['FIFO', 'LIFO', '랜덤 접근', '우선순위 순'],
        answer: 1,
        explanation: 'LIFO(Last In First Out)는 접시를 쌓아 두고 맨 위부터 꺼내는 것과 같아요.',
      },
      {
        prompt: '큐에서 데이터를 넣는 쪽과 꺼내는 쪽은?',
        choices: ['넣는 쪽과 꺼내는 쪽이 같다', '뒤에서 넣고 앞에서 꺼낸다', '앞에서 넣고 뒤에서 꺼낸다', '아무 곳에서나 넣고 꺼낸다'],
        answer: 1,
        explanation: '큐는 줄서기처럼 뒤(rear)로 들어가 앞(front)에서 나가요.',
      },
      {
        prompt: '연결 리스트가 배열보다 유리한 경우는?',
        choices: ['중간 삽입과 삭제가 잦을 때', '인덱스로 바로 접근할 때', '메모리를 연속으로 써야 할 때', '정렬된 데이터만 다룰 때'],
        answer: 0,
        explanation: '연결 리스트는 앞뒤 연결만 바꾸면 되어서 중간 삽입·삭제에 유리해요.',
      },
    ],
    podcastLines: [
      '자료구조는 데이터를 어떻게 담아 두면 꺼내기 쉬운지를 다뤄. 스택과 큐가 가장 좋은 출발점이야.',
      '스택은 나중에 넣은 걸 먼저 꺼내고, 큐는 먼저 넣은 걸 먼저 꺼내. 이 차이를 예시로 떠올려 보자.',
    ],
  },
  알고리즘: {
    concepts: ['이분 탐색의 원리', '재귀 호출의 종료 조건', '시간 복잡도 비교'],
    weakConcepts: [
      '버블 정렬과 퀵 정렬 비교',
      '병합 정렬의 분할과 정복',
      '동적 계획법의 점화식',
      '그래프 탐색 BFS와 DFS',
      '시간 복잡도 빅오 표기',
      '재귀와 반복문의 차이',
    ],
    quiz: [
      {
        prompt: '정렬된 배열에서 이분 탐색의 시간 복잡도는?',
        choices: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        answer: 1,
        explanation: '한 번 비교할 때마다 탐색 범위가 절반으로 줄어서 O(log n)이에요.',
      },
      {
        prompt: '재귀 함수에 꼭 필요한 것은?',
        choices: ['전역 변수', '종료 조건', '반복문', '정렬된 입력'],
        answer: 1,
        explanation: '종료 조건이 없으면 함수가 끝없이 자기 자신을 불러요.',
      },
      {
        prompt: '너비 우선 탐색(BFS)이 주로 쓰는 자료구조는?',
        choices: ['스택', '큐', '해시 테이블', '힙'],
        answer: 1,
        explanation: 'BFS는 가까운 정점부터 차례로 방문해서 먼저 넣은 것을 먼저 꺼내는 큐를 써요.',
      },
    ],
    podcastLines: [
      '알고리즘은 같은 문제를 더 빠르게 푸는 방법을 찾는 공부야. 시간 복잡도로 속도를 비교해.',
      '이분 탐색처럼 범위를 절반씩 줄이면 왜 빨라지는지, 직접 숫자로 따라가 보면 금방 이해돼.',
    ],
  },
  컴퓨터구조: {
    concepts: ['직접 사상 캐시의 구조', '캐시 히트와 미스의 차이', '캐시와 메모리 계층 비교'],
    weakConcepts: [
      '파이프라인 해저드 종류',
      '명령어 사이클 단계',
      '레지스터와 메모리 차이',
      '가상 메모리와 페이지',
      '캐시 쓰기 정책',
      '분기 예측과 파이프라인',
    ],
    quiz: [
      {
        prompt: '요청한 데이터가 캐시에 이미 있는 경우를 무엇이라고 하나?',
        choices: ['캐시 미스', '캐시 히트', '페이지 폴트', '분기 예측'],
        answer: 1,
        explanation: '캐시에 있으면 히트, 없어서 메모리에서 가져와야 하면 미스예요.',
      },
      {
        prompt: '직접 사상 캐시에서 메모리 블록이 들어갈 수 있는 캐시 위치는?',
        choices: ['아무 곳이나', '정해진 한 곳', '두 곳', '네 곳'],
        answer: 1,
        explanation: '직접 사상은 블록 번호로 들어갈 자리가 하나로 정해져 있어요.',
      },
      {
        prompt: '파이프라인에서 앞 명령어의 결과를 기다려야 해서 생기는 문제는?',
        choices: ['데이터 해저드', '캐시 히트', '가상 메모리', '인터럽트'],
        answer: 0,
        explanation: '뒤 명령어가 앞 명령어의 결과를 필요로 하면 기다려야 하는데, 이를 데이터 해저드라고 해요.',
      },
    ],
    podcastLines: [
      '컴퓨터구조는 CPU와 메모리가 어떻게 함께 일하는지를 다뤄. 캐시가 왜 필요한지부터 보자.',
      '캐시 히트일 때와 미스일 때 걸리는 시간 차이를 떠올리면 메모리 계층이 한눈에 정리돼.',
    ],
  },
};

export function contentFor(folderName: string | undefined): SubjectContent {
  return CONTENT[folderName ?? ''] ?? CONTENT[DEFAULT_SUBJECT];
}

// 오늘의 퀴즈 문제(공부와 별개인 앱 퀴즈). 과목마다 2문제이고 보기는 3개다. 정답은 answer(보기 위치)다.
export type DailyQuestion = { prompt: string; choices: string[]; answer: number; explanation: string };

const DAILY_QUESTIONS: Record<string, DailyQuestion[]> = {
  자료구조: [
    {
      prompt: '스택에서 가장 나중에 들어온 데이터를 가장 먼저 꺼내는 방식을 무엇이라고 할까요?',
      choices: ['LIFO', 'FIFO', '랜덤 접근'],
      answer: 0,
      explanation: 'LIFO(Last In First Out)는 접시를 쌓아 두고 맨 위부터 꺼내는 것과 같아요.',
    },
    {
      prompt: '먼저 들어온 데이터를 먼저 꺼내는 줄서기 모양의 자료구조는?',
      choices: ['스택', '큐', '트리'],
      answer: 1,
      explanation: '큐는 FIFO(First In First Out)라서 먼저 줄 선 데이터가 먼저 나가요.',
    },
  ],
  알고리즘: [
    {
      prompt: '정렬된 배열에서 값을 찾을 때 탐색 범위를 절반씩 줄여 가는 방법은?',
      choices: ['선형 탐색', '이분 탐색', '해시 탐색'],
      answer: 1,
      explanation: '이분 탐색은 한 번 비교할 때마다 범위가 절반이 되어서 시간 복잡도가 O(log n)이에요.',
    },
    {
      prompt: '재귀 함수가 끝없이 자기 자신을 부르지 않게 하려면 꼭 필요한 것은?',
      choices: ['종료 조건', '전역 변수', '반복문'],
      answer: 0,
      explanation: '종료 조건에 닿으면 더 부르지 않고 값을 돌려주기 때문에 재귀가 끝나요.',
    },
  ],
  컴퓨터구조: [
    {
      prompt: '요청한 데이터가 캐시에 이미 있어서 바로 읽을 수 있는 경우를 무엇이라고 할까요?',
      choices: ['캐시 미스', '페이지 폴트', '캐시 히트'],
      answer: 2,
      explanation: '캐시에 있으면 히트, 없어서 메모리에서 가져와야 하면 미스예요.',
    },
    {
      prompt: '직접 사상 캐시에서 메모리 블록이 들어갈 수 있는 캐시 위치는 몇 곳일까요?',
      choices: ['정해진 한 곳', '아무 곳이나', '두 곳'],
      answer: 0,
      explanation: '직접 사상은 블록 번호로 들어갈 자리가 하나로 정해져 있어요.',
    },
  ],
};

export function dailyQuestionsFor(subjectName: string): DailyQuestion[] {
  return DAILY_QUESTIONS[subjectName] ?? DAILY_QUESTIONS[DEFAULT_SUBJECT];
}
