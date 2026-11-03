import type { Species } from '@quack/shared';

// DB 기본 데이터(migrations/..._seed_species.sql)와 같은 id·이름이다.
// DB의 description은 아직 비어 있어서 프로토타입 문구를 임시로 넣었다.
export const SPECIES: Species[] = [
  {
    id: 'rubber_duck',
    name: '러버덕',
    persona_key: 'rubber_duck',
    description: '다정하게 듣고, 차근차근 물어봐요.',
  },
  {
    id: 'raccoon',
    name: '너구리',
    persona_key: 'raccoon',
    description: '예시를 함께 찾는 꼼꼼한 탐험가.',
  },
  {
    id: 'cat',
    name: '고양이',
    persona_key: 'cat',
    description: '핵심을 콕 집는 호기심 많은 친구.',
  },
];
