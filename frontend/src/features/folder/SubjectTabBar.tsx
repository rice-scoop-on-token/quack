import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { TAB_IMAGES } from '@/features/folder/subjectTabImages';
import type { SubjectTabId } from '@/features/folder/subjectTabColors';
import { COLORS, FONT } from '@/theme/assetTokens';

const SUBJECT_TABS: { id: SubjectTabId; label: string }[] = [
  { id: 'info', label: '정보' },
  { id: 'materials', label: '자료' },
  { id: 'study', label: '학습' },
  { id: 'quiz', label: '퀴즈' },
  { id: 'podcast', label: '팟캐스트' },
];

export const PANEL_MARGIN = 12;
const BORDER = 2;

type Props = {
  value: SubjectTabId;
  onChange: (id: SubjectTabId) => void;
};

// 파일철 탭 라벨. 패널 오른쪽 위에 세로로 쌓이고, 고른 탭은 패널 색으로 이어져 한 덩어리로 보인다.
// 탭 모양(테두리, 둥근 모서리, 색)은 이미지가 그린다. 이미지에는 왼쪽 테두리가 없다:
// 안 고른 탭은 패널 오른쪽 테두리가 그 역할을 하고, 고른 탭은 그 테두리를 덮어 패널과 이어진다.
export function SubjectTabBar({ value, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {SUBJECT_TABS.map((t) => {
        const selected = t.id === value;
        return (
          <Pressable
            key={t.id}
            style={selected ? styles.selected : styles.tab}
            onPress={() => onChange(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Image
              source={TAB_IMAGES[t.id][selected ? 'active' : 'inactive']}
              style={styles.image}
              resizeMode="stretch"
            />
            <Text style={[styles.label, selected && styles.selectedLabel]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// 탭 열 폭은 69: 고른 탭 66에서 패널 테두리와 겹치는 2를 빼고 오른쪽 여백 5를 더한다
const styles = StyleSheet.create({
  bar: {
    alignItems: 'flex-start',
    gap: 2,
    paddingTop: 16,
    paddingRight: 5,
  },
  tab: {
    width: 58,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 패널 오른쪽 테두리(2)를 덮는다
  selected: {
    width: 66,
    height: 44,
    marginLeft: -BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 웹의 Image는 원래 픽셀 크기를 먼저 쓰므로 탭 크기에 맞게 폭·높이를 직접 지정한다
  image: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  label: {
    ...FONT.caption,
    color: COLORS.text,
  },
  selectedLabel: {
    fontWeight: '700',
  },
});
