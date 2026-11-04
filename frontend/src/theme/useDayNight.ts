import { useState } from 'react';

import { useDemoVariant } from '@/api/mock/useDemoVariant';

// 낮 07:00~18:00, 그 외 밤(기기 시계 기준)
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 18;

// 낮/밤은 장면 배경 이미지만 바꾼다. ?demo=day, ?demo=night 으로 강제로 바꿔 볼 수 있다.
// 한계: 화면이 처음 그려질 때 한 번만 판단한다. 앱을 켜 둔 채 시간이 바뀌어도 화면을 다시 열기 전에는 그대로다.
export function useDayNight(): 'day' | 'night' {
  const demo = useDemoVariant();
  const [fromClock] = useState<'day' | 'night'>(() => {
    const hour = new Date().getHours();
    return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? 'day' : 'night';
  });
  return demo === 'day' || demo === 'night' ? demo : fromClock;
}
