import type { CharacterAction } from '@/features/character/characterAssets';

// 화면 상태별 캐릭터 동작. 여기 없는 화면(온보딩, 선생님 선택, 과목 카드, 리포트 등)은 기본 그림을 보여 준다.
// 에셋 담당의 처음 제안(assets/animal/manifest.json의 mvp.screenActions)을 따랐다. 바꿀 때는 이 표만 고친다.
export const SCREEN_ACTIONS = {
  home: 'idle',
  subjectDetail: 'idle',
  sessionSetup: 'idle',
  timing: 'read',
  // 임시 구현, 팀 확인 필요: 에셋 제안에 없는 상태라 기본 대기 동작으로 정했다
  paused: 'idle',
  aiQuestion: 'idle',
  // 설명을 보내고 분석 결과를 기다리는 동안
  analyzing: 'think',
  followUpInsufficient: 'dejected',
  followUpAmbiguous: 'surprised',
  confirmed: 'happy_jump',
  reward: 'happy_jump',
  growth: 'happy_jump',
} as const satisfies Record<string, CharacterAction>;
