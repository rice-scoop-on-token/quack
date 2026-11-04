import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, View } from 'react-native';

// 불꽃 시트는 576×96, 96×96 칸 6개가 가로로 놓여 있다. 칸 크기를 코드에 고정하지 않고 표시 크기로 늘이거나 줄여 그린다.
const FRAME_COUNT = 6;
const FRAME_MS = 250;

// 장면 속 모닥불. CharacterBox의 동작 시트와 같은 방식(한 칸 창 + 시트 이동)으로 재생하고, 화면이 가려지면 멈춘다.
export function CampfireFlame({ size }: { size: number }) {
  const [frame, setFrame] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => setFrame((f) => (f + 1) % FRAME_COUNT), FRAME_MS);
      return () => clearInterval(id);
    }, []),
  );

  return (
    // 장식이라 스크린 리더에는 읽어 주지 않는다
    <View
      style={{ width: size, height: size, overflow: 'hidden' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={require('../../../assets/backgrounds/campfire-flame-sheet.png')}
        style={{ width: size * FRAME_COUNT, height: size, transform: [{ translateX: -frame * size }] }}
      />
    </View>
  );
}
