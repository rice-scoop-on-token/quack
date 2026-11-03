import { useApiQuery } from '@/api';

// 익명 로그인이라 "로그인 전" 상태가 없다. 앱을 열면 항상 로그인된 사용자다.
// 프로필을 불러오는 동안은 'loading'이라, 레이아웃이 아무것도 그리지 않고 기다린다.
export type AccessState = 'loading' | 'onboarding' | 'app';

export function useAccessState(): AccessState {
  const profile = useApiQuery((api) => api.getProfile(), []);
  if (profile === undefined) {
    return 'loading';
  }
  return profile?.onboarding_completed_at ? 'app' : 'onboarding';
}
