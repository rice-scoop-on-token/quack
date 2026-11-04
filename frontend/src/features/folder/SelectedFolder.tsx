import type { Folder } from '@quack/shared';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { useApiQuery } from '@/api';

// 홈과 공부 준비, 과목 상세가 같이 쓰는 "지금 고른 과목". 서버에 두지 않는 화면 상태라 QuackApi에 넣지 않는다.
// 웹에서는 새로고침해도 남도록 localStorage에 둔다.
const STORAGE_KEY = 'quack.selectedFolderId';

function loadId(): string | null {
  if (Platform.OS !== 'web') {
    return null;
  }
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const SelectedFolderContext = createContext<{ id: string | null; select: (id: string) => void } | null>(null);

export function SelectedFolderProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState(loadId);

  useEffect(() => {
    if (Platform.OS !== 'web' || id === null) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // 저장 공간이 없거나 막혀 있으면 메모리 상태만 쓴다.
    }
  }, [id]);

  return <SelectedFolderContext value={{ id, select: setId }}>{children}</SelectedFolderContext>;
}

// 고른 적이 없거나 지워졌으면 첫 과목, 과목이 없으면 undefined. folders가 undefined면 불러오는 중이다.
export function useSelectedFolder(): {
  folders: Folder[] | undefined;
  selected: Folder | undefined;
  select: (id: string) => void;
} {
  const value = useContext(SelectedFolderContext);
  if (!value) {
    throw new Error('SelectedFolderProvider 안에서만 쓸 수 있다.');
  }
  const folders = useApiQuery((api) => api.listFolders(), []) ?? undefined;
  return {
    folders,
    selected: folders?.find((f) => f.id === value.id) ?? folders?.[0],
    select: value.select,
  };
}
