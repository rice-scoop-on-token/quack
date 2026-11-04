import { useState, type ReactNode } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/ui/Button';

const PAGE = 5;

type Props = {
  // key를 가진 항목들
  items: ReactNode[];
  empty: string;
};

// 기록이 길어져도 화면이 늘어나지 않도록 처음 5개만 보여 주고, 더 보기를 누를 때마다 5개씩 늘린다.
export function MoreList({ items, empty }: Props) {
  const [shown, setShown] = useState(PAGE);

  if (items.length === 0) {
    return <Text>{empty}</Text>;
  }
  return (
    <>
      {items.slice(0, shown)}
      {items.length > shown ? (
        <Button variant="small" title={`더 보기 (${items.length - shown}개 남음)`} onPress={() => setShown((n) => n + PAGE)} />
      ) : null}
    </>
  );
}
