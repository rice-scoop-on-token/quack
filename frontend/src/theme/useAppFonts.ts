import { useEffect, useState } from 'react';
import { Image, Platform } from 'react-native';

import { FONT_FACE } from '@/theme/assetTokens';

// 글꼴 상태. wait: 아직, loaded: 쓸 수 있음, failed: 못 불러왔거나 시간이 지나 시스템 글꼴로 진행한다.
export type AppFontState = 'wait' | 'loaded' | 'failed';

// 갈무리 파일이 합쳐 8MB라 웹에서 오래 걸릴 수 있다. 스플래시(약 6초)가 재생되는 동안 뒤에서 불러온다.
// 한계: 이 시간(초)을 넘기면 그 뒤에 불러와져도 이번 실행은 시스템 글꼴로 진행한다(네이티브는 등록 전 글꼴 이름이 시스템 글꼴로 그려진다).
const APP_FONT_WAIT = 4;

const files = {
  [FONT_FACE.bold]: require('../../assets/fonts/Galmuri11-Bold.ttf'),
  [FONT_FACE.regular]: require('../../assets/fonts/Galmuri14.ttf'),
};

// 웹의 FontFace 모양 중 쓰는 것만 적는다(앱 타입 설정에 DOM 타입이 없어서 직접 적는다)
type WebFontFace = { load(): Promise<WebFontFace> };
type WebGlobals = {
  FontFace?: new (family: string, source: string, descriptors?: { weight?: string; display?: string }) => WebFontFace;
  document?: { fonts: { add(face: WebFontFace): void } };
};

// 웹에서 require()한 글꼴 에셋의 주소를 구한다. useSplashFont.ts의 webFontUri와 같은 로직이다.
// 한계: useSplashFont.ts를 고치지 않으려고 복제했다. 둘이 어긋나지 않게 같이 고치고, 나중에 공통 파일로 합친다.
// 한계: 에셋 번호는 RN-web 에셋 등록부에서 찾아 해시 쿼리 없이 주소를 만든다. 개발 서버에서 파일이 바뀌면 브라우저 캐시를 쓸 수 있다.
type RegistryAsset = { httpServerLocation: string; name: string; type: string; scales?: number[] };
function webFontUri(source: unknown): string | null {
  const statics = Image as unknown as { resolveAssetSource?: (s: unknown) => { uri?: string } | undefined };
  if (typeof statics.resolveAssetSource === 'function') {
    const uri = statics.resolveAssetSource(source)?.uri;
    if (uri) {
      return uri;
    }
  }
  if (typeof source === 'string') {
    return source;
  }
  if (typeof source === 'number') {
    const registry = (globalThis as unknown as Record<symbol, RegistryAsset[] | undefined>)[Symbol.for('react-native-web.AssetRegistry')];
    const asset = registry?.[source - 1];
    if (!asset) {
      return null;
    }
    const scale = asset.scales?.[0] ?? 1;
    return `${asset.httpServerLocation}/${asset.name}${scale !== 1 ? `@${scale}x` : ''}.${asset.type}`;
  }
  if (source && typeof source === 'object') {
    const obj = source as { uri?: unknown; default?: unknown };
    if (typeof obj.uri === 'string') {
      return obj.uri;
    }
    if (obj.default !== undefined) {
      return webFontUri(obj.default);
    }
  }
  return null;
}

// 웹: 브라우저의 FontFace로 바로 불러온다(expo-font는 별도 덩어리를 먼저 받아야 해서 늦어질 수 있다).
// 굵기는 normal로 등록한다. 굵은 글자는 파일 자체가 Bold라서 가짜 볼드를 더하지 않게 하기 위해서다.
async function loadOnWeb() {
  const web = globalThis as unknown as WebGlobals;
  const doc = web.document;
  const Face = web.FontFace;
  if (!Face || !doc) {
    throw new Error('web font unavailable');
  }
  await Promise.all(
    Object.entries(files).map(async ([family, file]) => {
      const uri = webFontUri(file);
      if (!uri) {
        throw new Error('web font uri unavailable');
      }
      const face = new Face(family, `url(${uri})`, { weight: 'normal', display: 'block' });
      await face.load();
      doc.fonts.add(face);
    }),
  );
}

// 네이티브: expo-font는 이 함수 안에서 불러온다(지연 로드). 설치된 개발 빌드에 모듈이 없어도 앱이 멈추지 않게 하기 위해서다.
async function loadOnNative() {
  const { loadAsync } = await import('expo-font');
  await loadAsync(files);
}

// 이 파일을 처음 불러올 때(앱이 켜질 때) 바로 불러오기 시작한다.
let result: boolean | null = null;
const loading: Promise<boolean> = (Platform.OS === 'web' ? loadOnWeb() : loadOnNative())
  .then(() => true)
  .catch(() => false)
  .then((ok) => {
    result = ok;
    return ok;
  });

// 앱 글꼴(갈무리)을 불러온다. 스플래시 글꼴은 useSplashFont가 따로 맡는다.
export function useAppFonts(): AppFontState {
  const [state, setState] = useState<AppFontState>(result === null ? 'wait' : result ? 'loaded' : 'failed');

  useEffect(() => {
    let alive = true;
    const settle = (next: AppFontState) => alive && setState((s) => (s === 'wait' ? next : s));
    const timer = setTimeout(() => settle('failed'), APP_FONT_WAIT * 1000);
    loading.then((ok) => settle(ok ? 'loaded' : 'failed'));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return state;
}
