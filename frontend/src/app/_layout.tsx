import { Stack } from 'expo-router';

import { TempStoreProvider } from '@/api/mock/tempStore';

export default function RootLayout() {
  return (
    <TempStoreProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </TempStoreProvider>
  );
}
