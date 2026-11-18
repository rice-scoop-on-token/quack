import { COLORS } from '@/theme/assetTokens';

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

export const SPLASH_COLORS = {
  background: COLORS.screen,
  grid: '#EFE2BF',
  yellow: '#FBBE1C',
  orange: COLORS.accent,
  // 시안의 갈색. 앱 외곽선(#4B3226)보다 약간 진해서 스플래시에서만 쓴다.
  brown: '#481D0B',
  card: COLORS.card,
  sub: COLORS.textSub,
} as const;

export const SPLASH_SIZE = {
  grid: 26,
  // 돋보기 아이콘 박스(시안 px). 이 크기의 비율로 레이어를 놓는다.
  icon: { width: 230, height: 268 },
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
