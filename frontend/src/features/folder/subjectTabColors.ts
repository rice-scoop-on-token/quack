// 파일철 종이(패널) 색과, 뒤에 꽂힌 탭의 한 톤 어두운 색. 색은 여기 한 곳에서 고친다.
// 글자색은 모든 종이에서 대비 9:1 이상이다.
export const TAB_COLORS = {
  info: { paper: '#FCE8B2', back: '#E8D096' },
  materials: { paper: '#F9D5B5', back: '#E4BE98' },
  study: { paper: '#F4C2B0', back: '#DFA894' },
  quiz: { paper: '#EBDDA8', back: '#D5C68C' },
  podcast: { paper: '#E6CDBE', back: '#CFB4A3' },
};

export type SubjectTabId = keyof typeof TAB_COLORS;
