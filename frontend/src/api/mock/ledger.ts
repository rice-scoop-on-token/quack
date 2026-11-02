import type { XpLedgerEntry } from '@quack/shared';

import type { TempRewardGrant } from '@/api/tempContract';

// 경험치 지급 내역(ledger) mock 계산. 서버에서는 보상 지급 SQL 함수와 POST /sessions/:id/report 응답이 맡는다.

// 세션 보상 한 줄을 더한다. 이미 그 세션의 내역이 있으면 그대로 돌려준다(같은 세션은 한 번만 지급).
export function appendSessionReward(ledger: XpLedgerEntry[], entry: XpLedgerEntry): XpLedgerEntry[] {
  return ledger.some((e) => e.session_id === entry.session_id) ? ledger : [...ledger, entry];
}

// 과목(캐릭터)의 누적 경험치
export function folderXp(ledger: XpLedgerEntry[], folderId: string): number {
  return ledger.filter((e) => e.folder_id === folderId).reduce((sum, e) => sum + e.amount, 0);
}

// 지급 내역에서 이 세션의 지급 전후 경험치를 구한다. 아직 지급하지 않았으면 null
// 지급 전 경험치는 같은 과목에서 이 세션보다 먼저 쌓인 내역의 합이다.
export function rewardGrantFor(sessionId: string, ledger: XpLedgerEntry[]): TempRewardGrant | null {
  const index = ledger.findIndex((e) => e.session_id === sessionId);
  if (index < 0) {
    return null;
  }
  const entry = ledger[index];
  const before = folderXp(ledger.slice(0, index), entry.folder_id);
  return {
    session_id: sessionId,
    folder_id: entry.folder_id,
    xp: entry.amount,
    xp_before: before,
    xp_after: before + entry.amount,
  };
}
