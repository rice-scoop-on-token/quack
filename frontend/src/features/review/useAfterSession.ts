import { router, usePreventRemove } from 'expo-router';
import { useState } from 'react';

import { rewardGrantFor } from '@/api/mock/ledger';
import { useTempStore } from '@/api/mock/tempStore';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import type { TempRewardGrant } from '@/api/tempContract';
import { buildReport, stageChange } from '@/features/review/report';

// ?demo=grow: 지급 전 경험치를 90(아기 단계 끝)으로, ?demo=grow-adult: 290(어린이 단계 끝)으로 보고 성장 단계 변화를 보여 준다.
// 화면 표시만 바꾸고 저장하지 않는다.
const DEMO_XP_BEFORE: Record<string, number> = { grow: 90, 'grow-adult': 290 };

// 세션이 끝난 뒤 화면(점검, 리포트, 보상, 성장 축하)에서 쓴다.
// 뒤로 가기(헤더, Android 버튼, 웹 브라우저)는 끝난 타이머나 앞 화면으로 돌아가지 않고 홈으로 간다.
// 화면에서 직접 다른 화면으로 갈 때는 돌려주는 leave로 감싸서 이 막기를 먼저 푼다.
export function useAfterSession(sessionId: string | undefined) {
  const { sessions, xpLedger } = useTempStore();
  const demo = useDemoVariant();
  // 막기를 풀 때 이 값도 같이 끈다(usePreventRemove가 둘을 맞추라고 경고한다)
  const [protect, setProtect] = useState(true);
  const disablePrevention = usePreventRemove(protect, () => {
    setProtect(false);
    disablePrevention();
    router.dismissTo('/home');
  });

  const session = sessions.find((s) => s.id === sessionId);
  const report = session ? buildReport(session) : null;
  const saved = sessionId ? rewardGrantFor(sessionId, xpLedger) : null;
  const demoBefore = demo ? DEMO_XP_BEFORE[demo] : undefined;
  const grant: TempRewardGrant | null =
    saved && demoBefore !== undefined
      ? { ...saved, xp_before: demoBefore, xp_after: demoBefore + saved.xp }
      : saved;

  return {
    session,
    report,
    // 지급 전이면 null
    grant,
    // 보상으로 성장 단계가 바뀌었으면 이전·새 단계
    change: grant ? stageChange(grant) : null,
    // 다음 화면에도 ?demo= 값을 넘긴다(화면 주소마다 따로라서)
    params: { sessionId: sessionId ?? '', ...(demo ? { demo } : {}) },
    leave: (navigate: () => void) => {
      setProtect(false);
      disablePrevention();
      navigate();
    },
  };
}
