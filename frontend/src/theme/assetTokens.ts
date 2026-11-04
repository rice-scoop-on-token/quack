// 에셋 적용 화면(홈, 공부, 하단 탭 바, 과목 상세)이 쓰는 색·치수 토큰. 값은 이 한 곳에서만 고친다.
// 낮과 밤은 배경 이미지만 바뀌고 UI 색은 같다(밤에도 크림 종이 UI). 탭 아이콘 외곽선이 갈색이라 어두운 바탕에서 묻히기 때문이다.
// 시스템 다크 모드를 따르지 않도록 글자·배경 색을 모두 여기 값으로 지정한다.

export const COLORS = {
  screen: '#F7EFD8',
  card: '#FFFBF0',
  text: '#3B2A1A',
  textSub: '#7A6350',
  outline: '#4B3226',
  primary: '#F6C94F',
  accent: '#E98A3A',
  cream: '#F2DDB6',
  disabledBg: '#E9DFC6',
} as const;

export const SIZES = {
  button: { height: 52, radius: 12, border: 2, shadow: 3 },
  buttonSmall: { height: 40, radius: 10, border: 2, shadow: 2 },
  card: { radius: 14, border: 2, paddingVertical: 14, paddingHorizontal: 16, shadow: 3 },
  row: { height: 56, radius: 12, border: 2, gap: 8 },
  gutter: 16,
  sectionGap: 24,
  cardGap: 16,
  touchMin: 44,
} as const;

export const FONT = {
  title: { fontSize: 20, fontWeight: '700' },
  button: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '500' },
  tabLabel: { fontSize: 11, fontWeight: '500' },
} as const;

// 번지지 않는 단단한 그림자(blur 0). 눌렸을 때는 그림자를 빼고 버튼을 그만큼 내린다.
export const hardShadow = (offset: number) => ({ boxShadow: `0px ${offset}px 0px ${COLORS.outline}` }) as const;
