import type { ImageSourcePropType } from 'react-native';

// 하단 탭 아이콘(96×96). Metro의 require()는 경로를 조합할 수 없어서 모든 경로를 적는다.
export const TAB_ICONS = {
  records: {
    inactive: require('../../../assets/ui/tabs/records.png'),
    active: require('../../../assets/ui/tabs/records-active.png'),
  },
  subjects: {
    inactive: require('../../../assets/ui/tabs/subjects.png'),
    active: require('../../../assets/ui/tabs/subjects-active.png'),
  },
  home: {
    inactive: require('../../../assets/ui/tabs/home.png'),
    active: require('../../../assets/ui/tabs/home-active.png'),
  },
  friends: {
    inactive: require('../../../assets/ui/tabs/friends.png'),
    active: require('../../../assets/ui/tabs/friends-active.png'),
  },
  settings: {
    inactive: require('../../../assets/ui/tabs/settings.png'),
    active: require('../../../assets/ui/tabs/settings-active.png'),
  },
} satisfies Record<string, { inactive: ImageSourcePropType; active: ImageSourcePropType }>;

export type TabIconName = keyof typeof TAB_ICONS;
