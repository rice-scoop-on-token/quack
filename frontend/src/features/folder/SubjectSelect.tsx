import type { Folder } from '@quack/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  folders: Folder[];
  value: Folder;
  onChange: (folder: Folder) => void;
};

// 과목 선택 바. 누르면 바로 아래에 과목 목록이 펼쳐진다. 홈(H-01)에서 쓰고, 공부 준비 화면에서도 쓸 예정이다.
// 웹과 앱에서 똑같이 동작하도록 Modal이나 네이티브 선택창 없이 목록을 화면 안에 펼친다.
export function SubjectSelect({ folders, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function select(folder: Folder) {
    onChange(folder);
    setOpen(false);
  }

  return (
    <View style={styles.container}>
      {/* 과목 선택 바 (지금 과목 이름과 펼침 표시) */}
      <Pressable
        style={styles.bar}
        onPress={() => setOpen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={`공부할 과목: ${value.name}`}
        accessibilityState={{ expanded: open }}
      >
        <Text>{value.name}</Text>
        <Text>{open ? '▲' : '▼'}</Text>
      </Pressable>

      {open ? (
        // 펼쳐진 과목 목록
        <View style={styles.list}>
          {folders.map((f) => (
            // 과목 목록 항목
            <Pressable
              key={f.id}
              style={styles.item}
              onPress={() => select(f)}
              accessibilityRole="button"
              accessibilityState={{ selected: f.id === value.id }}
            >
              <Text>{f.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
  },
  list: {
    borderWidth: 1,
  },
  item: {
    padding: 12,
  },
});
