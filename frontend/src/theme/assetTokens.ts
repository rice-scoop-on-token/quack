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

// 퀴즈 정답·오답 칸과 녹음 버튼 표시용. 기존 토큰에 없는 의미라서 채도를 낮춰 따로 둔다.
// 정답·오답은 색만으로 알리지 않고 글자(정답, 내 답)도 함께 쓴다.
export const FEEDBACK = {
  positive: '#CFE3B5',
  negative: '#F2C4B4',
  record: '#D64545',
} as const;

// 종이 UI 공용 표면 스타일. 카드(테두리 2, 모서리 14, 하드 그림자 3), 입력창, 고르는 칸이 같은 값을 쓴다.
export const PAPER = {
  card: {
    paddingVertical: SIZES.card.paddingVertical,
    paddingHorizontal: SIZES.card.paddingHorizontal,
    borderWidth: SIZES.card.border,
    borderColor: COLORS.outline,
    borderRadius: SIZES.card.radius,
    backgroundColor: COLORS.card,
    // 그림자 자리를 아래에 비워 둔다
    marginBottom: SIZES.card.shadow,
    ...hardShadow(SIZES.card.shadow),
  },
  input: {
    minHeight: SIZES.touchMin,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: SIZES.row.border,
    borderColor: COLORS.outline,
    borderRadius: SIZES.row.radius,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    ...FONT.body,
  },
  // 고르는 칸(보기, 탭, 길이 선택 등). 고른 칸은 주요색, 정답·오답은 FEEDBACK 색으로 칠한다.
  option: {
    minHeight: SIZES.touchMin,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: SIZES.row.border,
    borderColor: COLORS.outline,
    borderRadius: SIZES.row.radius,
    backgroundColor: COLORS.card,
  },
} as const;
