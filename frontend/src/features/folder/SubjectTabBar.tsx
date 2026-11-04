import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TAB_COLORS, type SubjectTabId } from '@/features/folder/subjectTabColors';

const SUBJECT_TABS: { id: SubjectTabId; label: string }[] = [
  { id: 'info', label: '정보' },
  { id: 'materials', label: '자료' },
  { id: 'study', label: '학습' },
  { id: 'quiz', label: '퀴즈' },
  { id: 'podcast', label: '팟캐스트' },
];

const TAB_TEXT = '#3B2A1A';
export const PANEL_MARGIN = 12;

type Props = {
  value: SubjectTabId;
  onChange: (id: SubjectTabId) => void;
};

// 파일철 탭 라벨. 패널 오른쪽 위에 세로로 쌓이고, 고른 탭은 패널 색으로 이어져 한 덩어리로 보인다.
export function SubjectTabBar({ value, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {SUBJECT_TABS.map((t) => {
        const selected = t.id === value;
        return (
          <Pressable
            key={t.id}
            style={[
              styles.tab,
              { backgroundColor: selected ? TAB_COLORS[t.id].paper : TAB_COLORS[t.id].back },
              selected && styles.selected,
            ]}
            onPress={() => onChange(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'flex-start',
    gap: 2,
    paddingTop: 16,
    paddingRight: 4,
  },
  // 안 고른 탭은 높이 44, 폭 58로 조금 작게 해서 뒤에 꽂힌 느낌을 준다
  tab: {
    width: 58,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  // 폭을 넓혀 앞으로 나오게 하고, 패널 오른쪽 테두리(1)를 덮어 경계를 가린다
  selected: {
    width: 66,
    marginLeft: -1,
    paddingLeft: 1,
  },
  label: {
    fontSize: 13,
    color: TAB_TEXT,
  },
  selectedLabel: {
    fontWeight: '700',
  },
});
