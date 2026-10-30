import { createContext, useContext, useState, type ReactNode } from 'react';

// QuackApi가 생기기 전까지 화면끼리 함께 쓰는 임시 상태다.
// 메모리에만 있으므로 새로고침하면 처음 상태로 돌아간다.
type TempStore = {
  onboarded: boolean;
  setOnboarded: (value: boolean) => void;
};

const TempStoreContext = createContext<TempStore | null>(null);

export function TempStoreProvider({ children }: { children: ReactNode }) {
  const [onboarded, setOnboarded] = useState(false);

  return <TempStoreContext value={{ onboarded, setOnboarded }}>{children}</TempStoreContext>;
}

export function useTempStore(): TempStore {
  const store = useContext(TempStoreContext);
  if (!store) {
    throw new Error('TempStoreProvider 안에서만 쓸 수 있다.');
  }
  return store;
}
