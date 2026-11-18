import { Stack } from 'expo-router';

import { ApiProvider } from '@/api';
import { SelectedFolderProvider } from '@/features/folder/SelectedFolder';
import { SplashGate } from '@/features/splash/SplashGate';

export default function RootLayout() {
  return (
    <ApiProvider>
      <SelectedFolderProvider>
        <SplashGate>
          <Stack screenOptions={{ headerShown: false }} />
        </SplashGate>
      </SelectedFolderProvider>
    </ApiProvider>
  );
}
