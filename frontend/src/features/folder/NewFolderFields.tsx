import { Text } from 'react-native';

import { SpeciesPicker } from '@/features/character/SpeciesPicker';
import { FolderNameForm } from '@/features/folder/FolderNameForm';
import type { NewFolderForm } from '@/features/folder/useNewFolderForm';

type Props = {
  form: NewFolderForm;
};

// 새 과목 입력 본문(과목 이름, 선생님 선택, 변경 불가 안내). 온보딩 첫 과목(O-03)과 과목 추가에서 같이 쓴다.
// 화면 배치(온보딩 레이아웃 / 하단 버튼 레이아웃)와 만들기 버튼은 각 화면에 둔다.
export function NewFolderFields({ form }: Props) {
  return (
    <>
      {/* 과목 이름 입력 폼 */}
      <FolderNameForm value={form.name} onChangeText={form.setName} error={form.error} />

      {/* 선생님 선택 제목 */}
      <Text>이 과목의 선생님</Text>
      {/* 동물 선택 카드 목록 */}
      <SpeciesPicker value={form.speciesId} onChange={form.setSpeciesId} />

      {/* 변경 불가 안내 */}
      <Text>한 번 고른 선생님은 이 과목에서 바꿀 수 없어요. 함께 공부하면 아기부터 자라요.</Text>
    </>
  );
}
