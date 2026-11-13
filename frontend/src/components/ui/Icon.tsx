import { Image } from 'react-native';

import { ICONS, type IconName } from '@/features/navigation/icons';
import { COLORS } from '@/theme/assetTokens';

type Props = {
  name: IconName;
  // 아이콘 색. 기본은 본문 글자색
  tint?: string;
};

// 둥근 선 아이콘 한 개(단색 + 투명 PNG). 크기는 에셋 크기에서 정해지고, 색은 tintColor로 바꾼다.
// 장식이라 스크린 리더에는 읽어 주지 않는다(뜻은 감싼 버튼의 라벨이 전한다).
export function Icon({ name, tint = COLORS.text }: Props) {
  const { source, size } = ICONS[name];
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={{ width: size, height: size, tintColor: tint }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
