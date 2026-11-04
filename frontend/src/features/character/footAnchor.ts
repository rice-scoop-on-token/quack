import type { SpeciesId } from '@quack/shared';

import type { GrowthStage } from '@/api/tempContract';

// 동작 시트 칸 안에서 발끝(가장 아래 불투명 줄)이 있는 높이를 칸 높이에 대한 비율(0~1)로 적은 표다.
// 아기는 칸 안에서 위쪽에 그려져 있고(발 아래 여백이 큼) 어린이·성체는 칸 아래에 가깝다. 이 표로 칸 아래가 아니라 발을 장면 기준선에 맞춘다.
// 값은 각 단계 idle 시트 6프레임의 평균이다(assets/animal을 PIL로 잰 값). 한계: 에셋(시트)을 바꾸면 다시 재서 고친다.
// 달리기·뛰기처럼 발이 땅에서 떨어지는 동작은 그 동작의 자연스러운 움직임이라 따로 보정하지 않는다.
export const FOOT_RATIO: Record<SpeciesId, Record<GrowthStage, number>> = {
  rubber_duck: { baby: 0.896, child: 0.908, adult: 0.906 },
  cat: { baby: 0.777, child: 0.922, adult: 0.922 },
  raccoon: { baby: 0.79, child: 0.867, adult: 0.922 },
};
