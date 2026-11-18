// 스플래시("돋보기 Q" 시안)의 문구·색·치수·시간표를 한 곳에 모은다. 값은 여기서만 고친다.
// 시안: quack_splash.html. 시안의 시간표(t=0~10.6초)를 그대로 쓰고, 재생 속도만 아래 SPLASH_TIME에서 조절한다.
// 이 파일은 순수 값만 둔다(Node 일회용 스크립트로 시안과 비교할 수 있게 하기 위해서다).

// 임시 문구
export const SPLASH_TAGLINE = '설명하며 배우는 공부 친구';
export const SPLASH_LOADING = '불러오는 중';
export const SPLASH_DELAY = {
  title: '연결이 오래 걸려요',
  message: '잠시만 기다려 주세요.',
};
export const SPLASH_SKIP_LABEL = '스플래시 건너뛰기';

// 글자 "uack"과 진행률 숫자에 쓰는 픽셀 글꼴(assets/splash/QuackPixel.ttf)
export const SPLASH_FONT = 'QuackPixel';
// 한계: 글꼴 불러오기를 이 시간(초)만 기다린다. 넘으면 시스템 글꼴로 그린다. 값은 임시다.
export const SPLASH_FONT_WAIT = 1.5;

// 시안 CSS 변수(--paper, --grid, --yel, --org, --brown, --ink, --cream)와 같은 값이다.
// 앱 공용 토큰(theme)을 쓰지 않고 여기에 직접 둔다. 앱 토큰이 바뀌어도 스플래시 색이 달라지지 않게 하기 위해서다.
export const SPLASH_COLORS = {
  background: '#F7EFD8',
  grid: '#EFE2BF',
  yellow: '#FBBE1C',
  orange: '#E98A3A',
  brown: '#481D0B',
  ink: '#3B2A1A',
  card: '#FFFBF0',
  sub: '#7A6350',
} as const;

// 시안의 단단한 그림자(box-shadow: 0 Npx 0 var(--brown)). 앱의 hardShadow는 외곽선색이 달라서 쓰지 않는다.
export const splashShadow = (offset: number) => ({ boxShadow: `0px ${offset}px 0px ${SPLASH_COLORS.brown}` }) as const;

// 돋보기 그림(splash-full, 720×720 정사각형)은 Q 둘레에 여백이 있다. 시안의 아이콘 박스(높이 268)에 Q 외곽을 맞추려고
// 외곽(알파 기준) x 80~671, y 24~703의 높이를 268dp로 놓는 배율 k를 구한다. 그림 한 장은 한 변 canvas(약 283.7dp)다.
const ICON_BBOX = { x: 80, y: 24, w: 592, h: 680 };
const ICON_K = 268 / ICON_BBOX.h;
export const SPLASH_ICON = {
  canvas: 720 * ICON_K,
  // 그림 왼쪽 위에서 Q 외곽 왼쪽 위까지
  offsetX: ICON_BBOX.x * ICON_K,
  offsetY: ICON_BBOX.y * ICON_K,
  // Q 외곽 크기(시안의 230×268에 해당)
  width: ICON_BBOX.w * ICON_K,
  height: 268,
} as const;

// 앱 성체 오리 그림(512×512)에서 오리 몸이 차지하는 영역(알파 기준 x 112~399, y 46~503 = 288×458).
// 시안의 병아리(288×458)와 크기가 같아서, 몸이 44×70 칸을 채우도록 그림을 그린다.
const DUCK_BODY = { canvas: 512, x: 112, y: 46, h: 458 };
const DUCK_K = 70 / DUCK_BODY.h;
export const SPLASH_DUCK_ART = {
  size: DUCK_BODY.canvas * DUCK_K,
  left: -DUCK_BODY.x * DUCK_K,
  // 발(몸 아래 끝)이 칸 바닥에 닿게 한다
  bottom: -(DUCK_BODY.canvas - (DUCK_BODY.y + DUCK_BODY.h)) * DUCK_K,
} as const;

export const SPLASH_SIZE = {
  grid: 26,
  // 돋보기 아이콘 박스(시안 230×268에 해당). 이 크기의 비율로 날아가는 위치를 계산한다.
  icon: { width: SPLASH_ICON.width, height: SPLASH_ICON.height },
  // 아이콘이 최종적으로 앉는 Q 자리
  slot: { width: 96, height: 112 },
  title: { height: 112, letterSize: 92, letterSpacing: 1, wordGap: 4, wordPadBottom: 4 },
  tagGap: 22,
  // 진행 막대와 오리 칸(시안 .row)
  row: { width: 284, height: 96, marginTop: 40 },
  bar: { height: 32, tickFrom: 26, tickEvery: 28, tickCount: 10 },
  duck: { width: 44, height: 70, bottom: 30, shadowLeft: 4, shadowBottom: 34, shadowWidth: 36, shadowHeight: 6 },
  loadMarginTop: 14,
  curtainBorder: 4,
  star: 6,
} as const;

// 시안에서 오리가 막대 끝까지 가는 거리 보정(시안 travel = 막대폭 - 오리폭 + 6)
export const SPLASH_DUCK_TRAVEL_EXTRA = 6;

// 시안의 반짝임(버스트) 8개: [가로 이동, 세로 이동, 색]. 도착 순간 로고 위로 퍼진다.
export const SPLASH_BURSTS = [
  [-150, -60, '#E98A3A'],
  [150, -70, '#FBBE1C'],
  [-110, -130, '#481D0B'],
  [110, -140, '#E98A3A'],
  [-60, -170, '#FBBE1C'],
  [60, -175, '#481D0B'],
  [-170, 10, '#FBBE1C'],
  [170, 0, '#E98A3A'],
] as const;

// 배경의 별 9개: [왼쪽 %, 위쪽 %, 노랑이면 true, 시작 지연(초)]
export const SPLASH_STARS = [
  [10, 8, false, 0],
  [88, 12, true, 0.5],
  [16, 30, false, 1.1],
  [84, 34, false, 0.3],
  [8, 62, true, 0.8],
  [92, 70, false, 1.4],
  [24, 90, false, 0.2],
  [76, 88, true, 0.9],
  [50, 5, false, 0.6],
] as const;
// 별이 한 번 깜빡이는 시간(초)
export const SPLASH_STAR_PERIOD = 2.2;

// 시간표(초). 시안의 t(0~10.6)가 기준이고, 아래 속도로 t를 흘려보낸다.
export const SPLASH_TIME = {
  end: 10.6,
  // 앞 구간: [끝 t, 재생 속도]. 두리번 구간(1.1~4.5)만 1.5배속이다.
  intro: [
    [1.1, 1],
    [4.5, 1.5],
    [6.2, 1],
  ],
  // 오리가 막대를 채우는 구간. 준비가 이미 됐으면 2배속이다.
  loadFrom: 6.2,
  loadEnd: 9.2,
  loadFastSpeed: 2,
  // 준비가 늦으면 여기(막대 약 64%)에서 멈추고 오리가 제자리에서 폴짝인다
  holdAt: 8.2,
  // 시안에서 오리 폴짝은 막대 구간에 9번이다
  hops: 9,
  // 도착 점프와 막 덮임
  finish: [
    [10.0, 1],
    [10.6, 1],
  ],
  // 준비가 이 시간(초)을 넘기면 지연 안내를 보여 준다
  delayAfter: 8,
  // 한계: 데모 확인용 자동 해제. ?splash=slow(준비 안 됨 강제)는 지연 안내가 뜬 뒤 이 시간이 지나면 풀린다.
  slowRelease: 3,
  // 동작 줄이기: 최종 장면(t)을 그대로 두고 막대만 이 시간(초) 동안 채운다
  reduceFrame: 10.0,
  calmFill: 0.6,
} as const;
