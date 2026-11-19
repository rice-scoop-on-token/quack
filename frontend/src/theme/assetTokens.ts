// 에셋 적용 화면(홈, 공부, 하단 탭 바, 과목 상세)이 쓰는 색·치수 토큰. 값은 이 한 곳에서만 고친다.
// 낮과 밤은 배경 이미지만 바뀌고 UI 색은 같다(밤에도 크림 종이 UI). 탭 아이콘 외곽선이 갈색이라 어두운 바탕에서 묻히기 때문이다.
// 시스템 다크 모드를 따르지 않도록 글자·배경 색을 모두 여기 값으로 지정한다.

import { Platform } from 'react-native';

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
  // 글자용 주황. 주황 accent는 면·테두리에만 쓰고 글자에는 쓰지 않는다.
  textAccent: '#A4540F',
  danger: '#A3321F',
  dangerBg: '#F8DDD3',
  noticeBg: '#FFF1CC',
  successBg: '#E3EFC9',
  inputBg: '#FFFFFF',
  // 12px 이하 작은 보조 글자와 비활성 글자용. textSub보다 진하다.
  mutedStrong: '#6B5846',
} as const;

// 모서리 둥글기는 이 3단계만 쓴다. 작은 버튼·태그 10, 버튼·입력·고르는 칸 12, 카드·패널 14.
// 예외(의도): 체크칸 6, 진행 막대 7(높이의 절반), FolderCard 본체 6(에셋의 계단식 모서리에 맞춤).
export const RADIUS = { small: 10, medium: 12, large: 14 } as const;

export const SIZES = {
  button: { height: 52, radius: RADIUS.medium, border: 2, shadow: 3 },
  buttonSmall: { height: 40, radius: RADIUS.small, border: 2, shadow: 2 },
  card: { radius: RADIUS.large, border: 2, paddingVertical: 14, paddingHorizontal: 16, shadow: 3 },
  row: { height: 56, radius: RADIUS.medium, border: 2, gap: 8 },
  gutter: 16,
  sectionGap: 24,
  cardGap: 16,
  touchMin: 44,
} as const;

// 갈무리 픽셀 글꼴. 격자의 정수 배 크기로만 써야 번지지 않는다.
// - Galmuri11 Bold(굵은 글꼴): 12px 격자라 12, 24, 36, 48만 쓴다. 제목·버튼·강조·캡션.
// - Galmuri14(보통 굵기): 15px 격자라 15, 30만 쓴다. 본문.
// 굵기가 한 가지씩뿐이라 fontWeight는 항상 'normal'이다(굵게 보이게 하려면 700 대신 Bold 글꼴 토큰을 쓴다. 가짜 볼드 방지).
// 글꼴은 루트 레이아웃(useAppFonts)에서 불러온다. 이 이름으로 등록한다.
export const FONT_FACE = { bold: 'Galmuri11Bold', regular: 'Galmuri14' } as const;
// 웹은 불러오기 전·실패 시 브라우저 기본 글꼴(serif)로 떨어지지 않게 시스템 글꼴을 뒤에 붙인다.
const family = (face: string) => (Platform.OS === 'web' ? `${face}, system-ui, sans-serif` : face);
const BOLD = { fontFamily: family(FONT_FACE.bold), fontWeight: 'normal' } as const;
const REGULAR = { fontFamily: family(FONT_FACE.regular), fontWeight: 'normal' } as const;

// 한계: 글꼴을 못 불러오면 시스템 글꼴로 그려진다. 이때 크기는 그대로라 줄바꿈 위치가 조금 달라질 수 있다.
// 한계: 갈무리에 없는 글자(이모지 등)는 시스템 글꼴로 대체된다. 지금 UI에는 이모지가 없다.
export const FONT = {
  display: { ...BOLD, fontSize: 48 },
  title: { ...BOLD, fontSize: 24 },
  heading: { ...BOLD, fontSize: 12 },
  button: { ...BOLD, fontSize: 12 },
  body: { ...REGULAR, fontSize: 15 },
  caption: { ...BOLD, fontSize: 12 },
  tabLabel: { ...BOLD, fontSize: 12 },
} as const;

// 번지지 않는 단단한 그림자(blur 0). 눌렸을 때는 그림자를 빼고 버튼을 그만큼 내린다.
export const hardShadow = (offset: number) => ({ boxShadow: `0px ${offset}px 0px ${COLORS.outline}` }) as const;

// 퀴즈 정답·오답 칸과 녹음 버튼 표시용. 기존 토큰에 없는 의미라서 채도를 낮춰 따로 둔다.
// 정답·오답은 색만으로 알리지 않고 글자(정답, 내 답)도 함께 쓴다.
export const FEEDBACK = {
  positive: '#CFE3B5',
  negative: '#F2C4B4',
  record: '#D64545',
  // 통화방에서 말하는 사람의 링 색. 주황 강조색을 그대로 쓴다.
  speaking: COLORS.accent,
} as const;

// 성장 연출(GrowthEffect) 색. 어두운 막 위에 노란 빛을 겹쳐 그린다.
export const GROWTH = {
  dim: 'rgba(26,16,10,0.72)',
  // 빛 테두리 3겹(바깥 → 안쪽). 안쪽일수록 진하다.
  glow: ['rgba(246,201,79,0.16)', 'rgba(246,201,79,0.26)', 'rgba(246,201,79,0.40)'],
  flash: '#FFF6D6',
  spark: ['#F6C94F', '#FFFBF0'],
  burst: '#F6C94F',
  text: '#FFFBF0',
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
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: SIZES.row.border,
    borderColor: COLORS.outline,
    borderRadius: SIZES.row.radius,
    backgroundColor: COLORS.inputBg,
    color: COLORS.text,
    // 위쪽 안쪽 그림자로 살짝 파인 느낌을 준다
    // 한계: 안드로이드 9 미만에서는 box-shadow가 그려지지 않는다. 테두리와 색은 그대로라 쓰는 데는 문제없다.
    boxShadow: 'inset 0px 2px 0px rgba(75,50,38,0.12)',
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
