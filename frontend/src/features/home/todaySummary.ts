import type { Folder } from '@quack/shared';

import type { StudySession } from '@/api/tempContract';

// 과목 색. DB에 색 칸이 없어서 FE에서 임시로 정한다. 디자인 작업 때 이 값만 바꾼다.
const SUBJECT_COLORS = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#b07aa1', '#edc948'];

// 과목 id로 색을 고른다. 과목 순서가 바뀌거나 다른 과목을 지워도 그 과목의 색은 그대로다.
// 한계: 과목이 많으면 두 과목이 같은 색일 수 있다. 그래서 범례에 이름과 시간을 같이 써서 구분한다. 색이 겹치면 안 된다면 folders에 색 칸을 둔다.
function subjectColor(folderId: string): string {
  let hash = 0;
  for (const ch of folderId) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_003;
  }
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

type SubjectShare = {
  folderId: string;
  name: string;
  seconds: number;
  color: string;
};

type TodaySummary = {
  totalSeconds: number;
  count: number;
  // 충분 판정을 받은 개념 수. 세션마다 서로 다른 개념만 센다(같은 개념을 여러 번 충분히 설명해도 1개).
  conceptCount: number;
  // 공부 시간이 많은 과목부터
  bySubject: SubjectShare[];
};

// 세션에서 충분 판정을 받은 서로 다른 개념
function understoodConcepts(session: StudySession): string[] {
  return [...new Set(session.turns.filter((t) => t.analysis.verdict === 'sufficient').map((t) => t.analysis.concept))];
}

// 오늘(기기 시간 기준) 끝낸 세션의 공부 시간 합, 세션 수, 설명한 개념 수, 과목별 시간
export function summarizeToday(sessions: StudySession[], folders: Folder[], now: Date): TodaySummary {
  const today = now.toDateString();
  const todays = sessions.filter((s) => s.ended_at && new Date(s.ended_at).toDateString() === today);

  const seconds = new Map<string, number>();
  for (const s of todays) {
    seconds.set(s.folder_id, (seconds.get(s.folder_id) ?? 0) + s.study_seconds);
  }
  const bySubject = folders
    .filter((f) => seconds.has(f.id))
    .map((f) => ({ folderId: f.id, name: f.name, seconds: seconds.get(f.id)!, color: subjectColor(f.id) }))
    .sort((a, b) => b.seconds - a.seconds);

  return {
    totalSeconds: todays.reduce((sum, s) => sum + s.study_seconds, 0),
    count: todays.length,
    conceptCount: todays.reduce((sum, s) => sum + understoodConcepts(s).length, 0),
    bySubject,
  };
}
