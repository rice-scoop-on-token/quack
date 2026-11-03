import type { SpeciesId } from '@quack/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, type ImageSourcePropType, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import type { GrowthStage } from '@/api/tempContract';
import { CHARACTER_IMAGES, type CharacterAction } from '@/features/character/characterAssets';
import { STAGE_LABEL } from '@/features/character/growth';

// 동작 시트는 칸 6개가 가로로 놓인 한 장이다(assets/animal/README.md)
const FRAME_COUNT = 6;
// 초당 4칸. 공부하는 동안 옆에서 계속 움직이므로 눈에 거슬리지 않게 느리게 둔다.
const FRAME_MS = 250;

type Props = {
  speciesId: SpeciesId;
  // 성장 단계를 불러오는 중이면 undefined. 같은 크기의 빈 자리만 둬서 그림이 뜰 때 다른 요소가 밀리지 않게 한다.
  stage: GrowthStage | undefined;
  size?: number;
  // 없으면 기본 그림. 화면별 동작은 features/character/screenActions.ts 에서 정한다.
  action?: CharacterAction;
};

// 모든 화면이 이 컴포넌트로 캐릭터를 그려서, 캐릭터 표시 방법은 이 파일 안만 바꾸면 된다.
// 동물·단계·동작과 상관없이 늘 size×size 자리를 차지한다.
export function CharacterBox({ speciesId, stage, size = 120, action }: Props) {
  if (!stage) {
    return <View style={{ width: size, height: size }} />;
  }
  const name = SPECIES.find((s) => s.id === speciesId)?.name ?? speciesId;
  const label = `${STAGE_LABEL[stage]} ${name}`;
  const images = CHARACTER_IMAGES[speciesId][stage];

  if (action) {
    return <ActionSheet source={images.actions[action]} size={size} label={label} />;
  }
  return (
    <Image
      source={images.base}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel={label}
    />
  );
}

type SheetProps = {
  source: ImageSourcePropType;
  size: number;
  label: string;
};

// 한 칸 크기의 창 안에서 시트 전체를 칸 너비의 정수배만큼 옮겨, 지금 칸만 보이게 한다.
// 시트 안 캐릭터 위치는 에셋에서 맞췄으므로 칸마다 위치를 고치지 않는다.
function ActionSheet({ source, size, label }: SheetProps) {
  const [frame, setFrame] = useState(0);

  // 화면이 가려지면(다른 화면이 위에 쌓이거나 다른 탭으로 가면) 타이머를 멈춘다
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => setFrame((f) => (f + 1) % FRAME_COUNT), FRAME_MS);
      return () => clearInterval(id);
    }, []),
  );

  return (
    <View
      style={{ width: size, height: size, overflow: 'hidden' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Image
        source={source}
        style={{ width: size * FRAME_COUNT, height: size, transform: [{ translateX: -frame * size }] }}
      />
    </View>
  );
}
