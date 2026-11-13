import type { Folder } from '@quack/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { FolderCard } from '@/components/ui/FolderCard';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { growthFromXp } from '@/features/character/growth';
import { useCharacterXp } from '@/features/character/useCharacterXp';
import { COLORS, SIZES } from '@/theme/assetTokens';

type Props = {
  folder: Folder;
  detail: string;
  onPress: () => void;
  onDelete: () => void;
};

// 과목 카드. 과목 서랍(L-01)에서 쓴다. 겉모양(파일철)은 FolderCard가 그리고, 눌림과 메뉴는 여기서 맡는다.
export function SubjectCard({ folder, detail, onPress, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const species = SPECIES.find((s) => s.id === folder.species_id);
  const { stage } = growthFromXp(useCharacterXp(folder.id) ?? 0);

  return (
    <FolderCard>
      <View style={styles.row}>
        {/* 카드 전체(캐릭터와 글자)를 누르면 상세로 가고, 케밥은 따로 눌린다 */}
        <Pressable style={styles.main} onPress={onPress} accessibilityRole="button">
          <CharacterBox speciesId={folder.species_id} stage={stage} size={56} />
          <View style={styles.text}>
            <Text style={styles.name}>{folder.name}</Text>
            <Text style={styles.teacher}>{species?.name} 선생님</Text>
            <Text style={styles.description}>{species?.description}</Text>
            <Text style={styles.count}>{detail}</Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.kebab}
          onPress={() => setMenuOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={`${folder.name} 메뉴`}
          accessibilityState={{ expanded: menuOpen }}
        >
          <Icon name="more-vertical" />
        </Pressable>
      </View>

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
    </FolderCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  teacher: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSub,
  },
  description: {
    fontSize: 13,
  },
  count: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSub,
  },
  // 터치 영역 44×44, 아이콘은 24. 카드 오른쪽 여백 쪽으로 조금 당긴다.
  kebab: {
    width: SIZES.touchMin,
    height: SIZES.touchMin,
    marginRight: -12,
    marginTop: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 케밥 왼쪽, 카드 안쪽에 띄운다. 카드 밖으로 나가면 목록 맨 아래 카드에서 스크롤 영역에 잘려 눌리지 않기 때문이다.
  menu: {
    position: 'absolute',
    top: 8,
    right: 40,
    minHeight: SIZES.touchMin,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: SIZES.row.border,
    borderColor: COLORS.outline,
    borderRadius: SIZES.row.radius,
    backgroundColor: COLORS.card,
  },
});
