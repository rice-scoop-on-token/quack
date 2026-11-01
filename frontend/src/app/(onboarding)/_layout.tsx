import { Redirect, Stack } from 'expo-router';

import { useAccessState } from '@/features/auth/useAccessState';

export default function OnboardingLayout() {
  const access = useAccessState();

  // 온보딩을 마치면 이 레이아웃이 다시 그려지면서 홈으로 이동한다.
  if (access === 'app') {
    return <Redirect href="/home" />;
  }

  return (
    // 화면별 상단 헤더(제목과 뒤로 가기). 소개 화면은 헤더 없이 보여 준다.
    <Stack>
      <Stack.Screen name="intro" options={{ headerShown: false }} />
      <Stack.Screen name="name" options={{ title: '이름 정하기' }} />
      <Stack.Screen name="character" options={{ title: '첫 과목 선생님' }} />
      <Stack.Screen name="subject" options={{ title: '과목 만들기' }} />
      <Stack.Screen name="materials" options={{ title: '자료 추가' }} />
    </Stack>
  );
}
