import type { Folder } from '@quack/shared';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GrowthStage } from '@/api/tempContract';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { SceneBackButton } from '@/components/ui/SceneBackButton';
import type { CharacterAction } from '@/features/character/characterAssets';
import { COLORS, hardShadow, SIZES } from '@/theme/assetTokens';
import { useDayNight } from '@/theme/useDayNight';

const BACKGROUNDS = {
  day: require('../../../assets/backgrounds/study-room-day.png'),
  night: require('../../../assets/backgrounds/study-room-night.png'),
};

const IMAGE_RATIO = 1.667;

const CHARACTER_SIZE = 130;
// 러그 위에 서 있도록 캐릭터 칸의 아래쪽 위치를 장면 높이에 대한 비율로 둔다(장면 아래에서 이 비율만큼 위, 음수면 아래).
// 시트 칸 아래쪽에는 발 밑 여백이 있어서(캐릭터가 칸 안에서 위쪽에 그려진다) 칸 아래를 장면 아래보다 조금 내려야 발이 러그 위에 온다.
// 한계: 칸 안 발끝 위치가 동물·단계·동작마다 조금씩 달라서 모든 경우에 러그 한가운데에 닿지는 않는다. 어긋나면 이 값만 고친다.
const CELL_BOTTOM_FROM_SCENE_BOTTOM = -0.07;

type Props = {
  folder: Folder;
  stage: GrowthStage | undefined;
  action: CharacterAction;
  // 왼쪽 위 뒤로가기 버튼을 눌렀을 때
  onBack: () => void;
};

// 공부 화면 위쪽 장면 카드: 낮/밤 실내 배경 위 러그에 캐릭터가 서고, 왼쪽 위에 뒤로가기 버튼이 있다.
// 배경 이미지는 이 카드 안에서만, 잘리지 않게 전체를 그린다. 카드 크기는 카드가 놓인 폭과 이미지 비율(IMAGE_RATIO)로 정한다.
// 헤더를 숨긴 화면이라 상단 안전 영역만큼 위를 띄운다.
export function StudyScene({ folder, stage, action, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const time = useDayNight();

  return (
    // 바깥은 그림자 자리, 안쪽은 이미지를 둥근 테두리 안에 가두는 틀
    <View style={[styles.shadow, { marginTop: insets.top }]}>
      <View style={styles.card} accessible={false}>
        {/* 웹의 Image는 불러온 이미지의 원래 픽셀 크기를 width·height로 먼저 정한다. 폭·높이를 직접 지정해야 카드 크기에 맞게 들어간다 */}
        <Image
          source={BACKGROUNDS[time]}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={`공부 장면, ${time === 'day' ? '낮' : '밤'}`}
        />
        <View style={[styles.character, { bottom: `${CELL_BOTTOM_FROM_SCENE_BOTTOM * 100}%` }]}>
          <CharacterBox speciesId={folder.species_id} stage={stage} size={CHARACTER_SIZE} action={action} />
        </View>
        <View style={styles.back}>
          <SceneBackButton onPress={onBack} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    marginBottom: SIZES.card.shadow,
    borderRadius: SIZES.card.radius,
    ...hardShadow(SIZES.card.shadow),
  },
  card: {
    width: '100%',
    aspectRatio: IMAGE_RATIO,
    overflow: 'hidden',
    borderWidth: SIZES.card.border,
    borderColor: COLORS.outline,
    borderRadius: SIZES.card.radius,
    backgroundColor: COLORS.cream,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  back: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  character: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
