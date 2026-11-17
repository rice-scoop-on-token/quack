import { type ImageStyle, Platform } from 'react-native';

// 픽셀 아트를 확대해도 뭉개지지 않게 하는 웹 한정 이미지 스타일(성장 연출, 스플래시에서 쓴다).
// 한계: imageRendering은 RN 타입에 없어서 형변환한다. 기기는 기본 처리라 확대하면 조금 부드럽게 보일 수 있다.
export const pixelated: ImageStyle | null =
  Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as unknown as ImageStyle) : null;
