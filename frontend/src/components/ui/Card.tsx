import { View, type ViewProps } from 'react-native';

import { PAPER } from '@/theme/assetTokens';

// 종이 카드. 모양(테두리 2, 모서리 14, 하드 그림자)은 PAPER.card 한 곳에서만 정한다.
export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[PAPER.card, style]} />;
}
