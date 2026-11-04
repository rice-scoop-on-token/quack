import { useApiQuery } from '@/api';

// 과목(캐릭터)의 누적 경험치. 불러오는 중이면 undefined
export function useCharacterXp(folderId: string): number | undefined {
  const stats = useApiQuery((api) => api.listCharacterStats(), []);
  if (stats === undefined) {
    return undefined;
  }
  return stats?.find((c) => c.folder_id === folderId)?.total_xp ?? 0;
}
