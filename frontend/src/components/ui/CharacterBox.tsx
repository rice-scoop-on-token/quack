import type { SpeciesId } from '@quack/shared';
import { Image, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import type { GrowthStage } from '@/api/tempContract';
import { CHARACTER_IMAGES } from '@/features/character/characterAssets';
import { STAGE_LABEL } from '@/features/character/growth';

type Props = {
  speciesId: SpeciesId;
  // 성장 단계를 불러오는 중이면 undefined. 같은 크기의 빈 자리만 둬서 그림이 뜰 때 다른 요소가 밀리지 않게 한다.
  stage: GrowthStage | undefined;
  size?: number;
};

// 모든 화면이 이 컴포넌트로 캐릭터를 그려서, 캐릭터 표시 방법은 이 파일 안만 바꾸면 된다.
// 동물·단계와 상관없이 늘 size×size 자리를 차지한다.
export function CharacterBox({ speciesId, stage, size = 120 }: Props) {
  if (!stage) {
    return <View style={{ width: size, height: size }} />;
  }
  const name = SPECIES.find((s) => s.id === speciesId)?.name ?? speciesId;

  return (
    <Image
      source={CHARACTER_IMAGES[speciesId][stage].base}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel={`${STAGE_LABEL[stage]} ${name}`}
    />
  );
}
