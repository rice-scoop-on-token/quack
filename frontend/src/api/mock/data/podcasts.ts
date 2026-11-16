import { contentFor } from '@/api/mock/data/subjectContent';

// 팟캐스트 대화 문구. 실제 내용은 서버(AI)가 자료로 만든다. 시연에서는 자료 제목과 그 폴더 과목의 설명 두 줄만 넣는다.
// 지원 과목 밖 폴더는 자료구조 설명이다(data/subjectContent.ts).
export function mockPodcastLines(title: string, folderName: string | undefined): string[] {
  const [overview, example] = contentFor(folderName).podcastLines;
  return [
    `안녕! 오늘은 '${title}' 이야기를 같이 들어 볼 거야.`,
    overview,
    '중요한 개념은 예시와 함께 기억하면 훨씬 오래 가.',
    '여기서 잠깐, 지금까지 들은 내용을 떠올려 볼까?',
    example,
    '마지막으로 오늘 들은 내용을 네 말로 다시 설명해 보면 좋아.',
  ];
}
