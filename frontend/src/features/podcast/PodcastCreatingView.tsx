import type { Folder } from '@quack/shared';
import { StyleSheet, View } from 'react-native';

import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { SpeechBubble } from '@/components/ui/SpeechBubble';
import { growthFromXp } from '@/features/character/growth';
import { SCREEN_ACTIONS } from '@/features/character/screenActions';
import { useCharacterXp } from '@/features/character/useCharacterXp';

const CHARACTER_SIZE = 120;

// 팟캐스트를 만드는 동안 보여 주는 로딩 화면. 선생님이 자료를 읽는 모습과 말풍선을 보여 준다.
export function PodcastCreatingView({ folder }: { folder: Folder }) {
  const xp = useCharacterXp(folder.id);
  const stage = xp === undefined ? undefined : growthFromXp(xp).stage;

  return (
    <BottomActionLayout actions={null} centered>
      <SpeechBubble>{`${folder.name} 선생님이 자료를 읽고 팟캐스트를 만들고 있어요. 잠시만 기다려 주세요…`}</SpeechBubble>
      <View style={styles.character}>
        <CharacterBox
          speciesId={folder.species_id}
          stage={stage}
          size={CHARACTER_SIZE}
          action={SCREEN_ACTIONS.podcastCreating}
        />
      </View>
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  character: {
    height: CHARACTER_SIZE,
    alignItems: 'center',
  },
});
