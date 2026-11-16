import { Pressable, StyleSheet, View } from 'react-native';

import { CATALOG_SUBJECTS, SUBJECT_HINTS } from '@/api/mock/data/catalog';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { COLORS, FONT, PAPER } from '@/theme/assetTokens';

type Props = {
  // 고른 과목 이름. 3과목을 모두 추가했으면 undefined
  value: string | undefined;
  // 이미 만든 과목의 이름. 비활성으로 보여 준다.
  addedNames: string[];
  onChange: (name: string) => void;
  error: string;
};

// 과목 선택. 지원 과목 3개(자료구조·알고리즘·컴퓨터구조) 중 하나를 고른다.
// 폴더 이름은 고른 과목 이름과 늘 같다(통화방이 폴더 이름과 과목 이름을 비교해 내 방을 찾는다).
export function SubjectPicker({ value, addedNames, onChange, error }: Props) {
  return (
    <View style={styles.box}>
      <Text>과목 (필수)</Text>
      <View accessibilityRole="radiogroup" style={styles.list}>
        {CATALOG_SUBJECTS.map((s) => {
          const added = addedNames.includes(s.name);
          const selected = !added && s.name === value;
          return (
            <Pressable
              key={s.id}
              style={[styles.option, selected && styles.selected, added && styles.added]}
              disabled={added}
              onPress={() => onChange(s.name)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: added }}
              accessibilityLabel={added ? `${s.name}, 추가됨` : s.name}
            >
              <View style={styles.texts}>
                <Text style={[styles.name, added && styles.addedText]}>{s.name}</Text>
                <Text style={[styles.hint, added && styles.addedText]}>{SUBJECT_HINTS[s.name]}</Text>
              </View>
              {added ? (
                <View style={styles.badge}>
                  <Icon name="check" tint={COLORS.textSub} />
                  <Text style={[styles.hint, styles.addedText]}>추가됨</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {value === undefined ? <Text style={styles.hint}>세 과목을 모두 추가했어요.</Text> : null}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 8,
  },
  list: {
    gap: 8,
  },
  option: {
    ...PAPER.option,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  // 고른 칸은 주요색으로 칠한다
  selected: {
    backgroundColor: COLORS.primary,
  },
  // 이미 만든 과목. 불투명도 대신 배경과 글자색을 바꾼다.
  added: {
    backgroundColor: COLORS.disabledBg,
    borderColor: COLORS.textSub,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...FONT.heading,
  },
  hint: {
    ...FONT.caption,
    color: COLORS.textSub,
  },
  addedText: {
    color: COLORS.textSub,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
