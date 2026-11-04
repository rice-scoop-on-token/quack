import { MockApiProvider } from '@/api/mock/mockApi';

// QuackApi 구현을 고르는 자리. supabase 구현(api/supabase)이 아직 없어서 EXPO_PUBLIC_USE_MOCK과 상관없이 mock을 쓴다.
// supabase 구현이 생기면 EXPO_PUBLIC_USE_MOCK === 'true'일 때만 MockApiProvider를 고른다.
export const ApiProvider = MockApiProvider;

export { useApiQuery, useQuackApi, type QuackApi } from '@/api/QuackApi';
