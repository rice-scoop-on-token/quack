import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { PERSONAS } from '@/api/mock/data/personas';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { SpeechBubble } from '@/components/ui/SpeechBubble';
import { SpeciesPicker } from '@/features/character/SpeciesPicker';
import { FolderNameForm } from '@/features/folder/FolderNameForm';
import type { NewFolderForm } from '@/features/folder/useNewFolderForm';

type Props = {
  form: NewFolderForm;
};

// 새 과목 입력 본문(고른 선생님 캐릭터와 말풍선, 과목 이름, 선생님 선택, 변경 불가 안내).
// 온보딩 첫 과목(O-03)과 과목 추가에서 같이 쓴다. 화면 제목과 만들기 버튼은 각 화면에 둔다.
export function NewFolderFields({ form }: Props) {
  return (
    <>
      <View style={styles.character}>
        <SpeechBubble>{PERSONAS[form.speciesId].greeting}</SpeechBubble>
        <CharacterBox speciesId={form.speciesId} stage="adult" />
      </View>

      <FolderNameForm value={form.name} onChangeText={form.setName} error={form.error} />

      <Text>이 과목의 선생님</Text>
      <SpeciesPicker value={form.speciesId} onChange={form.setSpeciesId} />

      <Text>한 번 고른 선생님은 이 과목에서 바꿀 수 없어요. 함께 공부하면 아기부터 자라요.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  character: {
    alignItems: 'center',
    gap: 8,
  },
});
