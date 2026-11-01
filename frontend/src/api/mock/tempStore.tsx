import {
  characterStatsSchema,
  folderSchema,
  materialSchema,
  speciesIdSchema,
  type CharacterStats,
  type Folder,
  type Material,
  type SpeciesId,
} from '@quack/shared';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

// QuackApi가 생기기 전까지 화면끼리 함께 쓰는 임시 상태다.
// 앱(iOS/Android)에서는 메모리에만 있어서 앱을 다시 켜면 처음 상태로 돌아간다.
// 웹 mock 모드에서는 새로고침해도 남도록 localStorage에 저장한다(아래 "웹 저장").
type TempStore = {
  onboarded: boolean;
  setOnboarded: (value: boolean) => void;
  displayName: string;
  setDisplayName: (value: string) => void;
  // 온보딩에서 고른 동물. 첫 과목을 만들 때 그 과목의 선생님이 된다.
  draftSpeciesId: SpeciesId;
  setDraftSpeciesId: (value: SpeciesId) => void;
  folders: Folder[];
  // BE의 character_stats 처럼 폴더마다 한 줄씩 둔다.
  characterStats: CharacterStats[];
  createFolder: (name: string, speciesId: SpeciesId) => Folder;
  deleteFolder: (id: string) => void;
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

// 웹 저장: 주소에 ?demo=child 같은 값을 붙이고 Enter를 누르면 페이지를 새로 불러와 메모리 상태가 사라지기 때문이다.
// QuackApi로 바꾸면 데이터가 서버에 있으므로 이 저장 코드(PERSIST_ON ~ loadSaved)는 모두 지운다.
const PERSIST_ON = Platform.OS === 'web' && process.env.EXPO_PUBLIC_USE_MOCK === 'true';
const STORAGE_KEY = 'quack.tempStore';

type Saved = Pick<TempStore, 'onboarded' | 'displayName' | 'draftSpeciesId' | 'folders' | 'characterStats' | 'materials'>;

// 저장된 값을 읽는다. 없거나, 깨져 있거나, localStorage를 쓸 수 없으면 null(빈 상태로 시작)
// 주소에 ?demo=reset 이 있으면 저장된 값을 지우고 처음부터 시작한다.
function loadSaved(): Saved | null {
  // 브라우저에서만 읽는다. 웹 서버 렌더링(Node)에는 window와 localStorage가 없다.
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    if (new URLSearchParams(window.location.search).get('demo') === 'reset') {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw);
    const valid =
      typeof data.onboarded === 'boolean' &&
      typeof data.displayName === 'string' &&
      speciesIdSchema.safeParse(data.draftSpeciesId).success &&
      folderSchema.array().safeParse(data.folders).success &&
      characterStatsSchema.array().safeParse(data.characterStats).success &&
      materialSchema.array().safeParse(data.materials).success;
    if (!valid) {
      return null;
    }
    const saved = data as Saved;
    // 읽는 중에 새로고침하면 완료 처리(setTimeout)가 사라져 "읽는 중"에 멈추므로 완료로 바꾼다.
    saved.materials = saved.materials.map((m) =>
      m.status === 'processing' ? { ...m, status: 'ready' } : m,
    );
    return saved;
  } catch {
    return null;
  }
}

const TempStoreContext = createContext<TempStore | null>(null);

export function TempStoreProvider({ children }: { children: ReactNode }) {
  // QuackApi 교체 지점: 아래 값은 모두 profile, folders, character_stats, materials 조회 결과로 바뀐다.
  const [onboarded, setOnboarded] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [draftSpeciesId, setDraftSpeciesId] = useState<SpeciesId>('rubber_duck');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [characterStats, setCharacterStats] = useState<CharacterStats[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  // 웹 저장: 저장된 값을 불러오기 전에는 화면을 그리지 않는다. 그리면 빈 상태로 판단해 /intro로 보내 버린다.
  // 브라우저에서만 읽도록 화면을 그린 뒤(useEffect) 불러온다.
  const [loaded, setLoaded] = useState(!PERSIST_ON);

  useEffect(() => {
    if (!PERSIST_ON) {
      return;
    }
    const saved = loadSaved();
    if (saved) {
      setOnboarded(saved.onboarded);
      setDisplayName(saved.displayName);
      setDraftSpeciesId(saved.draftSpeciesId);
      setFolders(saved.folders);
      setCharacterStats(saved.characterStats);
      setMaterials(saved.materials);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    // 불러오기 전에 저장하면 빈 상태로 덮어쓰므로 불러온 뒤에만 저장한다. 서버 렌더링에서는 저장하지 않는다.
    if (!PERSIST_ON || !loaded || typeof window === 'undefined') {
      return;
    }
    const saved: Saved = { onboarded, displayName, draftSpeciesId, folders, characterStats, materials };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // 저장 공간이 없거나 막혀 있으면 메모리 상태만 쓴다.
    }
  }, [loaded, onboarded, displayName, draftSpeciesId, folders, characterStats, materials]);

  function createFolder(name: string, speciesId: SpeciesId): Folder {
    const folder: Folder = {
      id: tempId(),
      user_id: TEMP_USER_ID,
      name,
      species_id: speciesId,
      created_at: new Date().toISOString(),
    };
    setFolders((prev) => [...prev, folder]);
    // DB의 character_stats는 폴더마다 경험치 0부터 시작하는 view라 폴더와 함께 만든다.
    setCharacterStats((prev) => [
      ...prev,
      { folder_id: folder.id, user_id: TEMP_USER_ID, species_id: speciesId, total_xp: 0 },
    ]);
    return folder;
  }

  // DB는 폴더를 지우면 그 폴더의 자료와 경험치 내역도 함께 지운다(on delete cascade). mock도 같게 맞춘다.
  function deleteFolder(id: string) {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setCharacterStats((prev) => prev.filter((c) => c.folder_id !== id));
    setMaterials((prev) => prev.filter((m) => m.folder_id !== id));
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
        characterStats,
        createFolder,
        deleteFolder,
        materials,
        addMaterial,
        setMaterialStatus,
      }}
    >
      {loaded ? children : null}
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
