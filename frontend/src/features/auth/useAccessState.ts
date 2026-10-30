import { useTempStore } from '@/api/mock/tempStore';

// 익명 로그인이라 "로그인 전" 상태가 없다. 앱을 열면 항상 로그인된 사용자다.
export type AccessState = 'onboarding' | 'app';

export function useAccessState(): AccessState {
  // QuackApi 교체 지점: profile.onboarding_completed_at이 null이면 'onboarding'으로 판단한다.
  const { onboarded } = useTempStore();
  return onboarded ? 'app' : 'onboarding';
}
