import { useEffect, useState } from 'react';

import { SPLASH_FONT, SPLASH_FONT_WAIT } from '@/features/splash/splashSpec';

// 글꼴 상태. wait: 아직, loaded: 쓸 수 있음, failed: 못 불러왔거나 시간이 지나 시스템 글꼴로 그린다.
export type SplashFontState = 'wait' | 'loaded' | 'failed';

// 스플래시 글꼴(QuackPixel)을 불러온다.
// expo-font는 이 함수 안에서 불러온다(지연 로드). 설치된 개발 빌드에 모듈이 없어도 앱이 멈추지 않고 시스템 글꼴로 넘어가게 하기 위해서다.
// 한계: 정해진 시간(SPLASH_FONT_WAIT)을 넘기면 그 뒤에 불러와져도 시스템 글꼴을 계속 쓴다. 장면 도중에 글꼴이 바뀌어 깜빡이지 않게 하기 위해서다.
export function useSplashFont(): SplashFontState {
  const [state, setState] = useState<SplashFontState>('wait');

  useEffect(() => {
    let alive = true;
    const settle = (next: SplashFontState) => alive && setState((s) => (s === 'wait' ? next : s));
    const timer = setTimeout(() => settle('failed'), SPLASH_FONT_WAIT * 1000);
    import('expo-font')
      .then(({ loadAsync }) => loadAsync({ [SPLASH_FONT]: require('../../../assets/splash/QuackPixel.ttf') }))
      .then(() => settle('loaded'))
      .catch(() => settle('failed'));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return state;
}
