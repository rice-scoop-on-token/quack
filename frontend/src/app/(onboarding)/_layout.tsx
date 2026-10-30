import { Redirect, Stack } from 'expo-router';

import { useAccessState } from '@/features/auth/useAccessState';

export default function OnboardingLayout() {
  const access = useAccessState();

  // 온보딩을 마치면 이 레이아웃이 다시 그려지면서 홈으로 이동한다.
  if (access === 'app') {
    return <Redirect href="/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
