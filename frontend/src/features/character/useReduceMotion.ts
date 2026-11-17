import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// 기기의 "동작 줄이기" 설정. 값을 받기 전에는 undefined라서, 호출하는 쪽은 이때 움직임을 시작하지 않는다.
// 조회에 실패하면 줄이지 않는 것으로 본다.
export function useReduceMotion(): boolean | undefined {
  const [reduce, setReduce] = useState<boolean>();

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (value) => alive && setReduce(value),
      () => alive && setReduce(false),
    );
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => alive && setReduce(value));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
