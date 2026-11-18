import { SPLASH_DUCK_TRAVEL_EXTRA, SPLASH_SIZE, SPLASH_STAR_PERIOD } from '@/features/splash/splashSpec';

// 시안(quack_splash.html)의 render(t) 수식을 시각 t 하나의 순수 함수로 옮겼다. 값은 시안과 같게 유지한다.
// 이 파일은 RN을 불러오지 않는다(Node 일회용 스크립트로 시안 값과 비교할 수 있게 하기 위해서다).
// 앱에서는 splashChannels.ts가 이 함수들을 60Hz로 샘플링해 Animated 값으로 굽는다.

export const T_END = 10.6;
const ICON_W = SPLASH_SIZE.icon.width;
const ICON_H = SPLASH_SIZE.icon.height;
const DUCK_W = SPLASH_SIZE.duck.width;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const eOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const eInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const eSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;
const eOutBack = (p: number, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);

// 키프레임([시각, 값] 쌍)에서 값을 뽑는다(구간마다 이징)
function track(t: number, keys: [number, number][], ease = eSine) {
  if (t <= keys[0][0]) {
    return keys[0][1];
  }
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, va] = keys[i - 1];
      const [b, vb] = keys[i];
      return lerp(va, vb, ease((t - a) / (b - a)));
    }
  }
  return keys[keys.length - 1][1];
}

// 화면에서 측정한 값. 시안의 layout()이 구하던 것과 같다.
export type Geo = {
  width: number;
  height: number;
  // Q 자리(루트 기준)
  slot: { x: number; y: number; w: number; h: number };
  // 로고 줄의 가운데(반짝임이 퍼지는 중심)
  title: { cx: number; cy: number };
};

// ---- 막(커튼) ----
// 시작 막은 위로 걷히고, 끝 막은 아래에서 올라와 덮는다. 시안은 막 하나를 순간이동시키지만 앱은 두 장으로 나눈다.
export const curtainTop = (t: number, H: number) => -1.04 * H * eInOut(seg(t, 0, 0.45));
export const curtainBottom = (t: number, H: number) => (t < 10.0 ? 1.04 * H : 1.04 * H * (1 - eInOut(seg(t, 10.0, 10.55))));

// ---- 돋보기 아이콘(위치·기울기·크기) ----
const MX: [number, number][] = [[1.1, 0], [1.3, -12], [1.55, 10], [1.75, 0], [2.35, 0], [2.75, -12], [2.95, -12], [3.35, 12], [3.5, 12], [3.9, 0], [4.5, 0]];
const MY: [number, number][] = [[1.1, 0], [1.3, -6], [1.55, -4], [1.75, 0], [3.5, 0], [3.9, -10], [4.15, -8], [4.5, 0]];
const MR: [number, number][] = [[1.1, 0], [1.3, -7], [1.55, 6], [1.75, 0], [2.35, 0], [2.75, -5], [2.95, -5], [3.35, 5], [3.5, 5], [3.9, 0], [4.1, -3], [4.5, 0]];
const MS: [number, number][] = [[3.5, 1], [3.9, 1.14], [4.15, 1.14], [4.5, 1]];

// 아이콘 박스(230×268)의 왼쪽 위 이동량 tx, ty와 회전 r(도), 가로·세로 배율을 돌려준다. 가운데를 기준으로 돈다.
export function iconPose(t: number, g: Geo) {
  const start = { x: g.width / 2, y: g.height * 0.45 };
  const finalS = g.slot.w / ICON_W;
  const final = { x: g.slot.x + g.slot.w / 2, y: g.slot.y + g.slot.h - (ICON_H * finalS) / 2 };
  let x = start.x;
  let y = start.y;
  let r = 0;
  let s = 1;
  const pIn = seg(t, 0.35, 1.1);
  if (t < 1.1) {
    s = pIn <= 0 ? 0 : eOutBack(pIn, 2.2);
    r = lerp(-28, 0, eOutCubic(pIn));
    y += lerp(70, 0, eOutCubic(pIn));
  } else {
    // 두리번 뒤 멈추며 살짝 출렁인다
    const settle = t > 4.1 && t < 4.75 ? Math.sin(seg(t, 4.5, 4.75) * Math.PI) * -0.04 : 0;
    x += track(t, MX);
    y += track(t, MY);
    r = track(t, MR);
    s = track(t, MS) + settle;
  }
  let sx = 1;
  let sy = 1;
  let by = 0;
  if (t >= 4.75) {
    // Q 자리로 날아가 안착
    const p = seg(t, 4.75, 5.5);
    const e = eInOut(p);
    x = lerp(start.x, final.x, e);
    y = lerp(start.y, final.y, e) - Math.sin(Math.PI * p) * 70;
    // 시안은 -360까지 돌지만 같은 모양이라 끝나면 0으로 둔다(굽는 값이 한 바퀴 거꾸로 돌지 않게)
    const spin = seg(t, 4.8, 5.45);
    r = spin >= 1 ? 0 : lerp(0, -360, eInOut(spin));
    s = lerp(1, finalS, e);
    // 착지 눌림
    const q = seg(t, 5.5, 5.85);
    if (q > 0 && q < 1) {
      const w = Math.sin(q * Math.PI * 2) * (1 - q);
      sx = 1 + 0.14 * w;
      sy = 1 - 0.14 * w;
    }
    // 끝의 출렁임
    const c = seg(t, 9.25, 9.75);
    if (c > 0 && c < 1) {
      const w = Math.sin(c * Math.PI * 3) * (1 - c);
      r = w * 14;
      sx *= 1 + 0.08 * Math.abs(w);
      sy *= 1 - 0.06 * w;
    }
    // 눌림은 Q의 아래쪽 가장자리를 기준으로 해서 바닥에 "착지"하는 것처럼 보인다
    by = ((ICON_H * s) / 2) * (1 - sy);
  }
  return { tx: x - ICON_W / 2, ty: y - ICON_H / 2 + by, r, sx: s * sx, sy: s * sy, show: t < 0.35 ? 0 : 1 };
}

// ---- 로고 글자 "uack" ----
export function letterPose(t: number, i: number) {
  const a = 5.3 + i * 0.15;
  const p = seg(t, a, a + 0.5);
  let ty = track(p, [[0, 34], [0.18, -30], [0.45, 0], [0.7, -6], [1, 0]], eOutCubic);
  const sx = track(p, [[0, 0.4], [0.18, 0.92], [0.45, 1.16], [0.7, 0.97], [1, 1]], eOutCubic);
  const sy = track(p, [[0, 0.4], [0.18, 1.22], [0.45, 0.8], [0.7, 1.05], [1, 1]], eOutCubic);
  const c = seg(t, 9.25, 9.7);
  if (c > 0 && c < 1) {
    const w = Math.sin(c * Math.PI * 2 + i * 0.6) * (1 - c);
    ty += -14 * Math.max(0, w);
  }
  return { o: p > 0 ? 1 : 0, ty, sx, sy };
}

// ---- 문구 카드, 진행 막대, 로딩 문구 ----
export function tagPose(t: number) {
  const tg = eOutCubic(seg(t, 5.4, 5.85));
  return { o: tg, ty: lerp(-14, 0, tg) };
}
export const stripScale = (t: number) => eOutCubic(seg(t, 5.65, 6.05));
export function loadPose(t: number) {
  const lo = eOutCubic(seg(t, 5.9, 6.3));
  return { o: lo, ty: lerp(8, 0, lo) };
}

// ---- 오리 ----
// 한 번 폴짝(f=0~1): 위로 솟았다 내려앉는 높이, 납작해지는 정도, 기울기
export function hopPose(f: number) {
  const sq = f < 0.12 ? 1 - f / 0.12 : f > 0.9 ? (f - 0.9) / 0.1 : 0;
  return {
    dy: -Math.sin(f * Math.PI) * 28,
    dsx: 1 + 0.16 * sq - 0.06 * Math.sin(f * Math.PI),
    dsy: 1 - 0.16 * sq + 0.08 * Math.sin(f * Math.PI),
    dr: Math.sin(f * Math.PI * 2) * -6,
  };
}

export const duckTravel = (barW: number) => barW - DUCK_W + SPLASH_DUCK_TRAVEL_EXTRA;

export function duckPose(t: number, barW: number) {
  const travel = duckTravel(barW);
  let dx = -8;
  let dy = 0;
  let dsx = 1;
  let dsy = 1;
  let dr = 0;
  if (t < 6.2) {
    // 떨어져서 한 번 튕긴다
    const p = seg(t, 5.75, 6.05);
    dy = lerp(-520, 0, p * p);
    const b = seg(t, 6.05, 6.2);
    if (b > 0) {
      dy = -Math.sin(b * Math.PI) * 22;
    }
    if (p >= 1 && b < 0.15) {
      dsx = 1.2;
      dsy = 0.8;
    }
  } else if (t < 9.2) {
    // 막대를 따라 폴짝폴짝
    const p = seg(t, 6.2, 9.2);
    const k = p * 9;
    const f = k - Math.floor(k);
    dx = lerp(-8, travel, p);
    ({ dy, dsx, dsy, dr } = hopPose(f));
  } else {
    // 도착: 큰 점프와 착지
    dx = travel;
    const c = seg(t, 9.2, 9.75);
    if (c < 1) {
      dy = -Math.sin(c * Math.PI) * 90;
      dr = -16 * Math.sin(c * Math.PI);
    }
    const l = seg(t, 9.75, 9.95);
    if (l > 0 && l < 1) {
      dsx = 1 + 0.18 * Math.sin(l * Math.PI);
      dsy = 1 - 0.18 * Math.sin(l * Math.PI);
    }
  }
  return { o: t >= 5.75 ? 1 : 0, dx, dy, dsx, dsy, dr };
}

// 오리 그림자(바닥 타원): 높이 뜰수록 흐려지고 좁아진다
export const duckShadowOpacity = (o: number, dy: number) => (o ? clamp(1 + dy / 120, 0.25, 1) : 0);
export const duckShadowScale = (dy: number) => clamp(1 + dy / 100, 0.4, 1);

// 막대 채움(0~1). 오리가 간 만큼 채우고, 도착하면 가득 찬다.
export function fillRatio(t: number, barW: number) {
  if (t >= 9.2) {
    return 1;
  }
  return t < 6.2 ? 0 : clamp((duckPose(t, barW).dx + DUCK_W / 2) / barW);
}

// ---- 도착 반짝임(8개). 공통 진행값 e(0~1)에 방향 값을 곱한다. ----
export const burstProgress = (t: number) => eOutCubic(seg(t, 9.25, 9.95));
export const burstOpacity = (t: number) => {
  const bp = seg(t, 9.25, 9.95);
  return bp > 0 && bp < 1 ? 1 - bp : 0;
};

// ---- 반복 값(0~1 한 바퀴)에서 뽑는 것들: 로딩 점, 배경 별 ----
// "불러오는 중..." 점 3개(첫 점은 늘 보인다). 시안 식 ((t*1.1+i*.33)%1)>.33*i 를 한 바퀴 값 u로 옮겼다.
export const dotOpacity = (u: number, i: number) => (((u + i * 0.33) % 1) > 0.33 * i ? 1 : 0.2);
// 별: 한 바퀴 중 앞 절반은 밝고 뒤 절반은 어둡다(시안 steps 애니메이션). d는 지연을 한 바퀴 비율로 바꾼 값.
export const starOpacity = (u: number, delay: number) => {
  const phase = (((u - delay / SPLASH_STAR_PERIOD) % 1) + 1) % 1;
  return phase < 0.5 ? 1 : 0.25;
};
