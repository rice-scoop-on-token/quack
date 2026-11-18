import type { Folder } from '@quack/shared';

import { TEMP_USER_ID } from '@/api/mock/ids';
import type { StudySession } from '@/api/tempContract';

// ?demo=streak(오늘·어제·그제 → 3일째), ?demo=streak-broken(그제·3일 전까지만 → 0일째 카드 확인용).
// 홈의 연속 공부 확인용이라 turns는 비워 둔다. listSessions가 이 값만 돌려준다.
export function demoStreakSessions(folders: Pick<Folder, 'id'>[], now: Date, daysBack: number[]): StudySession[] {
  if (folders.length === 0) {
    return [];
  }
  return daysBack.map((back) => {
    const ended = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back, 12, 0).toISOString();
    return {
      id: `00000000-0000-4000-8000-0000000005${String(back).padStart(2, '0')}`,
      user_id: TEMP_USER_ID,
      folder_id: folders[0].id,
      goal: '연속 공부 확인용 기록',
      status: 'reported',
      started_at: ended,
      ended_at: ended,
      study_seconds: 20 * 60,
      turns: [],
      quiz: null,
    };
  });
}
