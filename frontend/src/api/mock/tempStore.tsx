import {
  characterStatsSchema,
  folderSchema,
  ledgerEntrySchema,
  materialSchema,
  sessionSchema,
  type CharacterStats,
  type Folder,
  type Material,
  type SpeciesId,
  type XpLedgerEntry,
} from '@quack/shared';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { appendSessionReward, folderXp } from '@/api/mock/ledger';
import type { SessionTurn, StudySession } from '@/api/tempContract';

// QuackApi가 생기기 전까지 화면끼리 함께 쓰는 임시 상태다.
// 앱(iOS/Android)에서는 메모리에만 있어서 앱을 다시 켜면 처음 상태로 돌아간다.
// 웹 mock 모드에서는 새로고침해도 남도록 localStorage에 저장한다(아래 "웹 저장").
type TempStore = {
  onboarded: boolean;
  setOnboarded: (value: boolean) => void;
  displayName: string;
  setDisplayName: (value: string) => void;
  folders: Folder[];
  // BE의 character_stats 처럼 폴더마다 한 줄씩 둔다. total_xp는 아래 xpLedger의 합이다(DB의 view와 같다).
  characterStats: CharacterStats[];
  // 경험치 지급 내역. 값을 덮어쓰지 않고 쌓는다.
  xpLedger: XpLedgerEntry[];
  // 세션 보상을 지급한다. 이미 지급한 세션이면 아무것도 하지 않는다(같은 세션은 한 번만).
  grantReward: (sessionId: string, folderId: string, xp: number) => void;
  createFolder: (name: string, speciesId: SpeciesId) => Folder;
  deleteFolder: (id: string) => void;
  materials: Material[];
  addMaterial: (material: Material) => void;
  setMaterialStatus: (id: string, status: Material['status']) => void;
  // 홈과 공부 준비에서 같이 쓰는 지금 고른 과목. 고른 적이 없거나 지워졌으면 첫 과목, 과목이 없으면 undefined
  selectedFolder: Folder | undefined;
  setSelectedFolderId: (id: string) => void;
  // 끝낸 공부 세션 기록
  sessions: StudySession[];
  addSession: (session: StudySession) => void;
  // 점검(S-04)의 다시 설명하기 기록과 퀴즈 결과를 끝낸 세션에 더한다
  addSessionTurn: (sessionId: string, turn: SessionTurn) => void;
  setSessionQuiz: (sessionId: string, quiz: StudySession['quiz']) => void;
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

// 예전(5단계 온보딩) 저장값에 남은 draftSpeciesId 같은 칸은 검사하지 않고 무시한다.
// 고른 과목은 화면에 id 대신 selectedFolder로 내보내므로 저장용 칸으로만 둔다.
type Saved = Pick<
  TempStore,
  'onboarded' | 'displayName' | 'folders' | 'characterStats' | 'materials' | 'sessions' | 'xpLedger'
> & {
  selectedFolderId: string | null;
};

// StudySession은 shared에 스키마가 없어서 Session 스키마에 더한 칸의 모양만 검사한다.
function isStudySession(value: unknown): boolean {
  const v = value as Partial<StudySession>;
  return (
    sessionSchema.safeParse(value).success &&
    typeof v.study_seconds === 'number' &&
    Array.isArray(v.turns) &&
    (v.quiz === null || typeof v.quiz === 'object')
  );
}

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
      folderSchema.array().safeParse(data.folders).success &&
      characterStatsSchema.array().safeParse(data.characterStats).success &&
      materialSchema.array().safeParse(data.materials).success;
    // 세션 기록과 고른 과목은 커밋 5에서 생겼다. 그 전 저장값에는 없으므로 빈 값으로 채운다.
    data.sessions ??= [];
    data.selectedFolderId ??= null;
    data.xpLedger ??= [];
    // 설명 기록(turns)과 점검 퀴즈(quiz)는 커밋 6·7에서 생겼다. 그 전 세션 기록에는 빈 값을 채운다.
    if (Array.isArray(data.sessions)) {
      data.sessions = data.sessions.map((s: Partial<StudySession>) => ({ turns: [], quiz: null, ...s }));
    }
    const validSessions =
      Array.isArray(data.sessions) &&
      data.sessions.every(isStudySession) &&
      (data.selectedFolderId === null || typeof data.selectedFolderId === 'string') &&
      ledgerEntrySchema.array().safeParse(data.xpLedger).success;
    if (!valid || !validSessions) {
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
  // QuackApi 교체 지점: 아래 값은 모두 profile, folders, character_stats, materials, sessions 조회 결과로 바뀐다.
  // selectedFolderId는 서버에 두지 않는 화면 상태라 QuackApi로 바꿔도 FE에 남는다.
  const [onboarded, setOnboarded] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [characterStats, setCharacterStats] = useState<CharacterStats[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [xpLedger, setXpLedger] = useState<XpLedgerEntry[]>([]);
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
      setFolders(saved.folders);
      setCharacterStats(saved.characterStats);
      setMaterials(saved.materials);
      setSelectedFolderId(saved.selectedFolderId);
      setSessions(saved.sessions);
      setXpLedger(saved.xpLedger);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    // 불러오기 전에 저장하면 빈 상태로 덮어쓰므로 불러온 뒤에만 저장한다. 서버 렌더링에서는 저장하지 않는다.
    if (!PERSIST_ON || !loaded || typeof window === 'undefined') {
      return;
    }
    const saved: Saved = {
      onboarded,
      displayName,
      folders,
      characterStats,
      materials,
      selectedFolderId,
      sessions,
      xpLedger,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // 저장 공간이 없거나 막혀 있으면 메모리 상태만 쓴다.
    }
  }, [loaded, onboarded, displayName, folders, characterStats, materials, selectedFolderId, sessions, xpLedger]);

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

  // DB는 폴더를 지우면 그 폴더의 자료, 세션, 경험치 지급 내역도 함께 지운다(on delete cascade). mock도 같게 맞춘다.
  function deleteFolder(id: string) {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setCharacterStats((prev) => prev.filter((c) => c.folder_id !== id));
    setMaterials((prev) => prev.filter((m) => m.folder_id !== id));
    setSessions((prev) => prev.filter((s) => s.folder_id !== id));
    setXpLedger((prev) => prev.filter((e) => e.folder_id !== id));
  }

  function addMaterial(material: Material) {
    setMaterials((prev) => [...prev, material]);
  }

  function setMaterialStatus(id: string, status: Material['status']) {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
  }

  function addSession(session: StudySession) {
    setSessions((prev) => [...prev, session]);
  }

  function updateSession(id: string, change: (s: StudySession) => StudySession) {
    setSessions((prev) => prev.map((s) => (s.id === id ? change(s) : s)));
  }

  // QuackApi 교체 지점: POST /sessions/:id/report 가 서버에서 지급한다(여러 번 호출해도 한 번만 지급).
  // 화면이 두 번 호출해도(개발 모드의 effect 두 번 실행 등) 한 줄만 쌓이도록 이전 값을 보고 판단한다.
  function grantReward(sessionId: string, folderId: string, xp: number) {
    const entry: XpLedgerEntry = {
      id: tempId(),
      user_id: TEMP_USER_ID,
      folder_id: folderId,
      amount: xp,
      reason: 'session_reward',
      session_id: sessionId,
      created_at: new Date().toISOString(),
    };
    setXpLedger((prev) => appendSessionReward(prev, entry));
  }

  // 저장해 두는 total_xp(처음 0)에 지급 내역을 더한다
  const statsWithXp = characterStats.map((c) => ({
    ...c,
    total_xp: c.total_xp + folderXp(xpLedger, c.folder_id),
  }));

  return (
    <TempStoreContext
      value={{
        onboarded,
        setOnboarded,
        displayName,
        setDisplayName,
        folders,
        characterStats: statsWithXp,
        xpLedger,
        grantReward,
        createFolder,
        deleteFolder,
        materials,
        addMaterial,
        setMaterialStatus,
        selectedFolder: folders.find((f) => f.id === selectedFolderId) ?? folders[0],
        setSelectedFolderId,
        sessions,
        addSession,
        addSessionTurn: (id, turn) => updateSession(id, (s) => ({ ...s, turns: [...s.turns, turn] })),
        setSessionQuiz: (id, quiz) => updateSession(id, (s) => ({ ...s, quiz })),
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
