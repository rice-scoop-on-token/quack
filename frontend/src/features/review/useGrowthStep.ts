import { useCallback, useEffect, useRef, useState } from 'react';

export type GrowthStep = 'effect' | 'result';

// 성장 화면의 단계: 연출(effect) → 결과(result). 뒤로 돌아가지 않는다.
// 같은 전환을 여러 번 불러도(연출 끝과 건너뛰기가 겹쳐도) 한 번만 반영된다.
export function useGrowthStep() {
  const [step, setStep] = useState<GrowthStep>('effect');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const finish = useCallback(() => {
    if (alive.current) {
      setStep((s) => (s === 'effect' ? 'result' : s));
    }
  }, []);

  return { step, finish };
}
