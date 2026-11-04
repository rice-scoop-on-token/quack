import type { Folder } from '@quack/shared';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GrowthStage } from '@/api/tempContract';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { SceneBackButton } from '@/components/ui/SceneBackButton';
import type { CharacterAction } from '@/features/character/characterAssets';
import { FOOT_RATIO } from '@/features/character/footAnchor';
import { COLORS, hardShadow, SIZES } from '@/theme/assetTokens';
import { useDayNight } from '@/theme/useDayNight';

const BACKGROUNDS = {
  day: require('../../../assets/backgrounds/study-room-day.png'),
  night: require('../../../assets/backgrounds/study-room-night.png'),
};

const IMAGE_RATIO = 1.667;

const CHARACTER_SIZE = 130;
// compact일 때 장면 카드 폭과 캐릭터 크기를 이 비율로 줄인다
const COMPACT_SCALE = 0.55;
// 발이 닿는 기준선: 러그 한가운데가 장면 높이의 아래에서 약 10% 위다(낮·밤 이미지 모두 같다).
const RUG_FEET_FROM_BOTTOM = 0.1;
// 발끝 위치를 모를 때(단계를 불러오는 중)의 칸 안 발끝 비율
const DEFAULT_FOOT_RATIO = 0.9;

type Props = {
  folder: Folder;
  stage: GrowthStage | undefined;
  action: CharacterAction;
  // 왼쪽 위 뒤로가기 버튼을 눌렀을 때
  onBack: () => void;
  // 설명 입력처럼 아래 내용이 많은 단계에서 장면을 줄여 한 화면에 들어가게 한다(이미지 전체와 비율은 그대로)
  compact?: boolean;
};

// 공부 화면 위쪽 장면 카드: 낮/밤 실내 배경 위 러그에 캐릭터가 서고, 왼쪽 위에 뒤로가기 버튼이 있다.
// 배경 이미지는 이 카드 안에서만, 잘리지 않게 전체를 그린다. 카드 크기는 카드가 놓인 폭과 이미지 비율(IMAGE_RATIO)로 정한다.
// 헤더를 숨긴 화면이라 상단 안전 영역만큼 위를 띄운다.
export function StudyScene({ folder, stage, action, onBack, compact = false }: Props) {
  const insets = useSafeAreaInsets();
  const time = useDayNight();
  const scale = compact ? COMPACT_SCALE : 1;
  const characterSize = CHARACTER_SIZE * scale;
  const footRatio = stage ? FOOT_RATIO[folder.species_id][stage] : DEFAULT_FOOT_RATIO;

  return (
    // 바깥은 그림자 자리, 안쪽은 이미지를 둥근 테두리 안에 가두는 틀
    <View style={[styles.shadow, { marginTop: insets.top, width: `${scale * 100}%`, alignSelf: 'center' }]}>
      <View style={styles.card} accessible={false}>
        {/* 웹의 Image는 불러온 이미지의 원래 픽셀 크기를 width·height로 먼저 정한다. 폭·높이를 직접 지정해야 카드 크기에 맞게 들어간다 */}
        <Image
          source={BACKGROUNDS[time]}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={`공부 장면, ${time === 'day' ? '낮' : '밤'}`}
        />
        {/* 칸 아래가 아니라 발끝을 러그 기준선에 맞춘다: 기준선에 칸 아래를 맞춘 뒤, 칸 안 발 아래 여백만큼 칸을 내린다 */}
        <View style={[styles.character, { bottom: `${RUG_FEET_FROM_BOTTOM * 100}%` }]}>
          <View style={{ transform: [{ translateY: (1 - footRatio) * characterSize }] }}>
            <CharacterBox speciesId={folder.species_id} stage={stage} size={characterSize} action={action} />
          </View>
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
