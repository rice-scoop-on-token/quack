import { useEffect, useState } from 'react';
import { Image, Platform } from 'react-native';

import { SPLASH_FONT, SPLASH_FONT_WAIT } from '@/features/splash/splashSpec';

// 글꼴 상태. wait: 아직, loaded: 쓸 수 있음, failed: 못 불러왔거나 시간이 지나 시스템 글꼴로 그린다.
export type SplashFontState = 'wait' | 'loaded' | 'failed';

const fontFile = require('../../../assets/splash/QuackPixel.ttf');

// 웹의 FontFace 모양 중 쓰는 것만 적는다(앱 타입 설정에 DOM 타입이 없어서 직접 적는다)
type WebFontFace = { load(): Promise<WebFontFace> };
type WebGlobals = {
  FontFace?: new (family: string, source: string, descriptors?: { weight?: string; display?: string }) => WebFontFace;
  document?: { fonts: { add(face: WebFontFace): void } };
};

// 웹: 브라우저의 FontFace로 바로 불러온다. expo-font를 거치면 별도 덩어리를 먼저 받아야 해서 정해진 시간 안에 못 끝날 수 있다.
// 굵기는 normal로 등록한다. 파일 자체가 굵은 글꼴(Bold)이라, normal로 요청하면 브라우저가 가짜 볼드를 더하지 않는다.
async function loadOnWeb() {
  const web = globalThis as unknown as WebGlobals;
  const uri = Image.resolveAssetSource(fontFile)?.uri;
  if (!web.FontFace || !web.document || !uri) {
    throw new Error('web font unavailable');
  }
  const face = new web.FontFace(SPLASH_FONT, `url(${uri})`, { weight: 'normal', display: 'block' });
  await face.load();
  web.document.fonts.add(face);
}

// 네이티브: expo-font는 이 함수 안에서 불러온다(지연 로드). 설치된 개발 빌드에 모듈이 없어도 앱이 멈추지 않고 시스템 글꼴로 넘어가게 하기 위해서다.
async function loadOnNative() {
  const { loadAsync } = await import('expo-font');
  await loadAsync({ [SPLASH_FONT]: fontFile });
}

// 앱이 켜질 때(이 파일을 처음 불러올 때) 바로 불러오기 시작해서, 스플래시가 뜰 때는 대개 끝나 있다.
let result: boolean | null = null;
const loading: Promise<boolean> = (Platform.OS === 'web' ? loadOnWeb() : loadOnNative())
  .then(() => true)
  .catch(() => false)
  .then((ok) => {
    result = ok;
    return ok;
  });

// 스플래시 글꼴(QuackPixel, Pixelify Sans Bold)을 불러온다.
// 한계: 정해진 시간(SPLASH_FONT_WAIT)을 넘기면 그 뒤에 불러와져도 시스템 글꼴을 계속 쓴다. 장면 도중에 글꼴이 바뀌어 깜빡이지 않게 하기 위해서다.
export function useSplashFont(): SplashFontState {
  const [state, setState] = useState<SplashFontState>(result === null ? 'wait' : result ? 'loaded' : 'failed');

  useEffect(() => {
    let alive = true;
    const settle = (next: SplashFontState) => alive && setState((s) => (s === 'wait' ? next : s));
    const timer = setTimeout(() => settle('failed'), SPLASH_FONT_WAIT * 1000);
    loading.then((ok) => settle(ok ? 'loaded' : 'failed'));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return state;
}
