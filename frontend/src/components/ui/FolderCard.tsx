import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { COLORS, hardShadow, SIZES } from '@/theme/assetTokens';

// 파일철 모양 종이 카드의 겉모양만 담당한다(안의 내용, 눌림, 메뉴는 쓰는 쪽에서 children으로 넣는다).
// 카드 본체는 코드로 그려서 폭·높이가 가변이고, 에셋은 왼쪽 위 파일 탭과 사선 연결부 장식으로만 쓴다.
//
// 에셋(assets/ui/subject-card-folder/subject-card-folder.png)은 1074×342px(3배) = 358×114dp 카드 전체 그림이다.
// 바깥에 2dp 투명 여백이 있고, 탭은 왼쪽 위 약 80dp(사선 끝 x≈80, 본체 윗선 y 10~12dp)까지다.
// 이미지를 늘리지 않고 원래 크기(358×114dp) 그대로 두고, 왼쪽 위 탭 부분만 창으로 보여 준다.
const SOURCE = require('../../../assets/ui/subject-card-folder/subject-card-folder.png');
const SOURCE_WIDTH = 358;
const SOURCE_HEIGHT = 114;
const TRANSPARENT_MARGIN = 2;
// 본체 윗선(2dp)이 놓이는 높이. 이 위로 탭이 올라온다.
const BODY_TOP = 10;
// 탭 창의 크기: 사선 끝까지(80dp), 본체 윗선 아래 한 줄까지(13dp)
const TAB_WIDTH = 80;
const TAB_HEIGHT = 13;
// 본체 모서리(탭 쪽 왼쪽 위는 탭이 덮는다). 에셋의 계단식 모서리와 어울리도록 작게 둔다.
const BODY_RADIUS = 6;

export function FolderCard({ children }: { children: ReactNode }) {
  return (
    <View>
      <View style={styles.body}>{children}</View>
      {/* 탭 장식. 본체 윗선 중 탭 아래 구간을 이미지의 바탕색으로 덮어 탭과 본체가 한 덩어리로 이어진다 */}
      <View
        style={styles.tab}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {/* 웹의 Image는 원래 픽셀 크기를 먼저 쓰므로 폭·높이를 직접 지정한다 */}
        <Image
          source={SOURCE}
          style={{
            position: 'absolute',
            left: -TRANSPARENT_MARGIN,
            top: -TRANSPARENT_MARGIN,
            width: SOURCE_WIDTH,
            height: SOURCE_HEIGHT,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: BODY_TOP,
    paddingTop: SIZES.card.paddingVertical,
    paddingBottom: SIZES.card.paddingVertical,
    paddingHorizontal: SIZES.card.paddingHorizontal,
    borderWidth: SIZES.card.border,
    borderColor: COLORS.outline,
    borderRadius: BODY_RADIUS,
    borderTopLeftRadius: 0,
    backgroundColor: COLORS.card,
    ...hardShadow(SIZES.card.shadow),
  },
  tab: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: TAB_WIDTH,
    height: TAB_HEIGHT,
    overflow: 'hidden',
  },
});
