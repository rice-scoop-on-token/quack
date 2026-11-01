import type { PersonaLine, TeacherMotion } from '@/api/tempContract';

export const MOTION_LABEL: Record<TeacherMotion, string> = {
  reading: '함께 책 읽는 중',
  listening: '답변 듣는 중',
  surprised: '답변에 반응하는 중',
  thinking: '꼬리 질문 생각 중',
  celebrate: '이해를 함께 기뻐하는 중',
  writing: '함께 정리하는 중',
};

// 모션마다 말풍선에 보여 줄 말투 (프로토타입과 같은 짝)
export const MOTION_LINE: Record<TeacherMotion, PersonaLine> = {
  reading: 'idle',
  listening: 'listen',
  surprised: 'surprised',
  thinking: 'thinking',
  celebrate: 'praise',
  writing: 'thinking',
};
