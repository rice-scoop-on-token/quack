import { router, usePreventRemove } from 'expo-router';
import { useState } from 'react';

import { useApiQuery } from '@/api';
import { useDemoVariant } from '@/api/mock/useDemoVariant';

// 세션이 끝난 뒤 화면(점검, 리포트, 보상, 성장 축하)에서 쓴다.
// 뒤로 가기(헤더, Android 버튼, 웹 브라우저)는 끝난 타이머나 앞 화면으로 돌아가지 않고 홈으로 간다.
// 화면에서 직접 다른 화면으로 갈 때는 돌려주는 leave로 감싸서 이 막기를 먼저 푼다.
export function useAfterSession(sessionId: string | undefined) {
  const demo = useDemoVariant();
  // 막기를 풀 때 이 값도 같이 끈다(usePreventRemove가 둘을 맞추라고 경고한다)
  const [protect, setProtect] = useState(true);
  const disablePrevention = usePreventRemove(protect, () => {
    setProtect(false);
    disablePrevention();
    router.dismissTo('/home');
  });
  // 불러오는 중이면 undefined, 없으면 null
  const session = useApiQuery((api) => (sessionId ? api.getSession(sessionId) : Promise.resolve(null)), [sessionId]);

  return {
    session,
    // 다음 화면에도 ?demo= 값을 넘긴다(화면 주소마다 따로라서)
    params: { sessionId: sessionId ?? '', ...(demo ? { demo } : {}) },
    leave: (navigate: () => void) => {
      setProtect(false);
      disablePrevention();
      navigate();
    },
  };
}

// 리포트와 보상. 여러 번 불러도 보상은 한 번만 지급된다(서버 보장). 불러오는 중이면 undefined, 없으면 null
export function useSessionReport(sessionId: string | undefined) {
  return useApiQuery((api) => (sessionId ? api.createReport(sessionId) : Promise.resolve(null)), [sessionId]);
}
