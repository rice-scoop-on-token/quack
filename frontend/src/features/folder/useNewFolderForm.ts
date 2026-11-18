import type { Folder, SpeciesId } from '@quack/shared';
import { useState } from 'react';

import { useApiQuery, useQuackApi } from '@/api';
import { CATALOG_SUBJECTS } from '@/api/mock/data/catalog';

export type NewFolderForm = {
  // 고른 과목 이름. 3과목을 모두 추가했으면 undefined
  subjectName: string | undefined;
  setSubjectName: (value: string) => void;
  // 이미 만든 과목의 이름
  addedNames: string[];
  allAdded: boolean;
  error: string;
  speciesId: SpeciesId;
  setSpeciesId: (value: SpeciesId) => void;
  // 입력이 틀리면 오류 문구를 보여 주고 null을 돌려준다
  submit: () => Promise<Folder | null>;
};

// 온보딩 첫 과목(O-03)과 과목 추가에서 같이 쓴다. 만든 뒤 어디로 갈지는 화면마다 달라서 화면이 정한다.
// 과목은 지원 과목 3개 중에서만 고르고, 폴더 이름은 그 과목 이름과 같다.
export function useNewFolderForm(): NewFolderForm {
  const api = useQuackApi();
  const folders = useApiQuery((a) => a.listFolders(), []);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [speciesId, setSpeciesId] = useState<SpeciesId>('rubber_duck');

  const addedNames = (folders ?? []).map((f) => f.name);
  // 고르기 전에는 아직 만들지 않은 첫 과목이 골라져 있다. 이미 만든 과목은 고를 수 없다.
  const firstFree = CATALOG_SUBJECTS.find((s) => !addedNames.includes(s.name))?.name;
  const subjectName = chosen !== null && !addedNames.includes(chosen) ? chosen : firstFree;

  async function submit(): Promise<Folder | null> {
    if (subjectName === undefined) {
      setError('세 과목을 모두 추가했어요.');
      return null;
    }
    setError('');
    return api.createFolder({ name: subjectName, species_id: speciesId });
  }

  return {
    subjectName,
    setSubjectName: (value) => {
      setChosen(value);
      setError('');
    },
    addedNames,
    allAdded: subjectName === undefined,
    error,
    speciesId,
    setSpeciesId,
    submit,
  };
}
