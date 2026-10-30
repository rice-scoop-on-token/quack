import { Redirect } from 'expo-router';

import { useAccessState } from '@/features/auth/useAccessState';

// A-00 앱 실행: 보여 줄 화면 없이 접근 상태에 맞는 첫 화면으로 보낸다.
export default function Index() {
  const access = useAccessState();
  return <Redirect href={access === 'app' ? '/home' : '/intro'} />;
}
