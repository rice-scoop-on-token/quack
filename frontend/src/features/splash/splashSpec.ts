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

// 돋보기 그림(splash-frame/glass/full)은 512×512이고 Q 둘레에 여백이 있다. Q 외곽(알파 기준 x 64~448, y 32~472 = 384×440)의 높이를
// 275dp로 놓는다(시안은 268). 그림 1픽셀이 정확히 0.625dp(8px 칸 = 5dp)가 되어 칸이 일정한 크기로 보이고, 안착할 때 배율 0.4에서 Q 너비가 정확히 96dp가 된다.
const ICON_BBOX = { x: 64, y: 32, w: 384, h: 440 };
const ICON_K = 275 / ICON_BBOX.h;
export const SPLASH_ICON = {
  canvas: 512 * ICON_K,
  // 그림 왼쪽 위에서 Q 외곽 왼쪽 위까지
  offsetX: ICON_BBOX.x * ICON_K,
  offsetY: ICON_BBOX.y * ICON_K,
  // Q 외곽 크기(시안의 230×268에 해당하는 박스, 240×275)
  width: ICON_BBOX.w * ICON_K,
  height: 275,
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

// ---- 돋보기 레이어(splash-frame/glass/full은 512×512, splash-head는 머리 344×400. 아래 좌표는 모두 512 캔버스 기준 px) ----
// 돋보기(프레임 + 베이지 유리색 렌즈 채움)는 고정이고, 머리만 렌즈 클립 원 안에서 움직인다. 유리 하이라이트는 머리 위에 덮는다.
// 레이어 순서(아래 → 위): 그림자 복사본 → frame → 머리(렌즈 클립 원으로 자름) → glass(하이라이트). 머리를 (88,96)에 두고 반지름 140 원으로 자르면
// frame + 머리 + glass가 splash-full과 거의 같다(차이 489픽셀).
export const SPLASH_LAYERS = {
  canvas: 512,
  // 렌즈 클립 원. 중심 (256,264), 반지름 140(렌즈 채움은 반지름 136, 그 바깥 8px이 프레임 안쪽 외곽선이다).
  lens: { x: 116, y: 124, size: 280 },
  lensCenter: { x: 256, y: 264 },
  // 머리 정지 위치. 얼굴은 시안 원본 크기(배율 1.0)이고, 몸통을 렌즈 밖까지 연장한 344×400 그림이다(이전 248×344 그림에서 좌 48px, 상 56px 연장).
  // 얼굴 위치는 이전과 같다(이전 (136,152) 그림의 얼굴이 (88,96) 그림 안 (48,56)에 있다).
  duck: { x: 88, y: 96, w: 344, h: 400 },
  // 확대·회전의 기준점. 이전 머리의 시안 기준점 (50%, 59.7%)이 있던 캔버스 위치 (260, 357.4)에 그대로 둔다(새 머리 기준 (50%, 65.34%)).
  duckPivot: { x: (260 - 88) / 344, y: (152 + 0.597 * 344 - 96) / 400 },
  // 눈 깜빡임은 눈 감은 머리 그림(splash-head-blink-half/blink, 머리와 같은 344×400)을 머리 위에 겹쳐 바꾼다. 눈 좌표 상수는 두지 않는다.
  // 시안의 drop-shadow(0 12px 0 rgba(72,29,11,.95))
  shadowOffset: 12,
  shadowOpacity: 0.95,
  // 말풍선 "?"(시안 .qmark): 돋보기 Q 외곽 기준 왼쪽 46%, 위쪽 -8%
  qmark: { left: 0.46, top: -0.08, size: 34 },
} as const;
// 머리 그림의 너비(dp). 머리 이동은 이 너비에 대한 %로 다룬다.
export const SPLASH_HEAD_DP = (SPLASH_ICON.canvas * SPLASH_LAYERS.duck.w) / SPLASH_LAYERS.canvas;

// 머리 모션의 한계. 이동은 가로 렌즈 지름(280)의 6%(16.8px), 세로 5%(14px), 갸웃은 ±6° 이내로 줄인다.
// 머리 몸통이 렌즈 밖까지 이어져서(344×400) 기본 배율 1.0으로도 렌즈 클립 원 안에 투명한 픽셀이 생기지 않는 것을 이미지로 확인했다.
// 시안 폭 가로 8.8%(24.6px)는 오른쪽으로 갈 때 갸웃과 겹치면 왼쪽 가장자리에 틈이 생겨서(0개가 되는 최대 18px) 6%로 두었다.
// 시안 값은 가로 ±10%(머리 폭 기준), 세로 -4%, 회전 ±11°라서 아래 계수를 곱한다.
const LIMIT_X_PCT = ((0.06 * SPLASH_LAYERS.lens.size) / SPLASH_LAYERS.duck.w) * 100;
const LIMIT_Y_PCT = ((0.05 * SPLASH_LAYERS.lens.size) / SPLASH_LAYERS.duck.w) * 100;
// 머리가 렌즈 아래에서 올라오기 시작할 때, 머리(이미지 위쪽)가 렌즈 클립 원 아래쪽 밖에 있도록 하는 시작 위치(머리 너비의 %)
const LENS_BOTTOM = SPLASH_LAYERS.lensCenter.y + SPLASH_LAYERS.lens.size / 2;
export const SPLASH_HEAD_MOTION = {
  limitX: LIMIT_X_PCT,
  limitY: LIMIT_Y_PCT,
  moveX: LIMIT_X_PCT / 10,
  moveY: LIMIT_Y_PCT / 4,
  rotate: 6 / 11,
  entranceFrom: ((LENS_BOTTOM + 24 - SPLASH_LAYERS.duck.y) / SPLASH_LAYERS.duck.w) * 100,
  // 올라올 때 위로 넘치는 정도. 시안 1.4는 너무 커서, 올라오는 거리에 맞춰 렌즈 지름의 3% 이내가 되는 값으로 줄였다.
  overshoot: 0.82,
} as const;

export const SPLASH_SIZE = {
  grid: 26,
  // 돋보기 아이콘 박스(시안 230×268에 해당, 240×275). 이 크기의 비율로 날아가는 위치를 계산한다.
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
