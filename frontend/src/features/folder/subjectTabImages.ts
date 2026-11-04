import type { ImageSourcePropType } from 'react-native';

// 파일철 탭 이미지. 활성 198×132, 비활성 174×132(기기 배율 3배 기준, 표시 크기는 66×44, 58×44).
// Metro의 require()는 경로를 조합할 수 없어서 모든 경로를 적는다.
export const TAB_IMAGES = {
  info: {
    inactive: require('../../../assets/ui/folder/tab-info.png'),
    active: require('../../../assets/ui/folder/tab-info-active.png'),
  },
  materials: {
    inactive: require('../../../assets/ui/folder/tab-materials.png'),
    active: require('../../../assets/ui/folder/tab-materials-active.png'),
  },
  study: {
    inactive: require('../../../assets/ui/folder/tab-study.png'),
    active: require('../../../assets/ui/folder/tab-study-active.png'),
  },
  quiz: {
    inactive: require('../../../assets/ui/folder/tab-quiz.png'),
    active: require('../../../assets/ui/folder/tab-quiz-active.png'),
  },
  podcast: {
    inactive: require('../../../assets/ui/folder/tab-podcast.png'),
    active: require('../../../assets/ui/folder/tab-podcast-active.png'),
  },
} satisfies Record<string, { inactive: ImageSourcePropType; active: ImageSourcePropType }>;
