import { Image, Pressable } from 'react-native';

import { TOGGLE_IMAGES, TOGGLE_SIZE } from '@/features/navigation/icons';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

// 켜고 끄는 스위치. RN의 Switch 대신 쓴다. 켜짐/꺼짐 그림에 색이 이미 들어 있어 tintColor를 쓰지 않는다.
// 그림은 52×28이라 44보다 작아서, 눌리는 영역을 hitSlop으로 넓힌다(가로 52는 충분, 세로만 8씩 더한다).
export function Toggle({ value, onValueChange, disabled = false, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
    >
      <Image source={TOGGLE_IMAGES[value ? 'on' : 'off']} resizeMode="contain" style={TOGGLE_SIZE} />
    </Pressable>
  );
}
