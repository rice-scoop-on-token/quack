import type { SpeciesId } from '@quack/shared';
import { StyleSheet, Text, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import type { GrowthStage } from '@/api/tempContract';

const STAGE_LABEL: Record<GrowthStage, string> = {
  baby: '아기',
  child: '어린이',
  adult: '성체',
};

type Props = {
  speciesId: SpeciesId;
  stage?: GrowthStage;
  size?: number;
  // 반응 모션 이름. 에셋이 들어오면 이 값으로 동작 이미지를 고른다.
  motionLabel?: string;
};

// 캐릭터 이미지 자리다. 에셋이 들어오면 이 파일 안만 이미지로 바꾸면 모든 화면에 반영된다.
export function CharacterBox({ speciesId, stage = 'child', size = 120, motionLabel }: Props) {
  const name = SPECIES.find((s) => s.id === speciesId)?.name ?? speciesId;

  return (
    // 캐릭터 이미지 자리 (임시 박스)
    <View style={[styles.box, { width: size, height: size }]}>
      <Text>{name}</Text>
      <Text>{STAGE_LABEL[stage]}</Text>
      {motionLabel ? <Text>{motionLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // 박스 위치가 보이도록 테두리만 둔다
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
