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
      {/* 공부 준비 화면 헤더 */}
      <Stack.Screen name="session/setup" options={{ title: '공부 준비' }} />
      {/* 집중 타이머 화면 헤더 ("공부 마치기"로만 나가도록 뒤로 버튼과 밀어서 뒤로 가기를 끈다) */}
      <Stack.Screen
        name="session/timer"
        options={{ title: '집중 타이머', headerBackVisible: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
