import type { StudySession } from '@/api/tempContract';
import { dayKey, groupByDay } from '@/features/records/recordSummary';

// 연속 공부 일수. 순수 함수만 둔다(일회용 스크립트로 입력값-기대값을 확인하기 위해서다).
// "공부한 날"은 학습 달력과 같은 기준이다: 끝낸 세션(ended_at 있음)이 있는 날, 기기 시간.
// 한계: 0분이나 설명 0회로 끝낸 세션도 공부한 날로 센다. 설명 0회 세션을 기록에서 뺄지는 #24에서 팀이 정한다.
// 한계: 자정을 넘겨 끝난 세션은 끝난 날로 센다. 시작한 날로 세려면 started_at을 써야 한다.

// 오늘부터 하루씩 거슬러 올라가며 공부한 날이 이어진 길이.
// 오늘 아직 공부 전이면 어제부터 센다(하루가 끝나기 전에는 끊긴 것으로 보지 않는다).
export function studyStreak(sessions: StudySession[], now: Date): number {
  const days = groupByDay(sessions);
  // 밀리초를 빼지 않고 날짜를 옮겨서 월·해 경계와 서머타임에 흔들리지 않는다
  const keyAt = (back: number) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back));
  const start = days.has(keyAt(0)) ? 0 : 1;
  let count = 0;
  while (days.has(keyAt(start + count))) {
    count++;
  }
  return count;
}
