import { CATALOG_MATERIALS, CATALOG_SUBJECTS } from '@/api/mock/data/catalog';
import type { TempFriend, TempRoom } from '@/api/tempContract';

// 마이크가 켜져 있는 친구. 데이터에 고정해서 같은 사람은 늘 같은 상태다.
// 도윤(ds-2 방)과 태민(algo-2 방)은 꺼져 있어서, 그 방은 말하는 사람이 없다.
const MIC_ON_IDS = new Set(['friend-1', 'friend-5', 'friend-9']);

// 카탈로그의 자료마다 방 하나를 만들고, 그 자료를 지금 공부 중인 친구를 참가자로 넣는다.
// 한계: 자료당 방 1개이고 정원이 차도 방을 나누지 않는다.
// 한계: 참가자가 0명인 방(material-arch-2)은 시연에서 빈 상태를 보이려고 둔 것이다. 실제 서비스에서는 방을 저장하지 않고 참가 기록에서 계산하므로, 내 자료의 방이 아니면 참가자가 0명인 방은 목록에 나오지 않는다.
export function buildRooms(friends: TempFriend[]): TempRoom[] {
  return CATALOG_MATERIALS.map((m) => ({
    id: `room-${m.id}`,
    subject_id: m.subject_id,
    subject_name: CATALOG_SUBJECTS.find((s) => s.id === m.subject_id)?.name ?? '',
    material_id: m.id,
    material_title: m.title,
    participants: friends
      .filter((f) => f.studying && f.material_id === m.id)
      .map((f) => ({
        id: f.id,
        name: f.name,
        species_id: f.species_id,
        stage: f.stage,
        mic_on: MIC_ON_IDS.has(f.id),
      })),
  }));
}
