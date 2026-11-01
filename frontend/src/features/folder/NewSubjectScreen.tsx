import type { SpeciesId } from '@quack/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Text } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { SpeciesPicker } from '@/features/character/SpeciesPicker';
import { FolderNameForm, validateFolderName } from '@/features/folder/FolderNameForm';

// 과목 추가: 과목 이름과 선생님을 한 화면에서 정한다
export function NewSubjectScreen() {
  const { folders, createFolder } = useTempStore();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [speciesId, setSpeciesId] = useState<SpeciesId>('rubber_duck');

  function handleSubmit() {
    const message = validateFolderName(
      name,
      folders.map((f) => f.name),
    );
    setError(message);
    if (message) {
      return;
    }
    // QuackApi 교체 지점: folders에 과목과 선생님 동물을 함께 저장한다.
    const folder = createFolder(name.trim(), speciesId);
    // 프로토타입 흐름대로 자료 추가를 거쳐 과목 상세로 간다. 추가 화면은 뒤로 가기로 돌아오지 않게 바꾼다.
    router.replace({ pathname: '/subjects/[id]/materials', params: { id: folder.id, from: 'new' } });
  }

  return (
    <BottomActionLayout
      actions={
        // 과목 만들기 버튼
        <Button title="과목 만들기" onPress={handleSubmit} />
      }
    >
      {/* 과목 이름 입력 폼 */}
      <FolderNameForm value={name} onChangeText={setName} error={error} />

      {/* 선생님 선택 제목 */}
      <Text>이 과목의 선생님</Text>
      {/* 동물 선택 카드 목록 */}
      <SpeciesPicker value={speciesId} onChange={setSpeciesId} />

      {/* 변경 불가 안내 */}
      <Text>한 번 고른 선생님은 이 과목에서 바꿀 수 없어요. 함께 공부하면 아기부터 자라요.</Text>
    </BottomActionLayout>
  );
}
