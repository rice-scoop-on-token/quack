import type { TempFriend } from '@/api/tempContract';

// 친구 mock. 실제 친구 기능은 서버가 정한다.
export const FRIENDS: TempFriend[] = [
  { id: 'friend-1', name: '민지', species_id: 'cat', stage: 'child', studying: true, subject: '네트워크', today_seconds: 6 * 60 * 60 + 12 * 60 + 5 },
  { id: 'friend-2', name: '준호', species_id: 'rubber_duck', stage: 'adult', studying: true, subject: '운영체제', today_seconds: 3 * 60 * 60 + 41 * 60 + 30 },
  { id: 'friend-3', name: '서연', species_id: 'raccoon', stage: 'baby', studying: false, subject: '자료구조', today_seconds: 2 * 60 * 60 + 5 * 60 },
  { id: 'friend-4', name: '도윤', species_id: 'cat', stage: 'baby', studying: true, subject: '영어 독해', today_seconds: 25 * 60 + 48 },
  { id: 'friend-5', name: '하은', species_id: 'rubber_duck', stage: 'child', studying: true, subject: '통계학', today_seconds: 4 * 60 * 60 + 3 * 60 + 59 },
  { id: 'friend-6', name: '지후', species_id: 'raccoon', stage: 'adult', studying: false, subject: '알고리즘', today_seconds: 5 * 60 * 60 + 20 * 60 + 11 },
  { id: 'friend-7', name: '수아', species_id: 'cat', stage: 'child', studying: true, subject: '회계원리', today_seconds: 59 * 60 + 58 },
];
