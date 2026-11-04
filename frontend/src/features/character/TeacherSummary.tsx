import type { Folder } from '@quack/shared';
import { StyleSheet, View } from 'react-native';

import { PersonaTags } from '@/features/character/PersonaTags';
import { PERSONAS } from '@/api/mock/data/personas';
import { SPECIES } from '@/api/mock/data/species';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { Text } from '@/components/ui/Text';
import { growthFromXp } from '@/features/character/growth';
import { SCREEN_ACTIONS } from '@/features/character/screenActions';
import { useCharacterXp } from '@/features/character/useCharacterXp';
import { COLORS, hardShadow, SIZES } from '@/theme/assetTokens';

// 공부 준비 캐릭터 자리. 아기 그림은 칸 안에서 어린이·성체보다 낮게 그려져 있어서, 아기만 자리를 꽉 채워 크게 그리고
// 어린이·성체는 120으로 그린다.
const CHARACTER_SLOT = 160;

type Props = {
  folder: Folder;
  // 공부 준비(S-01)에서만 켠다. 과목 상세(L-02)는 아래에 성장 표시가 따로 있어서 그림을 넣지 않는다
  showCharacter?: boolean;
};

// 과목 선생님 요약(과목 선생님 · 동물, 캐릭터, 성격, 태그). 과목 상세(L-02)와 공부 준비(S-01)에서 같이 쓴다.
export function TeacherSummary({ folder, showCharacter = false }: Props) {
  const species = SPECIES.find((s) => s.id === folder.species_id);
  const persona = PERSONAS[folder.species_id];
  const xp = useCharacterXp(folder.id);
  const stage = xp === undefined ? undefined : growthFromXp(xp).stage;

  return (
    <View style={styles.card}>
      <Text>
        {folder.name} 선생님 · {species?.name}
      </Text>
      {showCharacter ? (
        <View style={styles.character}>
          <CharacterBox
            speciesId={folder.species_id}
            stage={stage}
            size={stage === 'baby' ? CHARACTER_SLOT : 120}
            action={SCREEN_ACTIONS.sessionSetup}
          />
        </View>
      ) : null}
      <Text>{persona.label}</Text>
      <PersonaTags tags={persona.tags} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    paddingVertical: SIZES.card.paddingVertical,
    paddingHorizontal: SIZES.card.paddingHorizontal,
    borderWidth: SIZES.card.border,
    borderColor: COLORS.outline,
    borderRadius: SIZES.card.radius,
    backgroundColor: COLORS.card,
    // 그림자 자리를 아래에 비워 둔다
    marginBottom: SIZES.card.shadow,
    ...hardShadow(SIZES.card.shadow),
  },
  // 단계와 상관없이 자리 높이를 고정하고, 캐릭터는 발밑을 자리 아래쪽에 맞춘다
  character: {
    height: CHARACTER_SLOT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
