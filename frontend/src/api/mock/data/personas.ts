import type { SpeciesId } from '@quack/shared';

import type { TeacherPersona } from '@/api/tempContract';

// 프로토타입의 성격과 말투 예시다. 실제 성격과 말투는 AI 페르소나에서 정한다.
export const PERSONAS: Record<SpeciesId, TeacherPersona> = {
  rubber_duck: {
    label: '다정한 응원형',
    tags: ['차근차근', '안심시키기', '작은 성취'],
    greeting: '천천히 해도 괜찮아. 지금 배운 것 중 하나만 들려줄래?',
    lines: {
      aiQuestion: '천천히 해도 괜찮아. 지금 배운 것 중 하나만 들려줄래?',
      followUpLead: '좋은 시작이야. 조금만 더 이어 볼까?',
      thinking: '음, 네 설명을 차근차근 들어 보고 있어.',
      praise: '잘했어! 네 말로 설명한 만큼 이해가 자랐네.',
      skip: '여기까지도 충분히 애썼어. 이 개념은 다음에 같이 다시 보자.',
    },
  },
  cat: {
    label: '명쾌한 질문형',
    tags: ['핵심 콕', '논리 확인', '짧고 선명하게'],
    greeting: '잠깐 점검하자. 지금 개념을 한 문장으로 정의하면?',
    lines: {
      aiQuestion: '잠깐 점검하자. 지금 개념을 한 문장으로 정의하면?',
      followUpLead: '핵심은 잡았어. 하나만 더 확인하자.',
      thinking: '논리를 따라가는 중이야.',
      praise: '핵심이 정확해. 이제 네 지식이 됐네!',
      skip: '이 부분은 아직 빈틈이 있어. 리포트에 표시해 둘게.',
    },
  },
  raccoon: {
    label: '호기심 탐구형',
    tags: ['예시 탐험', '비교하기', '함께 발견'],
    greeting: '우리 작은 실험 해볼까? 배운 개념을 일상에서 찾아보자!',
    lines: {
      aiQuestion: '우리 작은 실험 해볼까? 방금 배운 개념을 일상에서 찾아보자!',
      followUpLead: '오, 재밌는데? 한 걸음 더 탐험해 보자.',
      thinking: '네 설명 속에서 단서를 찾는 중이야!',
      praise: '발견 성공! 다음에는 다른 예시도 탐험해 보자.',
      skip: '이 길은 다음 탐험으로 남겨 두자. 리포트에 표시해 둘게!',
    },
  },
};
