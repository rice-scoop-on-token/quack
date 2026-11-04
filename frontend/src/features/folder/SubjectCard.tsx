import type { Folder } from '@quack/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { growthFromXp } from '@/features/character/growth';
import { useCharacterXp } from '@/features/character/useCharacterXp';

type Props = {
  folder: Folder;
  detail: string;
  onPress: () => void;
  onDelete: () => void;
};

// 과목 카드. 과목 서랍(L-01)에서 쓴다.
export function SubjectCard({ folder, detail, onPress, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const species = SPECIES.find((s) => s.id === folder.species_id);
  const { stage } = growthFromXp(useCharacterXp(folder.id) ?? 0);

  return (
    <View style={styles.card}>
      <Pressable style={styles.main} onPress={onPress} accessibilityRole="button">
        <CharacterBox speciesId={folder.species_id} stage={stage} size={56} />
        <View style={styles.text}>
          <Text>
            {folder.name} · {species?.name} 선생님
          </Text>
          <Text>
            {species?.description} · {detail}
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={styles.kebab}
        onPress={() => setMenuOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel={`${folder.name} 메뉴`}
        accessibilityState={{ expanded: menuOpen }}
      >
        <Text>⋮</Text>
      </Pressable>

      {menuOpen ? (
        <Pressable
          style={styles.menu}
          onPress={() => {
            setMenuOpen(false);
            onDelete();
          }}
          accessibilityRole="button"
        >
          <Text>과목 삭제</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  kebab: {
    padding: 12,
  },
  // 케밥 왼쪽, 카드 안쪽에 띄운다. 카드 밖으로 나가면 목록 맨 아래 카드에서 스크롤 영역에 잘려 눌리지 않기 때문이다.
  // 글자가 비치지 않게 흰 배경을 임시로 둔다(디자인 작업 때 바꾼다).
  menu: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    right: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  text: {
    flex: 1,
    gap: 4,
  },
});
