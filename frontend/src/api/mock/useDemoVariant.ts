import { useLocalSearchParams } from 'expo-router';

// 주소 뒤에 ?demo=loading 처럼 붙여 로딩·빈 화면·에러 상태를 바로 확인한다.
// 실제 서버를 쓸 때 사용자가 주소로 화면 상태를 바꾸지 못하도록 mock 모드에서만 동작한다.
export function useDemoVariant(): string | null {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  if (process.env.EXPO_PUBLIC_USE_MOCK !== 'true') {
    return null;
  }
  return demo ?? null;
}
