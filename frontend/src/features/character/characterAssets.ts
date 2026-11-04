import type { SpeciesId } from '@quack/shared';
import type { ImageSourcePropType } from 'react-native';

import type { GrowthStage } from '@/api/tempContract';

// frontend/assets/animal 의 정적 이미지 맵. Metro의 require()는 경로를 조합할 수 없어서 모든 경로를 적는다.
// 에셋 폴더 이름 duck은 동물 id rubber_duck에 해당한다. 폴더 이름을 바꾸지 않고 이 파일 한 곳에서 연결한다.

export const CHARACTER_ACTIONS = [
  'idle',
  'walk',
  'run',
  'read',
  'think',
  'dejected',
  'angry',
  'happy_jump',
  'sleep',
  'surprised',
  'tired',
  'study',
] as const;

export type CharacterAction = (typeof CHARACTER_ACTIONS)[number];

// actions는 256×256 칸 6개가 가로로 놓인 동작 시트다(1536×256).
type StageImages = { base: ImageSourcePropType; actions: Record<CharacterAction, ImageSourcePropType> };

export const CHARACTER_IMAGES: Record<SpeciesId, Record<GrowthStage, StageImages>> = {
  rubber_duck: {
    baby: {
      base: require('../../../assets/animal/duck/baby/base.png'),
      actions: {
        idle: require('../../../assets/animal/duck/baby/actions/idle.png'),
        walk: require('../../../assets/animal/duck/baby/actions/walk.png'),
        run: require('../../../assets/animal/duck/baby/actions/run.png'),
        read: require('../../../assets/animal/duck/baby/actions/read.png'),
        think: require('../../../assets/animal/duck/baby/actions/think.png'),
        dejected: require('../../../assets/animal/duck/baby/actions/dejected.png'),
        angry: require('../../../assets/animal/duck/baby/actions/angry.png'),
        happy_jump: require('../../../assets/animal/duck/baby/actions/happy_jump.png'),
        sleep: require('../../../assets/animal/duck/baby/actions/sleep.png'),
        surprised: require('../../../assets/animal/duck/baby/actions/surprised.png'),
        tired: require('../../../assets/animal/duck/baby/actions/tired.png'),
        study: require('../../../assets/animal/duck/baby/actions/study.png'),
      },
    },
    child: {
      base: require('../../../assets/animal/duck/child/base.png'),
      actions: {
        idle: require('../../../assets/animal/duck/child/actions/idle.png'),
        walk: require('../../../assets/animal/duck/child/actions/walk.png'),
        run: require('../../../assets/animal/duck/child/actions/run.png'),
        read: require('../../../assets/animal/duck/child/actions/read.png'),
        think: require('../../../assets/animal/duck/child/actions/think.png'),
        dejected: require('../../../assets/animal/duck/child/actions/dejected.png'),
        angry: require('../../../assets/animal/duck/child/actions/angry.png'),
        happy_jump: require('../../../assets/animal/duck/child/actions/happy_jump.png'),
        sleep: require('../../../assets/animal/duck/child/actions/sleep.png'),
        surprised: require('../../../assets/animal/duck/child/actions/surprised.png'),
        tired: require('../../../assets/animal/duck/child/actions/tired.png'),
        study: require('../../../assets/animal/duck/child/actions/study.png'),
      },
    },
    adult: {
      base: require('../../../assets/animal/duck/adult/base.png'),
      actions: {
        idle: require('../../../assets/animal/duck/adult/actions/idle.png'),
        walk: require('../../../assets/animal/duck/adult/actions/walk.png'),
        run: require('../../../assets/animal/duck/adult/actions/run.png'),
        read: require('../../../assets/animal/duck/adult/actions/read.png'),
        think: require('../../../assets/animal/duck/adult/actions/think.png'),
        dejected: require('../../../assets/animal/duck/adult/actions/dejected.png'),
        angry: require('../../../assets/animal/duck/adult/actions/angry.png'),
        happy_jump: require('../../../assets/animal/duck/adult/actions/happy_jump.png'),
        sleep: require('../../../assets/animal/duck/adult/actions/sleep.png'),
        surprised: require('../../../assets/animal/duck/adult/actions/surprised.png'),
        tired: require('../../../assets/animal/duck/adult/actions/tired.png'),
        study: require('../../../assets/animal/duck/adult/actions/study.png'),
      },
    },
  },
  raccoon: {
    baby: {
      base: require('../../../assets/animal/raccoon/baby/base.png'),
      actions: {
        idle: require('../../../assets/animal/raccoon/baby/actions/idle.png'),
        walk: require('../../../assets/animal/raccoon/baby/actions/walk.png'),
        run: require('../../../assets/animal/raccoon/baby/actions/run.png'),
        read: require('../../../assets/animal/raccoon/baby/actions/read.png'),
        think: require('../../../assets/animal/raccoon/baby/actions/think.png'),
        dejected: require('../../../assets/animal/raccoon/baby/actions/dejected.png'),
        angry: require('../../../assets/animal/raccoon/baby/actions/angry.png'),
        happy_jump: require('../../../assets/animal/raccoon/baby/actions/happy_jump.png'),
        sleep: require('../../../assets/animal/raccoon/baby/actions/sleep.png'),
        surprised: require('../../../assets/animal/raccoon/baby/actions/surprised.png'),
        tired: require('../../../assets/animal/raccoon/baby/actions/tired.png'),
        study: require('../../../assets/animal/raccoon/baby/actions/study.png'),
      },
    },
    child: {
      base: require('../../../assets/animal/raccoon/child/base.png'),
      actions: {
        idle: require('../../../assets/animal/raccoon/child/actions/idle.png'),
        walk: require('../../../assets/animal/raccoon/child/actions/walk.png'),
        run: require('../../../assets/animal/raccoon/child/actions/run.png'),
        read: require('../../../assets/animal/raccoon/child/actions/read.png'),
        think: require('../../../assets/animal/raccoon/child/actions/think.png'),
        dejected: require('../../../assets/animal/raccoon/child/actions/dejected.png'),
        angry: require('../../../assets/animal/raccoon/child/actions/angry.png'),
        happy_jump: require('../../../assets/animal/raccoon/child/actions/happy_jump.png'),
        sleep: require('../../../assets/animal/raccoon/child/actions/sleep.png'),
        surprised: require('../../../assets/animal/raccoon/child/actions/surprised.png'),
        tired: require('../../../assets/animal/raccoon/child/actions/tired.png'),
        study: require('../../../assets/animal/raccoon/child/actions/study.png'),
      },
    },
    adult: {
      base: require('../../../assets/animal/raccoon/adult/base.png'),
      actions: {
        idle: require('../../../assets/animal/raccoon/adult/actions/idle.png'),
        walk: require('../../../assets/animal/raccoon/adult/actions/walk.png'),
        run: require('../../../assets/animal/raccoon/adult/actions/run.png'),
        read: require('../../../assets/animal/raccoon/adult/actions/read.png'),
        think: require('../../../assets/animal/raccoon/adult/actions/think.png'),
        dejected: require('../../../assets/animal/raccoon/adult/actions/dejected.png'),
        angry: require('../../../assets/animal/raccoon/adult/actions/angry.png'),
        happy_jump: require('../../../assets/animal/raccoon/adult/actions/happy_jump.png'),
        sleep: require('../../../assets/animal/raccoon/adult/actions/sleep.png'),
        surprised: require('../../../assets/animal/raccoon/adult/actions/surprised.png'),
        tired: require('../../../assets/animal/raccoon/adult/actions/tired.png'),
        study: require('../../../assets/animal/raccoon/adult/actions/study.png'),
      },
    },
  },
  cat: {
    baby: {
      base: require('../../../assets/animal/cat/baby/base.png'),
      actions: {
        idle: require('../../../assets/animal/cat/baby/actions/idle.png'),
        walk: require('../../../assets/animal/cat/baby/actions/walk.png'),
        run: require('../../../assets/animal/cat/baby/actions/run.png'),
        read: require('../../../assets/animal/cat/baby/actions/read.png'),
        think: require('../../../assets/animal/cat/baby/actions/think.png'),
        dejected: require('../../../assets/animal/cat/baby/actions/dejected.png'),
        angry: require('../../../assets/animal/cat/baby/actions/angry.png'),
        happy_jump: require('../../../assets/animal/cat/baby/actions/happy_jump.png'),
        sleep: require('../../../assets/animal/cat/baby/actions/sleep.png'),
        surprised: require('../../../assets/animal/cat/baby/actions/surprised.png'),
        tired: require('../../../assets/animal/cat/baby/actions/tired.png'),
        study: require('../../../assets/animal/cat/baby/actions/study.png'),
      },
    },
    child: {
      base: require('../../../assets/animal/cat/child/base.png'),
      actions: {
        idle: require('../../../assets/animal/cat/child/actions/idle.png'),
        walk: require('../../../assets/animal/cat/child/actions/walk.png'),
        run: require('../../../assets/animal/cat/child/actions/run.png'),
        read: require('../../../assets/animal/cat/child/actions/read.png'),
        think: require('../../../assets/animal/cat/child/actions/think.png'),
        dejected: require('../../../assets/animal/cat/child/actions/dejected.png'),
        angry: require('../../../assets/animal/cat/child/actions/angry.png'),
        happy_jump: require('../../../assets/animal/cat/child/actions/happy_jump.png'),
        sleep: require('../../../assets/animal/cat/child/actions/sleep.png'),
        surprised: require('../../../assets/animal/cat/child/actions/surprised.png'),
        tired: require('../../../assets/animal/cat/child/actions/tired.png'),
        study: require('../../../assets/animal/cat/child/actions/study.png'),
      },
    },
    adult: {
      base: require('../../../assets/animal/cat/adult/base.png'),
      actions: {
        idle: require('../../../assets/animal/cat/adult/actions/idle.png'),
        walk: require('../../../assets/animal/cat/adult/actions/walk.png'),
        run: require('../../../assets/animal/cat/adult/actions/run.png'),
        read: require('../../../assets/animal/cat/adult/actions/read.png'),
        think: require('../../../assets/animal/cat/adult/actions/think.png'),
        dejected: require('../../../assets/animal/cat/adult/actions/dejected.png'),
        angry: require('../../../assets/animal/cat/adult/actions/angry.png'),
        happy_jump: require('../../../assets/animal/cat/adult/actions/happy_jump.png'),
        sleep: require('../../../assets/animal/cat/adult/actions/sleep.png'),
        surprised: require('../../../assets/animal/cat/adult/actions/surprised.png'),
        tired: require('../../../assets/animal/cat/adult/actions/tired.png'),
        study: require('../../../assets/animal/cat/adult/actions/study.png'),
      },
    },
  },
};
