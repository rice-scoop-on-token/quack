import type { Folder } from '@quack/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  folders: Folder[];
  value: Folder;
  onChange: (folder: Folder) => void;
};

// 과목 선택 바. 누르면 바로 아래에 과목 목록이 아래 내용 위로 덮여 펼쳐진다. 홈(H-01)과 공부 준비(S-01)에서 쓴다.
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
        // 펼쳐진 과목 목록 (아래 내용을 밀지 않고 그 위에 덮인다)
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
  // 펼친 목록이 뒤에 오는 화면 요소보다 위에 그려지도록 순서를 올린다
  container: {
    zIndex: 1,
    elevation: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
  },
  // 선택 바 바로 아래에 띄운다. 아래 내용이 비치지 않게 흰 배경을 임시로 둔다(디자인 작업 때 바꾼다).
  list: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  item: {
    padding: 12,
  },
});
