import type { Folder } from '@quack/shared';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampfireFlame } from '@/components/ui/CampfireFlame';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { growthFromXp } from '@/features/character/growth';
import { SCREEN_ACTIONS } from '@/features/character/screenActions';
import { useCharacterXp } from '@/features/character/useCharacterXp';
import { COLORS, hardShadow, SIZES } from '@/theme/assetTokens';
import { useDayNight } from '@/theme/useDayNight';

const BACKGROUNDS = {
  day: require('../../../assets/backgrounds/home-hill-day.png'),
  night: require('../../../assets/backgrounds/home-hill-night.png'),
};

const IMAGE_RATIO = 1500 / 1049;

const CHARACTER_SIZE = 150;
// 한계: 캐릭터 시트 칸 안에서 발끝 위치가 동물·단계마다 조금씩 달라서, 발이 풀밭에 정확히 닿는지는 이 값으로 맞춘다.
const CHARACTER_FOOT_OFFSET = 23;
// 불꽃 위치(장면 카드의 폭·높이에 대한 비율). X는 불꽃 칸의 가로 중심, BOTTOM_Y는 불꽃 칸의 아래(불꽃 바닥)가 닿는 높이다.
// 불꽃 바닥을 장작 윗부분에 두면 불이 장작 위로 솟는다. 위치가 어긋나면 이 두 값만 고친다.
const FLAME_X = 0.8;
const FLAME_BOTTOM_Y = 0.76;
const FLAME_SIZE = 40;

// 홈 위쪽 장면 카드: 낮/밤 야외 배경 위에 캐릭터가 서 있고, 밤에는 모닥불이 탄다.
// 배경 이미지는 이 카드 안에서만, 잘리지 않게 전체를 그린다. 카드 크기는 카드가 놓인 폭과 이미지 비율(IMAGE_RATIO)로 정한다.
// 헤더를 숨긴 홈이라 상단 안전 영역만큼 위를 띄운다.
// 위로 당겼을 때(iOS) 보이는 색은 장면 위가 크림 바탕이라 그 바탕색이 그대로 보이고, 따로 처리하지 않는다.
export function HomeScene({ folder }: { folder: Folder }) {
  const insets = useSafeAreaInsets();
  const time = useDayNight();
  const xp = useCharacterXp(folder.id);
  const stage = xp === undefined ? undefined : growthFromXp(xp).stage;

  return (
    // 바깥은 그림자 자리, 안쪽은 이미지를 둥근 테두리 안에 가두는 틀
    <View style={[styles.shadow, { marginTop: insets.top }]}>
      <View style={styles.card} accessible accessibilityLabel={`홈, ${time === 'day' ? '낮' : '밤'} 풍경`}>
        {/* 웹의 Image는 불러온 이미지의 원래 픽셀 크기를 width·height로 먼저 정한다. 폭·높이를 직접 지정해야 카드 크기에 맞게 들어간다 */}
        <Image source={BACKGROUNDS[time]} style={styles.image} resizeMode="contain" />
        {time === 'night' ? (
          <View
            style={{
              position: 'absolute',
              left: `${FLAME_X * 100}%`,
              top: `${FLAME_BOTTOM_Y * 100}%`,
              marginLeft: -FLAME_SIZE / 2,
              marginTop: -FLAME_SIZE,
            }}
          >
            <CampfireFlame size={FLAME_SIZE} />
          </View>
        ) : null}
        <View style={[styles.character, { bottom: CHARACTER_FOOT_OFFSET }]}>
          <CharacterBox speciesId={folder.species_id} stage={stage} size={CHARACTER_SIZE} action={SCREEN_ACTIONS.home} />
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
  character: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
