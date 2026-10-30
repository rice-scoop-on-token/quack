import { Redirect, Stack } from 'expo-router';

import { useAccessState } from '@/features/auth/useAccessState';

export default function AppLayout() {
  const access = useAccessState();

  if (access === 'onboarding') {
    return <Redirect href="/intro" />;
  }

  return (
    <Stack>
      {/* 탭 화면은 탭 레이아웃이 자기 헤더를 그린다 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
