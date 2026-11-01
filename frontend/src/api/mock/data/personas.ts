import type { SpeciesId } from '@quack/shared';

import type { TeacherPersona } from '@/api/tempContract';

// 프로토타입의 성격·말투 예시다. 실제 말투는 AI 페르소나에서 정한다.
export const PERSONAS: Record<SpeciesId, TeacherPersona> = {
  rubber_duck: {
    label: '다정한 응원형',
    tags: ['차근차근', '안심시키기', '작은 성취'],
    lines: {
      idle: '천천히 해도 괜찮아. 지금 배운 것 중 하나만 들려줄래?',
      listen: '응, 네 이야기에 집중하고 있어.',
      surprised: '오, 그렇게 연결해서 생각했구나!',
      thinking: '네 설명을 차근차근 이어 보고 있어.',
      praise: '잘했어! 네 말로 설명한 만큼 이해가 자랐네.',
      question: '좋은 시작이야. 이 개념이 실제로 쓰이는 예도 하나 들려줄래?',
    },
  },
  cat: {
    label: '명쾌한 질문형',
    tags: ['핵심 콕', '논리 확인', '짧고 선명하게'],
    lines: {
      idle: '잠깐 점검하자. 지금 개념을 한 문장으로 정의하면?',
      listen: '좋아, 핵심부터 들어볼게.',
      surprised: '오, 그 연결은 흥미로운데?',
      thinking: '설명의 전제와 결론을 맞춰 보는 중이야.',
      praise: '핵심이 정확해. 이제 네 지식이 됐네!',
      question: '그 설명의 근거는 뭐야? 반대 상황에서도 성립할까?',
    },
  },
  raccoon: {
    label: '호기심 탐구형',
    tags: ['예시 탐험', '비교하기', '함께 발견'],
    lines: {
      idle: '우리 작은 실험 해볼까? 배운 개념을 일상에서 찾아보자!',
      listen: '같이 따라가 볼게. 어떤 예를 떠올렸어?',
      surprised: '새로운 단서를 찾았네!',
      thinking: '설명 속 단서들을 나란히 놓고 비교하고 있어.',
      praise: '발견 성공! 다음에는 다른 예시도 탐험해 보자.',
      question: '조건을 하나 바꾸면 어떻게 될까? 다른 예시와 비교해 볼래?',
    },
  },
};
