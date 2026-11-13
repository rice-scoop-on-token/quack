import type { ImageSourcePropType } from 'react-native';

// 둥근 선 아이콘(assets/ui/icons). 단색 + 투명 PNG이고, Image의 tintColor로 색을 바꿔 쓴다.
// Metro의 require()는 경로를 조합할 수 없어서 모든 경로를 적는다.
// size는 파일 크기 ÷ 3(3배 이미지)이다. 72px → 24dp, 60px → 20dp, 48px → 16dp.
export const ICONS = {
  'arrow-left': { source: require('../../../assets/ui/icons/arrow-left.png'), size: 24 },
  'arrow-right': { source: require('../../../assets/ui/icons/arrow-right.png'), size: 24 },
  back: { source: require('../../../assets/ui/icons/back.png'), size: 24 },
  check: { source: require('../../../assets/ui/icons/check.png'), size: 20 },
  'chevron-down': { source: require('../../../assets/ui/icons/chevron-down.png'), size: 16 },
  'chevron-up': { source: require('../../../assets/ui/icons/chevron-up.png'), size: 16 },
  'forward-15': { source: require('../../../assets/ui/icons/forward-15.png'), size: 24 },
  lock: { source: require('../../../assets/ui/icons/lock.png'), size: 24 },
  'mic-off': { source: require('../../../assets/ui/icons/mic-off.png'), size: 24 },
  'mic-on': { source: require('../../../assets/ui/icons/mic-on.png'), size: 24 },
  'more-vertical': { source: require('../../../assets/ui/icons/more-vertical.png'), size: 24 },
  pause: { source: require('../../../assets/ui/icons/pause.png'), size: 24 },
  play: { source: require('../../../assets/ui/icons/play.png'), size: 24 },
  plus: { source: require('../../../assets/ui/icons/plus.png'), size: 16 },
  'rewind-15': { source: require('../../../assets/ui/icons/rewind-15.png'), size: 24 },
} satisfies Record<string, { source: ImageSourcePropType; size: number }>;

export type IconName = keyof typeof ICONS;

// 색이 이미 들어 있는 그림이라 tintColor를 쓰지 않는다. 표시 크기도 파일 크기 ÷ 3이다.
// 토글 156×84px → 52×28dp, 스피너 96×96px → 32×32dp(한 장짜리라 코드로 회전시킨다).
export const TOGGLE_IMAGES = {
  on: require('../../../assets/ui/icons/toggle-on.png'),
  off: require('../../../assets/ui/icons/toggle-off.png'),
} satisfies Record<string, ImageSourcePropType>;
export const TOGGLE_SIZE = { width: 52, height: 28 } as const;

export const SPINNER_IMAGE: ImageSourcePropType = require('../../../assets/ui/icons/spinner.png');
export const SPINNER_SIZE = 32;
