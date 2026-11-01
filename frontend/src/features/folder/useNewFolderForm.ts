import type { Folder, SpeciesId } from '@quack/shared';
import { useState } from 'react';

import { useTempStore } from '@/api/mock/tempStore';
import { validateFolderName } from '@/features/folder/FolderNameForm';

export type NewFolderForm = {
  name: string;
  setName: (value: string) => void;
  error: string;
  speciesId: SpeciesId;
  setSpeciesId: (value: SpeciesId) => void;
  // 입력이 맞으면 과목을 만들어 돌려주고, 틀리면 오류 문구를 보여 주고 null을 돌려준다.
  submit: () => Folder | null;
};

// 새 과목(이름 + 선생님) 입력 상태. 온보딩 첫 과목(O-03)과 과목 추가에서 같이 쓴다.
// 만든 뒤 어디로 갈지는 화면마다 달라서 화면이 정한다.
export function useNewFolderForm(): NewFolderForm {
  const { folders, createFolder } = useTempStore();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [speciesId, setSpeciesId] = useState<SpeciesId>('rubber_duck');

  function submit(): Folder | null {
    const message = validateFolderName(
      name,
      folders.map((f) => f.name),
    );
    setError(message);
    if (message) {
      return null;
    }
    // QuackApi 교체 지점: folders에 과목과 선생님 동물을 함께 저장한다.
    return createFolder(name.trim(), speciesId);
  }

  return { name, setName, error, speciesId, setSpeciesId, submit };
}
