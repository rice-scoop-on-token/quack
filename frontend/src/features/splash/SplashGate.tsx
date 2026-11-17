import { useGlobalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';

import { useAccessState } from '@/features/auth/useAccessState';
import { SplashScreen } from '@/features/splash/SplashScreen';
import { SPLASH_TIME } from '@/features/splash/splashSpec';

// 앱을 켠 뒤 스플래시를 이미 봤는지. 레이아웃이 다시 마운트되어도 다시 열리지 않게 모듈에 둔다.
// 한계: 웹에서 새로고침하면 모듈이 새로 만들어져 다시 재생된다.
let splashSeen = false;

// 앱 맨 위에서 스플래시를 얹는다. 라우트가 아니라서 뒤로 가기나 딥링크로 다시 열리지 않는다.
// 아래 화면은 스플래시 뒤에서 이미 마운트되어 이동까지 끝내 두므로, 막이 걷힌 뒤 깜빡임이 없다.
// 주의: 항상 같은 모양({children} 다음 스플래시 자리)으로 그려서, 스플래시가 사라져도 아래 화면이 다시 마운트되지 않게 한다.
export function SplashGate({ children }: { children: ReactNode }) {
  const access = useAccessState();
  const { splash, demo } = useGlobalSearchParams<{ splash?: string; demo?: string }>();
  // 주소로 바꾸는 값은 실제 서버를 쓸 때 사용자가 건드리지 못하도록 mock 모드에서만 읽는다
  const mock = process.env.EXPO_PUBLIC_USE_MOCK === 'true';
  // ?splash가 ?demo보다 우선한다. ?splash=slow는 항상 재생하고, ?splash=off는 항상 건너뛴다.
  // ?demo=reset(발표 시작 장면)은 재생하고, 그 밖의 ?demo= 값은 확인을 빠르게 하려고 건너뛴다.
  const skipByUrl =
    mock && (splash === 'off' || (splash !== 'slow' && typeof demo === 'string' && demo !== '' && demo !== 'reset'));
  // ?splash=slow: 준비되지 않은 것처럼 보이게 해서 지연 안내를 확인한다.
  // 한계: 데모 확인용 자동 해제. 버튼이 없어서, 지연 안내가 뜬 뒤 slowRelease초가 지나면 저절로 풀린다.
  const [forcedSlow, setForcedSlow] = useState(mock && splash === 'slow');
  const [finished, setFinished] = useState(false);

  const showing = !splashSeen && !finished && !skipByUrl;

  useEffect(() => {
    if (!forcedSlow) {
      return;
    }
    const id = setTimeout(() => setForcedSlow(false), (SPLASH_TIME.delayAfter + SPLASH_TIME.slowRelease) * 1000);
    return () => clearTimeout(id);
  }, [forcedSlow]);

  useEffect(() => {
    if (skipByUrl) {
      splashSeen = true;
    }
  }, [skipByUrl]);

  return (
    <>
      {children}
      {showing ? (
        <SplashScreen
          ready={access !== 'loading' && !forcedSlow}
          onDone={() => {
            splashSeen = true;
            setFinished(true);
          }}
        />
      ) : null}
    </>
  );
}
