import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { COLORS, RADIUS } from '@/theme/assetTokens';

// 선생님 특징 태그. "#다정하게"처럼 둥근 사각형 태그로 보여 주고, 자리가 모자라면 다음 줄로 넘어간다.
// 공부 준비와 과목 상세가 TeacherSummary를 통해 같이 쓴다.
export function PersonaTags({ tags }: { tags: string[] }) {
  return (
    <View style={styles.row}>
      {tags.map((tag) => (
        <View key={tag} style={styles.tag}>
          <Text style={styles.label}>#{tag}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.textSub,
    borderRadius: RADIUS.large,
    backgroundColor: COLORS.cream,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
});
