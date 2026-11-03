import { Stack } from 'expo-router';

import { ApiProvider } from '@/api';
import { SelectedFolderProvider } from '@/features/folder/SelectedFolder';

export default function RootLayout() {
  return (
    <ApiProvider>
      <SelectedFolderProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SelectedFolderProvider>
    </ApiProvider>
  );
}
