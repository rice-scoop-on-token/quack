import type { SpeciesId } from '@quack/shared';

import type { TeacherPersona } from '@/api/tempContract';

// 프로토타입의 성격과 말투 예시다. 실제 성격과 말투는 AI 페르소나에서 정한다.
export const PERSONAS: Record<SpeciesId, TeacherPersona> = {
  rubber_duck: {
    label: '다정한 응원형',
    tags: ['차근차근', '안심시키기', '작은 성취'],
    greeting: '천천히 해도 괜찮아. 지금 배운 것 중 하나만 들려줄래?',
  },
  cat: {
    label: '명쾌한 질문형',
    tags: ['핵심 콕', '논리 확인', '짧고 선명하게'],
    greeting: '잠깐 점검하자. 지금 개념을 한 문장으로 정의하면?',
  },
  raccoon: {
    label: '호기심 탐구형',
    tags: ['예시 탐험', '비교하기', '함께 발견'],
    greeting: '우리 작은 실험 해볼까? 배운 개념을 일상에서 찾아보자!',
  },
};
