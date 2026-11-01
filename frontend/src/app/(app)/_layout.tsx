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
      {/* 과목 추가 화면 헤더 */}
      <Stack.Screen name="subjects/new" options={{ title: '과목 추가' }} />
      {/* 과목 상세 화면 헤더 (제목은 화면에서 과목 이름으로 바꾼다) */}
      <Stack.Screen name="subjects/[id]/index" options={{ title: '과목' }} />
      {/* 자료 추가 화면 헤더 */}
      <Stack.Screen name="subjects/[id]/materials" options={{ title: '자료 추가' }} />
    </Stack>
  );
}
