import type { Folder, Material } from '@quack/shared';

import type { TempRoom } from '@/api/tempContract';

// 내 폴더·자료와 통화방을 이어 주는 순수 함수들.
// 한계: 사용자 간에 같은 과목·자료를 식별하는 공통 id가 없어서 이름으로 비교한다(폴더 이름 = 방의 과목 이름,
// 자료 제목 = 방의 자료 제목). 서버가 공통 id로 이어야 하고, 이름이 조금만 달라도 내 방으로 잡히지 않는다.

// 방 과목과 이름이 같은 내 폴더. 없으면 undefined.
// 예) 폴더 [{name:'자료구조'}], 방 {subject_name:'자료구조'} → 그 폴더 / 방 {subject_name:'알고리즘'} → undefined
export function findMyFolder(room: TempRoom, folders: Folder[]): Folder | undefined {
  return folders.find((f) => f.name === room.subject_name);
}

// 그 자료를 읽기 마친(ready) 내 자료가 있는 방의 id 모음("내 방").
// 예) 폴더 '자료구조' + ready 자료 '스택과 큐 정리.pdf' → {'room-material-ds-1'}
//     같은 자료가 processing이거나 제목이 '스택과 큐 정리 (복사).pdf'면 → 빈 모음
export function myRoomIds(rooms: TempRoom[], folders: Folder[], materials: Material[]): Set<string> {
  const mine = new Set<string>();
  for (const room of rooms) {
    const folder = findMyFolder(room, folders);
    if (folder && materials.some((m) => m.folder_id === folder.id && m.status === 'ready' && m.title === room.material_title)) {
      mine.add(room.id);
    }
  }
  return mine;
}

// 과목 상세 자료 탭에서 그 자료와 같은 방. 읽기 마친 자료만 찾고, 없으면 undefined.
// 예) 폴더 '자료구조', ready 자료 '트리 순회 노트.pdf' → room-material-ds-2 / 제목이 카탈로그에 없으면 → undefined
export function roomForMaterial(rooms: TempRoom[], folder: Folder, material: Material): TempRoom | undefined {
  if (material.status !== 'ready') {
    return undefined;
  }
  return rooms.find((r) => r.subject_name === folder.name && r.material_title === material.title);
}
