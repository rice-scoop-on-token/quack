import { Redirect, Stack } from 'expo-router';

import { useAccessState } from '@/features/auth/useAccessState';
import { COLORS, FONT } from '@/theme/assetTokens';

export default function OnboardingLayout() {
  const access = useAccessState();

  if (access === 'loading') {
    return null;
  }
  // 온보딩을 마치면 이 레이아웃이 다시 그려지면서 홈으로 이동한다.
  if (access === 'app') {
    return <Redirect href="/home" />;
  }

  return (
    // 화면별 상단 헤더(제목과 뒤로 가기). (app) 레이아웃과 같은 크림 바탕·갈색 글자다.
    // 소개 화면도 제목 없는 헤더를 보여 준다. 헤더가 상태 바·노치 영역을 비켜 주어 단계 표시가 가려지지 않는다.
    // 헤더 아래 2dp 선은 OnboardingStepLayout이 그린다.
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: COLORS.screen },
        headerStyle: { backgroundColor: COLORS.screen },
        headerTintColor: COLORS.text,
        headerTitleStyle: { color: COLORS.text, ...FONT.heading },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="intro" options={{ title: '' }} />
      <Stack.Screen name="name" options={{ title: '이름 정하기' }} />
      <Stack.Screen name="subject" options={{ title: '첫 과목 만들기' }} />
      <Stack.Screen name="materials" options={{ title: '자료 추가' }} />
    </Stack>
  );
}
