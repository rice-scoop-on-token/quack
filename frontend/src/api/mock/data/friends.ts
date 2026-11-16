import { subjectNameOf } from '@/api/mock/data/catalog';
import type { TempFriend } from '@/api/tempContract';

const hours = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;

// 친구 mock. 실제 친구 기능은 서버가 정한다. 과목은 지원 과목 3개(카탈로그)뿐이고, subject는 늘 카탈로그에서 가져온다.
// 공부 중인 친구 7명이 방 5개에 1~3명씩 나뉘고, material-arch-2 방은 아무도 없다(빈 상태 시연).
function friend(f: Omit<TempFriend, 'subject'>): TempFriend {
  return { ...f, subject: subjectNameOf(f.material_id) };
}

export const FRIENDS: TempFriend[] = [
  friend({ id: 'friend-1', name: '민지', species_id: 'cat', stage: 'child', studying: true, material_id: 'material-ds-1', today_seconds: hours(6, 12, 5) }),
  friend({ id: 'friend-2', name: '준호', species_id: 'rubber_duck', stage: 'adult', studying: true, material_id: 'material-ds-1', today_seconds: hours(3, 41, 30) }),
  friend({ id: 'friend-3', name: '서연', species_id: 'raccoon', stage: 'baby', studying: false, material_id: 'material-ds-2', today_seconds: hours(2, 5) }),
  friend({ id: 'friend-4', name: '도윤', species_id: 'cat', stage: 'baby', studying: true, material_id: 'material-ds-2', today_seconds: hours(0, 25, 48) }),
  friend({ id: 'friend-5', name: '하은', species_id: 'rubber_duck', stage: 'child', studying: true, material_id: 'material-algo-1', today_seconds: hours(4, 3, 59) }),
  friend({ id: 'friend-6', name: '지후', species_id: 'raccoon', stage: 'adult', studying: false, material_id: 'material-algo-2', today_seconds: hours(5, 20, 11) }),
  friend({ id: 'friend-7', name: '수아', species_id: 'cat', stage: 'child', studying: true, material_id: 'material-algo-1', today_seconds: hours(0, 59, 58) }),
  friend({ id: 'friend-8', name: '태민', species_id: 'raccoon', stage: 'child', studying: true, material_id: 'material-algo-2', today_seconds: hours(1, 33, 20) }),
  friend({ id: 'friend-9', name: '유진', species_id: 'rubber_duck', stage: 'baby', studying: true, material_id: 'material-arch-1', today_seconds: hours(2, 47, 9) }),
];
