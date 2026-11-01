import type { Folder, SpeciesId } from '@quack/shared';

// BE와 합의했지만 아직 shared에 반영되지 않은 타입을 이 파일 하나에 모은다.
// shared 반영 후 교체: shared에 같은 타입이 생기면 여기 것을 지우고 shared 것을 import한다.

// 캐릭터 성장 단계. 레벨은 쓰지 않고 단계만 쓴다.
export type GrowthStage = 'baby' | 'child' | 'adult';

// 선생님 동물은 과목마다 하나다. 과목을 만들 때 한 번 고르고 바꿀 수 없다.
// 경험치도 과목별로 쌓인다. 현재 shared Folder에는 이 두 칸이 없다.
export type TempFolder = Folder & {
  species_id: SpeciesId;
  total_xp: number;
};
