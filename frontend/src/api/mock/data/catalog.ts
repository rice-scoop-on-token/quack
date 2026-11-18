import type { TempCatalogMaterial, TempCatalogSubject } from '@/api/tempContract';

// 지원 과목 3개(팀 합의)와 과목마다 자료 2개. 실제 카탈로그는 서버가 정한다(shared 반영 전 임시).
export const CATALOG_SUBJECTS: TempCatalogSubject[] = [
  { id: 'subject-ds', name: '자료구조' },
  { id: 'subject-algo', name: '알고리즘' },
  { id: 'subject-arch', name: '컴퓨터구조' },
];

// 과목 선택 칸에 보여 주는 한 줄 설명
export const SUBJECT_HINTS: Record<string, string> = {
  자료구조: '스택, 큐, 연결 리스트, 트리, 해시',
  알고리즘: '정렬, 탐색, 재귀, 시간 복잡도',
  컴퓨터구조: '캐시, 메모리, 파이프라인, 명령어',
};

export const CATALOG_MATERIALS: TempCatalogMaterial[] = [
  { id: 'material-ds-1', subject_id: 'subject-ds', title: '스택과 큐 정리.pdf' },
  { id: 'material-ds-2', subject_id: 'subject-ds', title: '트리 순회 노트.pdf' },
  { id: 'material-algo-1', subject_id: 'subject-algo', title: '정렬 알고리즘 비교.pdf' },
  { id: 'material-algo-2', subject_id: 'subject-algo', title: '그래프 탐색 정리.pdf' },
  { id: 'material-arch-1', subject_id: 'subject-arch', title: '캐시와 메모리 계층.pdf' },
  { id: 'material-arch-2', subject_id: 'subject-arch', title: '파이프라인과 해저드.pdf' },
];

export function subjectNameOf(materialId: string): string {
  const material = CATALOG_MATERIALS.find((m) => m.id === materialId);
  return CATALOG_SUBJECTS.find((s) => s.id === material?.subject_id)?.name ?? '';
}

// 업로드할 샘플 자료 제목. 폴더 이름이 카탈로그 과목과 같으면 그 과목의 자료 제목을 아직 안 쓴 순서대로 쓰고,
// 다 썼거나 카탈로그 과목이 아니면 샘플자료_N.pdf로 돌아간다. 같은 제목이 두 번 나오지 않는다(내 방 매칭이 겹치지 않게).
export function nextSampleTitle(folderName: string, usedTitles: string[]): string {
  const subject = CATALOG_SUBJECTS.find((s) => s.name === folderName);
  const unused = CATALOG_MATERIALS.find((m) => m.subject_id === subject?.id && !usedTitles.includes(m.title));
  return unused?.title ?? `샘플자료_${usedTitles.length + 1}.pdf`;
}
