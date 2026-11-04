import type { StudySession } from '@/api/tempContract';

// 학습 달력(R-01)과 학습 분석(R-02)의 집계. 새 API 없이 listSessions 결과를 앱에서 센다.
// 이 파일은 값 import 없이 순수 함수만 둔다(일회용 스크립트로 입력값-기대값을 확인하기 위해서다).

export const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

export type PeriodKind = 'week' | 'month';

// 날짜 칸 키(기기 시간 기준) 'YYYY-MM-DD'
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 월요일 0 ~ 일요일 6
const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

// 끝낸 세션만. 진행 중이거나 기록 없이 나간 세션(ended_at 없음)은 뺀다.
export const endedSessions = (sessions: StudySession[]) => sessions.filter((s) => s.ended_at);

// 한 번이라도 충분 판정을 받은 서로 다른 개념(features/review/report.ts의 understoodConcepts와 같은 기준)
function understood(s: StudySession): string[] {
  return [...new Set(s.turns.filter((t) => t.analysis.verdict === 'sufficient').map((t) => t.analysis.concept))];
}

export function groupByDay(sessions: StudySession[]): Map<string, StudySession[]> {
  const map = new Map<string, StudySession[]>();
  for (const s of endedSessions(sessions)) {
    const key = dayKey(new Date(s.ended_at!));
    map.set(key, [...(map.get(key) ?? []), s]);
  }
  return map;
}

// 이번 달 요약: 공부한 날 수, 공부 시간(초), 설명한 개념 수(세션마다 서로 다른 개념의 합)
export function monthSummary(sessions: StudySession[], year: number, month: number) {
  const inMonth = endedSessions(sessions).filter((s) => {
    const d = new Date(s.ended_at!);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  return {
    days: new Set(inMonth.map((s) => dayKey(new Date(s.ended_at!)))).size,
    seconds: inMonth.reduce((sum, s) => sum + s.study_seconds, 0),
    concepts: inMonth.reduce((sum, s) => sum + understood(s).length, 0),
  };
}

// 월요일 시작 달력 칸. 달이 바뀌어도 높이가 변하지 않도록 늘 6주(42칸)로 만들고, 달 밖 칸은 null이다.
export function calendarCells(year: number, month: number): (number | null)[] {
  const offset = weekdayIndex(new Date(year, month, 1));
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(42).fill(null);
  for (let d = 1; d <= days; d++) {
    cells[offset + d - 1] = d;
  }
  return cells;
}

// 기간의 [start, end). back=1이면 바로 앞 기간(지난주, 지난달). 주는 월요일에 시작한다.
export function periodRange(kind: PeriodKind, now: Date, back = 0): { start: Date; end: Date } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  if (kind === 'week') {
    const monday = d - weekdayIndex(now) - 7 * back;
    return { start: new Date(y, m, monday), end: new Date(y, m, monday + 7) };
  }
  return { start: new Date(y, m - back, 1), end: new Date(y, m - back + 1, 1) };
}

export function inRange(sessions: StudySession[], range: { start: Date; end: Date }): StudySession[] {
  return endedSessions(sessions).filter((s) => {
    const t = new Date(s.ended_at!).getTime();
    return t >= range.start.getTime() && t < range.end.getTime();
  });
}

// 막대 그래프 칸: 이번 주는 월~일 7칸, 이번 달은 1~5주 5칸(1~7일이 1주)
export function periodBars(sessions: StudySession[], kind: PeriodKind, now: Date) {
  const bars =
    kind === 'week'
      ? DAY_NAMES.map((label) => ({ label, seconds: 0 }))
      : [1, 2, 3, 4, 5].map((n) => ({ label: `${n}주`, seconds: 0 }));
  for (const s of inRange(sessions, periodRange(kind, now))) {
    const d = new Date(s.ended_at!);
    const i = kind === 'week' ? weekdayIndex(d) : Math.min(4, Math.floor((d.getDate() - 1) / 7));
    bars[i].seconds += s.study_seconds;
  }
  return bars;
}

// 지난 기간 대비 변화율(%). 지난 기간 기록이 없으면 null
export function percentChange(current: number, previous: number): number | null {
  return previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
}

export type WeakConcept = { concept: string; folder_id: string; count: number };

// 보완할 개념: 세션마다 다룬 개념 중 충분 판정을 받지 못한 것. 여러 세션에서 부족했을수록 앞에 둔다.
// folder_id는 그 개념을 가장 최근에 공부한 과목이다.
export function weakConcepts(sessions: StudySession[]): WeakConcept[] {
  const map = new Map<string, WeakConcept>();
  const oldestFirst = [...endedSessions(sessions)].sort((a, b) => a.ended_at!.localeCompare(b.ended_at!));
  for (const s of oldestFirst) {
    const ok = understood(s);
    for (const concept of new Set(s.turns.map((t) => t.analysis.concept))) {
      if (ok.includes(concept)) {
        continue;
      }
      const prev = map.get(concept);
      map.set(concept, { concept, folder_id: s.folder_id, count: (prev?.count ?? 0) + 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export const recommendedGoal = (concept: string) => `'${concept}' 개념을 내 말로 설명하기`;
