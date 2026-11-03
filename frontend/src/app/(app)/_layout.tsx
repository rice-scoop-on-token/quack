import { Redirect, Stack } from 'expo-router';

import { useAccessState } from '@/features/auth/useAccessState';

const AFTER_SESSION = { headerBackVisible: false, gestureEnabled: false };

// 주소로 바로 들어오거나(웹) 다른 화면을 바꿔 끼워 와도 스택 맨 아래에 탭 화면을 둔다.
// 없으면 과목 상세처럼 그 화면이 맨 아래가 되어 뒤로 가기(홈으로 돌아갈 길)가 사라진다.
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function AppLayout() {
  const access = useAccessState();

  if (access === 'onboarding') {
    return <Redirect href="/intro" />;
  }

  return (
    <Stack>
      {/* 탭 화면은 탭 레이아웃이 자기 헤더를 그린다 */}
      {/* title은 다음 화면의 뒤로 버튼 이름으로 쓰인다("(tabs)" 대신 "홈") */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '홈' }} />
      <Stack.Screen name="subjects/new" options={{ title: '과목 추가' }} />
      {/* 제목은 화면에서 과목 이름으로 바꾼다 */}
      <Stack.Screen name="subjects/[id]/index" options={{ title: '과목' }} />
      <Stack.Screen name="subjects/[id]/materials" options={{ title: '자료 추가' }} />
      <Stack.Screen name="subjects/[id]/sessions/[sessionId]" options={{ title: '학습 리포트' }} />
      <Stack.Screen name="session/setup" options={{ title: '공부 준비' }} />
      {/* "공부 마치기"로만 나가도록 뒤로 버튼과 밀어서 뒤로 가기를 끈다 */}
      <Stack.Screen
        name="session/timer"
        options={{ title: '집중 타이머', headerBackVisible: false, gestureEnabled: false }}
      />
      {/* 세션이 끝난 뒤 화면은 뒤로 가면 홈으로 가므로(useAfterSession) 헤더 뒤로 버튼과 밀어서 뒤로 가기를 끈다. */}
      <Stack.Screen name="session/review" options={{ title: '학습 점검', ...AFTER_SESSION }} />
      <Stack.Screen name="session/report" options={{ title: '학습 리포트', ...AFTER_SESSION }} />
      <Stack.Screen name="session/reward" options={{ title: '성장 보상', ...AFTER_SESSION }} />
      <Stack.Screen name="session/growth" options={{ title: '성장', ...AFTER_SESSION }} />
    </Stack>
  );
}
