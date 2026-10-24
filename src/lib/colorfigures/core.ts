/*
 * Colorfigures 엔진 (TypeScript 이식판)
 *
 * 원본: Colorfigures 스킬의 assets/core.js (MIT, April Zhu — 같은 폴더 LICENSE 참고)
 * 원본 sha256: a871d6cec944addaeef78b1273adf2337c02e6094d8d38b1324a3a995120ee9a
 *
 * 스킬로 만든 figure 의 장면 코드를 거의 그대로 옮겨 붙일 수 있도록 함수 이름과 인자를
 * 원본과 똑같이 둔다. 원본과 다른 점은 아래뿐이다.
 *
 * - `mountFigure` 와 페이지 껍데기(CORE_CSS, 버튼, 색 견본, 흔들림 슬라이더)는 없다.
 *   화면 틀은 `@/components/topic/ColorFigure` 가 맡는다.
 * - 화면 위치(OX/OY)·선 굵기 배율(INK_K)·clipPath 번호를 전역 변수 대신 "지금 그리는
 *   figure" 의 frame 에 담는다. `withFrame` 안에서만 장면을 그리므로 한 페이지에 figure 가
 *   여럿이어도 서로 섞이지 않고, id 에는 figure 마다 다른 접두사가 붙는다.
 * - 납작하고 넓은 장면은 화면 틀이 4:3 보다 낮아진다. 물체를 오른쪽으로 미는 비율은
 *   버튼이 그림 위에 뜰 때만 준다 (`frameFor` 의 shiftX).
 * - 보는 방향이 정아이소메트릭이 아니다. 기본은 앞면 쪽으로 더 돌린 DEFAULT_VIEW 이고,
 *   빛과 그림자도 시점과 함께 돈다. 면이 보이는지는 `vis`, 앞뒤는 `depthOf` 로만 판단할 것.
 *   스킬 문서의 "안쪽 점 (x,y,z) 은 앞면에서 y + (W − x), z + (W − x) 에 보인다" 같은
 *   아이소메트릭 전용 셈은 맞지 않는다. 돌려 보기(VIEW 회전) UI 는 없다.
 * - `tag` 글자 크기에 frame 의 labelScale 이 곱해진다. 작은 화면에서 이름표가 읽히도록 한다.
 * - `tag` 의 알약 너비가 한글처럼 넓은 글자를 넓게 센다(원본은 모든 글자를 0.62em 로 셌다).
 * - `tx`·`txY`·`tag` 는 글자를 이스케이프하고 글꼴을 지정하지 않는다(사이트 글꼴을 물려받는다).
 */

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];
/** 한 재질의 세 가지 밝기: 밝은 면 / 중간 / 그늘. */
export interface Mat {
  l: string;
  m: string;
  d: string;
}

/* ---------- 팔레트 ---------- */
export const PALS = {
  mustard: { l: '#f4b829', m: '#d49c1f', d: '#4e4a18' },
  tomato: { l: '#ef6a4c', m: '#cf5038', d: '#4a2219' },
  mint: { l: '#93d3b0', m: '#71b693', d: '#1f4034' },
  cobalt: { l: '#76a0e2', m: '#5a82c6', d: '#1c2948' },
  blush: { l: '#f3a6bb', m: '#d8869c', d: '#4b2430' },
} satisfies Record<string, Mat>;
export const METAL: Mat = { l: '#eef0f0', m: '#c6ccce', d: '#8f989b' };
export const CLEAR: Mat = { l: '#e4f2f4', m: '#c4dfe4', d: '#97b9c0' };
export const CERAMIC: Mat = { l: '#fbfaf3', m: '#e3e0d2', d: '#bdb8a6' };
export const DARK: Mat = { l: '#55504a', m: '#3d3935', d: '#272421' };
export const BOARD: Mat = { l: '#e6e1d4', m: '#cfc8b8', d: '#aaa293' };
export const WOOD: Mat = { l: '#d9a86c', m: '#bf8a4f', d: '#8e6236' };
export const INK = '#231e16';
export const SHADOW = '#41538f';

/* ---------- 벡터 ---------- */
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
/** 내적. */
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** 외적. */
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** 길이 1 로 맞춘 벡터. 길이 0 이면 그대로. */
export const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
/** 점들의 평균. */
export const avg = (ps: Vec3[]): Vec3 =>
  ps.reduce<Vec3>((s, p) => [s[0] + p[0] / ps.length, s[1] + p[1] / ps.length, s[2] + p[2] / ps.length], [0, 0, 0]);
/* ---------- 보는 방향 ---------- */

/**
 * 보는 방향. az = 앞면(+x)에서 왼쪽 옆면(+y) 쪽으로 돈 각도, el = 내려다보는 각도.
 * 원본 스킬은 정아이소메트릭(az 45°, el 35.26°) 한 방향만 쓴다. 이 사이트에서는 그 시점이
 * 너무 기울어 보여서 앞면 쪽으로 더 돌린 시점을 기본으로 쓴다.
 */
export interface View {
  az: number;
  el: number;
}
export const ISO_VIEW: View = { az: 45, el: (Math.atan(1 / Math.SQRT2) * 180) / Math.PI };
export const DEFAULT_VIEW: View = { az: 25, el: 30 };
/**
 * 새로 만드는 figure 의 시점. DEFAULT_VIEW 보다 앞면을 더 정면으로 보아 앞면에 눈금·칸·글자를 더 담는다.
 * 이미 만든 figure 는 바꾸지 않는다: 피자·몬티 홀·꿀통은 DEFAULT_VIEW, 무한 호텔은 자기 시점(HOTEL_VIEW)을 쓴다.
 *
 * 방위각을 더 줄이지 않는 이유: 빛이 시점과 함께 돌아 방위 + 60° 에서 오므로, 방위각이 약 16.6° 보다
 * 작으면 앞면이 밝은 면(l)에서 중간 면(m)으로 어두워진다. 18° 는 앞면이 밝은 면으로 남는 값 중 작은 쪽이다.
 * 고도 26° 에서 바닥에 누운 판의 윗면은 앞면 넓이의 절반쯤으로 보인다.
 */
export const FRONT_VIEW: View = { az: 18, el: 26 };

/** 도 → 라디안. */
const rad = (deg: number) => (deg * Math.PI) / 180;
// 정아이소메트릭에서 원본과 같은 크기가 되도록 맞춘 배율 (√1.5)
const VIEW_SCALE = Math.sqrt(1.5);
const SHADOW_K = 0.85;
// 그림자는 빛이 말하는 길이보다 짧게 그린다 (높이 × 0.45). 길면 물체와 떨어져 다른 물건처럼 보인다.
const SHADOW_LEN = 0.45;
// 원본의 빛은 방위각 105°, 시점은 45°. 시점을 돌리면 빛도 같이 돌려 앞면이 밝고 왼쪽 옆면이
// 그늘지는 원본의 느낌을 지킨다.
const LIGHT_AZ_FROM_VIEW = 105 - 45;

interface Projection {
  /** 화면 x, y 를 만드는 행 (3D 점과 내적). */
  rx: Vec3;
  ry: Vec3;
  /** 보는 사람 쪽 방향. */
  eye: Vec3;
  /** 바깥 빛, 안쪽 빛, 그림자 방향. */
  light: Vec3;
  lightIn: Vec3;
  shadow: Vec2;
}

/** 보는 방향에서 투영 행, 눈 방향, 빛과 그림자 방향을 만든다. */
function projectionFor(view: View): Projection {
  const a = rad(view.az);
  const b = rad(view.el);
  const s = VIEW_SCALE;
  const la = rad(view.az + LIGHT_AZ_FROM_VIEW);
  const shadow: Vec2 = [SHADOW_K * Math.cos(la), SHADOW_K * Math.sin(la)];
  // 원본의 안쪽 빛 (.6, .2, 1) 도 시점과 같이 돈다.
  const turn = rad(view.az - 45);
  const lin: Vec3 = [0.6 * Math.cos(turn) - 0.2 * Math.sin(turn), 0.6 * Math.sin(turn) + 0.2 * Math.cos(turn), 1];
  return {
    rx: [s * Math.sin(a), -s * Math.cos(a), 0],
    ry: [s * Math.sin(b) * Math.cos(a), s * Math.sin(b) * Math.sin(a), -s * Math.cos(b)],
    eye: [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)],
    light: norm([-shadow[0], -shadow[1], 1]),
    lightIn: norm(lin),
    shadow,
  };
}

/* ---------- figure 하나의 화면 틀 ---------- */

/** 선 굵기의 기준 배율. 원본에서 화면 폭이 이 값인 figure 의 선 굵기를 기준으로 삼았다. */
export const INK_REF_VB = 585;

export interface Frame {
  /** viewBox 의 폭과 높이. 보통 4:3, 납작한 장면은 더 낮다. */
  vbW: number;
  vbH: number;
  ox: number;
  oy: number;
  /** 선 굵기와 필터를 화면 배율에 맞추는 계수. */
  inkK: number;
  /** clipPath·filter id 접두사. 페이지 안에서 figure 마다 달라야 한다. */
  idPrefix: string;
  /** 이름표 글자 배율. 그림이 작게 보일 때 글자가 읽히도록 키운다. */
  labelScale: number;
  view: View;
}

interface ActiveFrame extends Frame {
  clipN: number;
  proj: Projection;
}

/** frame 을 그리기용으로 펼친다 (clipPath 번호 초기화, 투영 계산). */
const activate = (frame: Frame): ActiveFrame => ({ ...frame, clipN: 0, proj: projectionFor(frame.view) });

let F: ActiveFrame = activate({
  vbW: INK_REF_VB,
  vbH: INK_REF_VB * 0.75,
  ox: 0,
  oy: 0,
  inkK: 1,
  idPrefix: 'cf',
  labelScale: 1,
  view: DEFAULT_VIEW,
});

/** 3D 점을 화면 좌표로 (위치 이동 없이). */
const project = (pr: Projection, x: number, y: number, z: number): Vec2 => [
  pr.rx[0] * x + pr.rx[1] * y + pr.rx[2] * z,
  pr.ry[0] * x + pr.ry[1] * y + pr.ry[2] * z,
];

export interface FrameOptions {
  view?: View;
  /** 물체를 오른쪽으로 미는 비율. 버튼이 그림 왼쪽 위에 떠 있을 때 쓴다 (원본은 0.06). */
  shiftX?: number;
  /**
   * 'box' 면 viewBox 높이를 4:3 대신 경계 상자 높이(위아래 여백 각각 폭의 4%)에 맞춘다. 폭은 그대로라
   * 같은 칸 폭에서 그림과 글자 크기는 같고, 그림 아래의 빈 줄만 없어진다. 원본에는 없는 선택이다.
   */
  fit?: 'box';
}

/** fit: 'box' 의 위아래 여백 (viewBox 폭에 대한 비율). */
export const BOX_FIT_PAD = 0.04;

/**
 * 물체의 경계 상자 [W, D, H] 에 맞춰 화면 틀을 잡는다. 원본 `mountFigure` 의 계산과 같다:
 * 물체가 폭의 약 74%, 높이의 약 88% 를 채우고, 그림자가 아래로 떨어지므로 조금 위에 앉는다.
 */
export function frameFor(size: Vec3, idPrefix: string, options: FrameOptions = {}): Frame {
  const view = options.view ?? DEFAULT_VIEW;
  const shiftX = options.shiftX ?? 0;
  const pr = projectionFor(view);
  const [W, D, H] = size;
  const pts: Vec2[] = [];
  for (const x of [0, W]) for (const y of [0, D]) for (const z of [0, H]) pts.push(project(pr, x, y, z));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs);
  const bh = Math.max(...ys) - Math.min(...ys);
  const vbW = Math.max(bw / 0.74, bh / 0.88 / 0.75);
  if (options.fit === 'box') {
    const pad = vbW * BOX_FIT_PAD;
    const ox = (vbW - bw) / 2 + vbW * shiftX - Math.min(...xs);
    return { vbW, vbH: bh + pad * 2, ox, oy: pad - Math.min(...ys), inkK: vbW / INK_REF_VB, idPrefix, labelScale: 1, view };
  }
  // 원본은 늘 4:3 이다. 납작하고 넓은 장면(도마 위 물건들)은 아래가 텅 비므로 높이를 물체에
  // 맞춰 줄이고, 이름표가 올라갈 위쪽에 여백을 조금 더 둔다.
  const flat = bh / 0.7 < vbW * 0.75;
  const vbH = flat ? Math.max(bh / 0.7, vbW * 0.4) : vbW * 0.75;
  const ox = (vbW - bw) / 2 + vbW * shiftX - Math.min(...xs);
  const oy = (flat ? (vbH - bh) * 0.6 : vbH * 0.04) - Math.min(...ys);
  return { vbW, vbH, ox, oy, inkK: vbW / INK_REF_VB, idPrefix, labelScale: 1, view };
}

/** frame 을 "지금 그리는 figure" 로 두고 fn 을 부른다. 장면 함수는 반드시 이 안에서 불러야 한다. */
export function withFrame<T>(frame: Frame, fn: () => T): T {
  const prev = F;
  F = activate(frame);
  try {
    return fn();
  } finally {
    F = prev;
  }
}

/** 지금 그리는 figure 의 선 굵기 배율. */
export const inkK = (): number => F.inkK;
/** 지금 그리는 figure 의 이름표 글자 배율. 작은 화면에서 1 보다 커진다. 장면 안 글자를 같이 키울 때 쓴다. */
export const labelScale = (): number => F.labelScale;
/** 지금 그리는 figure 의 보는 방향. */
export const currentView = (): View => F.view;

/* ---------- 투영 (x = 보는 사람 오른쪽 앞, y = 왼쪽 앞, z = 위) ---------- */
export const P = (x: number, y: number, z: number): Vec2 => {
  const [u, v] = project(F.proj, x, y, z);
  return [u + F.ox, v + F.oy];
};
/** 3D 방향을 화면 방향으로 (위치 이동 없이). 글자 기울기 등에 쓴다. */
export const Dv = (x: number, y: number, z: number): Vec2 => project(F.proj, x, y, z);
/** 보는 사람 쪽으로의 거리. 작은 것부터 그린다. */
export const depthOf = (p: Vec3): number => dot(p, F.proj.eye);
export interface DepthPart {
  at: Vec3;
  svg: string;
}
/** [{at, svg}] 를 먼 것부터 정렬해 잇는다. */
export const byDepth = (parts: (DepthPart | null | undefined | false)[]): string =>
  parts
    .filter((p): p is DepthPart => Boolean(p))
    .sort((p, q) => depthOf(p.at) - depthOf(q.at))
    .map((p) => p.svg)
    .join('');
/** SVG 좌표용 소수 한 자리. */
export const f = (v: number): string => v.toFixed(1);
/** 3D 점들을 잇는 SVG path. close = false 면 열린 선. */
export const pd = (pts: Vec3[], close = true): string =>
  'M' +
  pts
    .map((p) => {
      const q = P(p[0], p[1], p[2]);
      return f(q[0]) + ' ' + f(q[1]);
    })
    .join('L') +
  (close ? 'Z' : '');
/** 화면 좌표 점들을 잇는 닫힌 SVG path. */
export const sp = (pts: Vec2[]): string => 'M' + pts.map((q) => f(q[0]) + ' ' + f(q[1])).join('L') + 'Z';

/* ---------- 평면 좌표 (u, v) 의 2D 도형. 평면 함수로 3D 에 올린다 ---------- */
export const arcUV = (cu: number, cv: number, r: number, a0: number, a1: number, n = 7): Vec2[] => {
  const o: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    o.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]);
  }
  return o;
};
/** 평면 위 사각형. */
export const rectUV = (u0: number, v0: number, u1: number, v1: number): Vec2[] => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
];
/** 평면 위 둥근 사각형 (모서리 반지름 r). */
export const rrUV = (u0: number, v0: number, u1: number, v1: number, r: number, n = 7): Vec2[] =>
  r <= 0
    ? rectUV(u0, v0, u1, v1)
    : [
        ...arcUV(u1 - r, v0 + r, r, -90, 0, n),
        ...arcUV(u1 - r, v1 - r, r, 0, 90, n),
        ...arcUV(u0 + r, v1 - r, r, 90, 180, n),
        ...arcUV(u0 + r, v0 + r, r, 180, 270, n),
      ];
/** 평면 위 타원 (n 각형으로). */
export const ellUV = (cu: number, cv: number, ru: number, rv: number, n = 24): Vec2[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return [cu + ru * Math.cos(a), cv + rv * Math.sin(a)] as Vec2;
  });
type Plane = (uv: Vec2) => Vec3;
/** 앞면과 나란한 평면 x = const (u = y, v = z). */
export const PX = (x: number): Plane => ([u, v]) => [x, u, v];
/** 옆면과 나란한 평면 y = const (u = x, v = z). */
export const PY = (y: number): Plane => ([u, v]) => [u, y, v];
/** 수평면 z = const (u = x, v = y). */
export const PZ = (z: number): Plane => ([u, v]) => [u, v, z];
/** 평면 좌표 점들을 3D 로 올린다. */
export const on = (plane: Plane, uv: Vec2[]): Vec3[] => uv.map(plane);

/* ---------- 음영 ---------- */
/** 이 면이 보는 사람을 향하는가. */
export const vis = (n: Vec3): boolean => dot(n, F.proj.eye) > 1e-6;
export const facing = vis;

/** 바깥 면의 음영. */
export const tone = (n: Vec3, m: Mat): string => {
  const d = dot(n, F.proj.light);
  return d > -0.15 ? m.l : d > -0.45 ? m.m : m.d;
};
/** 안쪽 면과 작은 소품의 음영. */
export const toneI = (n: Vec3, m: Mat): string => {
  const d = dot(n, F.proj.lightIn);
  return d > 0.6 ? m.l : d > 0.05 ? m.m : m.d;
};
/** 두 #rrggbb 색을 t 만큼 섞는다. */
export const mix = (a: string, b: string, t: number): string =>
  '#' +
  [1, 3, 5]
    .map((i) =>
      Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
/** 색 하나로 밝은 면·중간·그늘 세 단계 재질을 만든다. */
export const matOf = (hex: string): Mat => ({ l: hex, m: mix(hex, '#000000', 0.16), d: mix(hex, '#000000', 0.42) });
/** 천천히 시작해 천천히 멈추는 0..1 곡선. */
export const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/* ---------- 그리기 (모두 SVG 문자열을 돌려준다) ---------- */
export const ink = (d: string, w = 1.0): string =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
/** 칠만 있는 path. */
export const fill = (d: string, c: string, extra = ''): string => `<path d="${d}" fill="${c}" ${extra}/>`;
/** 이음매가 보이지 않도록 같은 색 테두리를 두른 면. */
export const face = (d: string, c: string): string =>
  `<path d="${d}" fill="${c}" stroke="${c}" stroke-width=".7" stroke-linejoin="round"/>`;
/** 칠하고 잉크로 테두리를 그린 다각형. */
export const shape = (pts: Vec3[], c: string, w = 0.9): string => fill(pd(pts), c) + (w ? ink(pd(pts), w) : '');
/** 잉크로 그린 열린 선. */
export const line = (pts: Vec3[], w = 0.9): string => ink(pd(pts, false), w);

/** 길이가 같은 두 고리 사이를 띠로 잇는다. 볼록한 단면에서만 맞는다. flip = 안에서 본 면. */
export function loft(A: Vec3[], B: Vec3[], colour: (n: Vec3) => string, flip = false): string {
  const n = A.length;
  const cen = avg(A.concat(B));
  let s = '';
  for (let i = 0; i < n; i++) {
    const a0 = A[i];
    const a1 = A[(i + 1) % n];
    const b1 = B[(i + 1) % n];
    const b0 = B[i];
    let nr = norm(cross(sub(a1, a0), sub(b0, a0)));
    if (!isFinite(nr[0])) continue;
    if (dot(nr, sub(avg([a0, a1, b1, b0]), cen)) < 0) nr = [-nr[0], -nr[1], -nr[2]];
    if (flip) nr = [-nr[0], -nr[1], -nr[2]];
    if (vis(nr)) s += face(pd([a0, a1, b1, b0]), colour(nr));
  }
  return s;
}

/** 화면 좌표 점들의 볼록 껍질. */
export function hull(input: Vec2[]): Vec2[] {
  const pts = input.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Vec2[] = [];
  const up: Vec2[] = [];
  for (const p of pts) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (const p of pts.reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  lo.pop();
  up.pop();
  return lo.concat(up);
}

/** 외곽선 잉크. 부품이 화면에서 두꺼울수록 굵어지고, w 가 상한이다. */
export const hullInk = (pts3: Vec3[], w = 1.4): string => {
  const h = hull(pts3.map((p) => P(...p)));
  let a = 0;
  let per = 0;
  for (let i = 0; i < h.length; i++) {
    const p = h[i];
    const q = h[(i + 1) % h.length];
    a += p[0] * q[1] - q[0] * p[1];
    per += Math.hypot(q[0] - p[0], q[1] - p[1]);
  }
  const thick = per ? Math.abs(a) / per / (F.inkK * INK_REF_VB) : 0;
  return ink(sp(h), Math.min(w, 0.9 + 20 * thick));
};

type Shade = (n: Vec3, m: Mat) => string;

/** 축에 나란한 상자. 보이는 면만 음영을 넣어 그린다. */
export function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: Mat, shade: Shade = toneI, w = 0.9): string {
  const faces: [Vec3, Vec3[]][] = [
    [[0, 1, 0], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]],
    [[1, 0, 0], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]],
    [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
    [[-1, 0, 0], [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]],
    [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]],
  ];
  return faces
    .filter(([n]) => vis(n))
    .map(([n, q]) => shape(q, shade(n, m), w))
    .join('');
}

/** 단면(u = y, v = z)을 x0 에서 x1 까지 밀어 만든 몸통. 앞 뚜껑과 외곽선은 따로 그린다. */
export function extrude(profileUV: Vec2[], x0: number, x1: number, m: Mat, shade: Shade = tone): string {
  return loft(on(PX(x0), profileUV), on(PX(x1), profileUV), (n) => shade(n, m));
}

/** 세운 원기둥 (축 z). */
export function cyl(x: number, y: number, z0: number, z1: number, r: number, m: Mat, shade: Shade = toneI, w = 1.2, n = 24): string {
  const A = on(PZ(z0), ellUV(x, y, r, r, n));
  const B = on(PZ(z1), ellUV(x, y, r, r, n));
  return loft(A, B, (nr) => shade(nr, m)) + fill(pd(B), shade([0, 0, 1], m)) + hullInk([...A, ...B], w) + ink(pd(B), w * 0.8);
}

/** 앞으로 튀어나온 원기둥 (축 x). */
export function cylX(x0: number, x1: number, y: number, z: number, r: number, m: Mat, shade: Shade = toneI, w = 1.1, n = 20): string {
  const A = on(PX(x0), ellUV(y, z, r, r, n));
  const B = on(PX(x1), ellUV(y, z, r, r, n));
  const cn: Vec3 = [1, 0, 0];
  return loft(A, B, (nr) => shade(nr, m)) + fill(pd(B), shade(cn, m)) + hullInk([...A, ...B], w) + ink(pd(B), w * 0.8);
}

/** 두 점 사이의 원기둥 (팔, 막대, 손잡이). r1 을 주면 원뿔. */
export function rod(a: Vec3, b: Vec3, r: number, m: Mat, shade: Shade = toneI, w = 1, r1 = r, n = 16): string {
  const d = norm(sub(b, a));
  const u = norm(cross(d, Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  const v = cross(d, u);
  const ring = (p: Vec3, rr: number): Vec3[] =>
    Array.from({ length: n }, (_, i) => {
      const t = (i / n) * 2 * Math.PI;
      const c = Math.cos(t) * rr;
      const s2 = Math.sin(t) * rr;
      return [p[0] + u[0] * c + v[0] * s2, p[1] + u[1] * c + v[1] * s2, p[2] + u[2] * c + v[2] * s2] as Vec3;
    });
  const A = ring(a, r);
  const B = ring(b, r1);
  const capB = vis(d);
  const cap = capB ? B : A;
  const cn: Vec3 = capB ? d : [-d[0], -d[1], -d[2]];
  return (
    loft(A, B, (nr) => shade(nr, m)) +
    (Math.max(r, r1) > 0 ? fill(pd(cap), shade(cn, m)) + ink(pd(cap), w * 0.8) : '') +
    hullInk([...A, ...B], w)
  );
}

/* ---------- 글자 ---------- */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 글자를 면 위에 눕히는 SVG transform 행렬. */
export const txM = (o: Vec2, U: Vec2, V: Vec2): string =>
  `matrix(${U[0].toFixed(4)} ${U[1].toFixed(4)} ${V[0].toFixed(4)} ${V[1].toFixed(4)} ${f(o[0])} ${f(o[1])})`;
/** 앞면(x = const) 위의 글자. (y, z) 가 가운데 밑줄. */
export const tx = (x: number, y: number, z: number, str: string, size: number, col = INK, weight = 700): string => {
  const o = P(x, y, z);
  return `<text transform="${txM(o, Dv(0, -1, 0), Dv(0, 0, -1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-weight="${weight}" letter-spacing=".04em">${esc(str)}</text>`;
};
/** 옆면(y = const) 위의 글자. */
export const txY = (x: number, y: number, z: number, str: string, size: number, col = INK, weight = 700): string => {
  const o = P(x, y, z);
  return `<text transform="${txM(o, Dv(1, 0, 0), Dv(0, 0, -1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-weight="${weight}" letter-spacing=".04em">${esc(str)}</text>`;
};

/* ---------- 그림자, 받침, 묶음 ---------- */
/** inner 를 3D 외곽선 pts3 안으로 자른다. */
export const clipTo = (pts3: Vec3[], inner: string): string => {
  const id = `${F.idPrefix}-k${++F.clipN}`;
  return `<clipPath id="${id}"><path d="${pd(pts3)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
};

/** 점들의 그림자를 빛 방향으로 밀어 z0 면에 눕힌다. clip 을 주면 그 면 밖으로 넘치지 않는다. */
export const castShadow = (pts3: Vec3[], z0 = 0, clip: Vec3[] | null = null): string => {
  const k = SHADOW_LEN / SHADOW_K;
  const s = fill(
    sp(hull(pts3.map(([x, y, z]) => P(x + (z - z0) * F.proj.shadow[0] * k, y + (z - z0) * F.proj.shadow[1] * k, z0)))),
    SHADOW,
  );
  return clip ? clipTo(clip, s) : s;
};

/** 받침판 윗면의 외곽선. 그림자를 이 안으로 자를 때 쓴다. */
export const boardTop = (x0: number, y0: number, x1: number, y1: number, h = 3, r = 5): Vec3[] =>
  on(PZ(h), rrUV(x0, y0, x1, y1, r));
/** 물체를 올려 둘 판. 가장 먼저 그린다. */
export function board(x0: number, y0: number, x1: number, y1: number, h = 3, r = 5, m: Mat = BOARD): string {
  const A = on(PZ(0), rrUV(x0, y0, x1, y1, r));
  const B = boardTop(x0, y0, x1, y1, h, r);
  return loft(A, B, (n) => toneI(n, m)) + fill(pd(B), m.l) + ink(pd(B), 1) + hullInk([...A, ...B], 1.8);
}

/** 누를 수 있는 부품. `ColorFigure` 의 onAct 가 name 으로 받는다. */
export const act = (name: string, inner: string, data = ''): string => `<g data-act="${name}" ${data}>${inner}</g>`;

// 한글·한자·전각 문자는 라틴 글자보다 넓다.
const WIDE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/;
/** 글자열의 대략적인 너비 (em). 넓은 글자는 1, 나머지는 0.62. */
const textEm = (text: string) => [...text].reduce((w, ch) => w + (WIDE.test(ch) ? 1 : 0.62), 0);

/**
 * 부품 이름표: 지시선이 달린 크림색 알약. dx, dy 는 기준 배율에서의 화면 단위 위치.
 * on = 그 부품이 지금 일하는 중 (알약이 강조색으로 바뀐다).
 */
export function tag(p3: Vec3, dx: number, dy: number, text: string, on = false): string {
  const k = F.inkK;
  const [X, Y] = P(...p3);
  const fs = 8.6 * k * F.labelScale;
  const w = textEm(text) * fs + fs * 1.5;
  const h = fs * 1.8;
  const cx = X + dx * k;
  const cy = Y + dy * k;
  return (
    `<g class="tag${on ? ' on' : ''}"><path d="M${f(X)} ${f(Y)}L${f(cx)} ${f(cy)}" fill="none" stroke="${INK}" stroke-width="1"/>` +
    `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(1.3 * k)}" fill="${INK}"/>` +
    `<rect x="${f(cx - w / 2)}" y="${f(cy - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${on ? 'var(--accent,#f4b829)' : '#fff4d6'}" stroke="${INK}" stroke-width="1.2"/>` +
    `<text x="${f(cx)}" y="${f(cy + fs * 0.36)}" font-size="${f(fs)}" text-anchor="middle" font-weight="800" letter-spacing=".04em" fill="${INK}">${esc(text)}</text></g>`
  );
}

/* ---------- 선 굵기와 손그림 필터 ---------- */

/** 장면 안의 모든 stroke-width 를 화면 배율에 맞춘다. */
export const inkScale = (svg: string, k = F.inkK): string =>
  k === 1 ? svg : svg.replace(/stroke-width="([\d.]+)"/g, (_, w: string) => `stroke-width="${(+w * k).toFixed(2)}"`);

/**
 * 선 흔들림의 기본값. 0 이면 선을 흔들지 않고 종이결만 입힌다 (원본 슬라이더의 기본값은 2.4).
 * 이 사이트의 모든 figure 와 카드 썸네일이 이 값을 쓴다.
 */
export const DEFAULT_WOBBLE = 0;

/** 흔들림·종이결 필터. wobble 이 0 보다 크면 선을 그만큼 흔들고, 0 이면 흔들림 단계를 빼고 종이결만 입힌다. */
export const filterFor = (id: string, k: number, wobble = DEFAULT_WOBBLE): string =>
  `<filter id="${id}" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
  ${
    wobble > 0
      ? `<feTurbulence type="fractalNoise" baseFrequency="${(0.045 / k).toFixed(4)}" numOctaves="2" seed="4" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="${(wobble * k).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="wob"/>`
      : `<feOffset in="SourceGraphic" dx="0" dy="0" result="wob"/>`
  }
  <feTurbulence type="fractalNoise" baseFrequency="${(0.9 / k).toFixed(4)}" numOctaves="3" seed="11" result="n1"/>
  <feColorMatrix in="n1" type="matrix" values=".3 0 0 0 .84  .3 0 0 0 .84  .3 0 0 0 .84  0 0 0 0 1" result="grain"/>
  <feTurbulence type="fractalNoise" baseFrequency="${(0.012 / k).toFixed(4)}" numOctaves="2" seed="7" result="n2"/>
  <feColorMatrix in="n2" type="matrix" values=".3 0 0 0 .85  .3 0 0 0 .85  .3 0 0 0 .85  0 0 0 0 1" result="blot"/>
  <feBlend in="wob" in2="grain" mode="multiply" result="g1"/><feBlend in="g1" in2="blot" mode="multiply" result="g2"/>
  <feComposite in="g2" in2="wob" operator="in"/></filter>`;

/* ---------- 상태와 애니메이션 ---------- */

/**
 * 애니메이션을 끝까지 돌린 상태. 움직임 줄이기 설정에서 버튼을 누르면 이 결과로 바로 간다.
 * 장면은 상태만 보고 그리므로, 같은 advance 를 잘게 반복하면 움직임을 건너뛴 같은 끝 상태가 나온다.
 */
export function settle<S>(state: S, advance: (s: S, dt: number) => S, settled: (s: S) => boolean, dt = 1 / 30, maxSteps = 20000): S {
  let s = state;
  for (let i = 0; i < maxSteps && !settled(s); i++) s = advance(s, dt);
  return s;
}
