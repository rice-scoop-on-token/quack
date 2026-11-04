import type { ReactNode } from 'react';
import { createElement } from 'react';

import { MockApiProvider } from '@/api/mock/mockApi';
import { RemoteTurnsProvider } from '@/api/supabase/RemoteTurnsProvider';

// QuackApi 구현을 고르는 자리.
// EXPO_PUBLIC_USE_MOCK === 'true'면 전부 mock이다.
// 아니면 시연 영상용 임시 구성으로, mock 위에서 타이머 설명(explain)만 실제 서버로 보낸다(이슈 #22).
// 이때는 frontend/.env에 EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY(publishable key)가 있어야 한다.
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

export function ApiProvider({ children }: { children: ReactNode }) {
  if (USE_MOCK) {
    return createElement(MockApiProvider, null, children);
  }
  return createElement(MockApiProvider, null, createElement(RemoteTurnsProvider, null, children));
}

export { useApiQuery, useQuackApi, type QuackApi } from '@/api/QuackApi';
