import { StyleSheet, Text, View } from 'react-native';

import { PERSONAS } from '@/api/mock/data/personas';
import { CharacterBox } from '@/components/ui/CharacterBox';
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
      {/* 고른 선생님 캐릭터와 말투 미리보기 말풍선 */}
      <View style={styles.character}>
        <Text style={styles.bubble} accessibilityLiveRegion="polite">
          {PERSONAS[form.speciesId].greeting}
        </Text>
        <CharacterBox speciesId={form.speciesId} stage="baby" />
      </View>

      {/* 과목 이름 입력 폼 */}
      <FolderNameForm value={form.name} onChangeText={form.setName} error={form.error} />

      {/* 선생님 선택 제목 */}
      <Text>이 과목의 선생님</Text>
      {/* 동물 선택 카드 목록 (가로 나열) */}
      <SpeciesPicker value={form.speciesId} onChange={form.setSpeciesId} />

      {/* 변경 불가 안내 */}
      <Text>한 번 고른 선생님은 이 과목에서 바꿀 수 없어요. 함께 공부하면 아기부터 자라요.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  character: {
    alignItems: 'center',
    gap: 8,
  },
  // 말풍선 자리가 보이도록 테두리만 둔다 (임시 스타일, 디자인 작업 때 바꾼다)
  bubble: {
    padding: 12,
    borderWidth: 1,
  },
});
