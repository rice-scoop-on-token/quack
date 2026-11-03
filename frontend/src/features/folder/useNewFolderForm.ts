import type { Folder, SpeciesId } from '@quack/shared';
import { useState } from 'react';

import { useApiQuery, useQuackApi } from '@/api';
import { validateFolderName } from '@/features/folder/FolderNameForm';

export type NewFolderForm = {
  name: string;
  setName: (value: string) => void;
  error: string;
  speciesId: SpeciesId;
  setSpeciesId: (value: SpeciesId) => void;
  // 입력이 틀리면 오류 문구를 보여 주고 null을 돌려준다
  submit: () => Promise<Folder | null>;
};

// 온보딩 첫 과목(O-03)과 과목 추가에서 같이 쓴다. 만든 뒤 어디로 갈지는 화면마다 달라서 화면이 정한다.
export function useNewFolderForm(): NewFolderForm {
  const api = useQuackApi();
  const folders = useApiQuery((a) => a.listFolders(), []);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [speciesId, setSpeciesId] = useState<SpeciesId>('rubber_duck');

  async function submit(): Promise<Folder | null> {
    const message = validateFolderName(
      name,
      (folders ?? []).map((f) => f.name),
    );
    setError(message);
    if (message) {
      return null;
    }
    return api.createFolder({ name: name.trim(), species_id: speciesId });
  }

  return { name, setName, error, speciesId, setSpeciesId, submit };
}
