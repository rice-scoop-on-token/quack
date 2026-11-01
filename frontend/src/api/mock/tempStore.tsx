import type { Material, SpeciesId } from '@quack/shared';
import { createContext, useContext, useState, type ReactNode } from 'react';

import type { TempFolder } from '@/api/tempContract';

// QuackApi가 생기기 전까지 화면끼리 함께 쓰는 임시 상태다.
// 메모리에만 있으므로 새로고침하면 처음 상태로 돌아간다.
type TempStore = {
  onboarded: boolean;
  setOnboarded: (value: boolean) => void;
  displayName: string;
  setDisplayName: (value: string) => void;
  // 온보딩에서 고른 동물. 첫 과목을 만들 때 그 과목의 선생님이 된다.
  draftSpeciesId: SpeciesId;
  setDraftSpeciesId: (value: SpeciesId) => void;
  folders: TempFolder[];
  createFolder: (name: string, speciesId: SpeciesId) => TempFolder;
  materials: Material[];
  addMaterial: (material: Material) => void;
  setMaterialStatus: (id: string, status: Material['status']) => void;
};

// 익명 로그인 연동 전이라 모든 임시 데이터를 이 사용자 것으로 만든다.
export const TEMP_USER_ID = '00000000-0000-4000-8000-000000000001';

// shared 스키마가 uuid 형식을 요구해서 같은 형식으로 만든다.
export function tempId(): string {
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
}

const TempStoreContext = createContext<TempStore | null>(null);

export function TempStoreProvider({ children }: { children: ReactNode }) {
  // QuackApi 교체 지점: 아래 값은 모두 profile, folders, materials 조회 결과로 바뀐다.
  const [onboarded, setOnboarded] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [draftSpeciesId, setDraftSpeciesId] = useState<SpeciesId>('rubber_duck');
  const [folders, setFolders] = useState<TempFolder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  function createFolder(name: string, speciesId: SpeciesId): TempFolder {
    const folder: TempFolder = {
      id: tempId(),
      user_id: TEMP_USER_ID,
      name,
      created_at: new Date().toISOString(),
      species_id: speciesId,
      total_xp: 0,
    };
    setFolders((prev) => [...prev, folder]);
    return folder;
  }

  function addMaterial(material: Material) {
    setMaterials((prev) => [...prev, material]);
  }

  function setMaterialStatus(id: string, status: Material['status']) {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
  }

  return (
    <TempStoreContext
      value={{
        onboarded,
        setOnboarded,
        displayName,
        setDisplayName,
        draftSpeciesId,
        setDraftSpeciesId,
        folders,
        createFolder,
        materials,
        addMaterial,
        setMaterialStatus,
      }}
    >
      {children}
    </TempStoreContext>
  );
}

export function useTempStore(): TempStore {
  const store = useContext(TempStoreContext);
  if (!store) {
    throw new Error('TempStoreProvider 안에서만 쓸 수 있다.');
  }
  return store;
}
