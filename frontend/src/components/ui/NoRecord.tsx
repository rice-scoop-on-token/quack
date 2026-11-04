import { Button, Text } from 'react-native';

import { BottomActionLayout } from '@/components/ui/BottomActionLayout';

type Props = {
  message: string;
  onHome: () => void;
};

// 보여 줄 기록이 없을 때(주소로 바로 들어오거나 새로고침한 경우)의 안내와 홈으로 버튼
export function NoRecord({ message, onHome }: Props) {
  return (
    <BottomActionLayout
      actions={
        <Button title="홈으로" onPress={onHome} />
      }
    >
      <Text>{message}</Text>
    </BottomActionLayout>
  );
}
