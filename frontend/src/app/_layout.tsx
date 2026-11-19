import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

import { ApiProvider } from '@/api';
import { SelectedFolderProvider } from '@/features/folder/SelectedFolder';
import { SplashGate } from '@/features/splash/SplashGate';
import { useAppFonts } from '@/theme/useAppFonts';

// 앱 글꼴이 준비될 때까지 화면을 올리지 않는다(스플래시가 그 위를 가리고 있다). 실패하거나 시간이 지나면 시스템 글꼴로 그대로 진행한다.
// 주의: 아래 화면은 한 번 올라오면 다시 내려가지 않는다. 글꼴 상태가 바뀌어도 loaded ↔ failed 사이에서 모양은 같다.
function AppFontGate({ children }: { children: ReactNode }) {
  const fonts = useAppFonts();
  return fonts === 'wait' ? null : <>{children}</>;
}

export default function RootLayout() {
  return (
    <ApiProvider>
      <SelectedFolderProvider>
        <SplashGate>
          <AppFontGate>
            <Stack screenOptions={{ headerShown: false }} />
          </AppFontGate>
        </SplashGate>
      </SelectedFolderProvider>
    </ApiProvider>
  );
}
