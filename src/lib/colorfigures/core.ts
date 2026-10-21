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
 * - 납작하고 넓은 장면은 화면 틀이 4:3 보다 낮아진다 (`frameFor`).
 * - 돌려 보기(VIEW)와 빛 방향 조절은 없다. 스킬도 정면 한 방향·고정된 빛만 쓴다.
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
}

interface ActiveFrame extends Frame {
  clipN: number;
}

let F: ActiveFrame = { vbW: INK_REF_VB, vbH: INK_REF_VB * 0.75, ox: 0, oy: 0, inkK: 1, idPrefix: 'cf', labelScale: 1, clipN: 0 };

const C = Math.cos(Math.PI / 6);
const S = Math.sin(Math.PI / 6);
const raw = (x: number, y: number, z: number): Vec2 => [(x - y) * C, (x + y) * S - z];

/**
 * 물체의 경계 상자 [W, D, H] 에 맞춰 화면 틀을 잡는다. 원본 `mountFigure` 의 계산과 같다:
 * 물체가 폭의 약 74%, 높이의 약 88% 를 채우고, 그림자가 아래로 떨어지므로 조금 위에 앉는다.
 */
export function frameFor(size: Vec3, idPrefix: string): Frame {
  const [W, D, H] = size;
  const pts: Vec2[] = [];
  for (const x of [0, W]) for (const y of [0, D]) for (const z of [0, H]) pts.push(raw(x, y, z));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs);
  const bh = Math.max(...ys) - Math.min(...ys);
  let vbW = Math.max(bw / 0.74, bh / 0.88 / 0.75);
  // 원본은 늘 4:3 이다. 납작하고 넓은 장면(도마 위 물건들)은 아래가 텅 비므로 높이를 물체에
  // 맞춰 줄이고, 이름표가 올라갈 위쪽에 여백을 조금 더 둔다.
  // 폭도 조금 더 채운다.
  const flat = bh / 0.78 < vbW * 0.75;
  if (flat) vbW = bw / 0.86;
  const vbH = flat ? Math.max(bh / 0.78, vbW * 0.4) : vbW * 0.75;
  // 원본은 버튼이 그림 왼쪽 위에 떠 있어서 물체를 오른쪽으로 6% 밀었다. 여기서는 버튼이 그림
  // 밖에 있으므로 가운데에 둔다.
  const ox = (vbW - bw) / 2 - Math.min(...xs);
  const oy = (flat ? (vbH - bh) * 0.6 : vbH * 0.04) - Math.min(...ys);
  return { vbW, vbH, ox, oy, inkK: vbW / INK_REF_VB, idPrefix, labelScale: 1 };
}

/** frame 을 "지금 그리는 figure" 로 두고 fn 을 부른다. 장면 함수는 반드시 이 안에서 불러야 한다. */
export function withFrame<T>(frame: Frame, fn: () => T): T {
  const prev = F;
  F = { ...frame, clipN: 0 };
  try {
    return fn();
  } finally {
    F = prev;
  }
}

/** 지금 그리는 figure 의 선 굵기 배율. */
export const inkK = (): number => F.inkK;

/* ---------- 투영 (x = 보는 사람 오른쪽 앞, y = 왼쪽 앞, z = 위) ---------- */
export const P = (x: number, y: number, z: number): Vec2 => [(x - y) * C + F.ox, (x + y) * S - z + F.oy];
export const Dv = (x: number, y: number, z: number): Vec2 => [(x - y) * C, (x + y) * S - z];
/** 보는 사람 쪽으로의 거리. 작은 것부터 그린다. */
export const depthOf = (p: Vec3): number => p[0] + p[1] + p[2];
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
export const f = (v: number): string => v.toFixed(1);
export const pd = (pts: Vec3[], close = true): string =>
  'M' +
  pts
    .map((p) => {
      const q = P(p[0], p[1], p[2]);
      return f(q[0]) + ' ' + f(q[1]);
    })
    .join('L') +
  (close ? 'Z' : '');
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
export const rectUV = (u0: number, v0: number, u1: number, v1: number): Vec2[] => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
];
export const rrUV = (u0: number, v0: number, u1: number, v1: number, r: number, n = 7): Vec2[] =>
  r <= 0
    ? rectUV(u0, v0, u1, v1)
    : [
        ...arcUV(u1 - r, v0 + r, r, -90, 0, n),
        ...arcUV(u1 - r, v1 - r, r, 0, 90, n),
        ...arcUV(u0 + r, v1 - r, r, 90, 180, n),
        ...arcUV(u0 + r, v0 + r, r, 180, 270, n),
      ];
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
export const on = (plane: Plane, uv: Vec2[]): Vec3[] => uv.map(plane);

/* ---------- 벡터와 음영 ---------- */
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const avg = (ps: Vec3[]): Vec3 =>
  ps.reduce<Vec3>((s, p) => [s[0] + p[0] / ps.length, s[1] + p[1] / ps.length, s[2] + p[2] / ps.length], [0, 0, 0]);
/** 보는 사람은 (+1, +1, +1) 쪽에서 본다. 이 면이 보는 사람을 향하는가. */
export const vis = (n: Vec3): boolean => n[0] + n[1] + n[2] > 1e-6;
export const facing = vis;

// 원본의 기본 빛 방향(방위각 105°)으로 고정한다.
const SHADOW_K = 0.85;
// 그림자는 빛이 말하는 길이보다 짧게 그린다 (높이 × 0.45). 길면 물체와 떨어져 다른 물건처럼 보인다.
const SHADOW_LEN = 0.45;
const LIGHT_AZ = (105 * Math.PI) / 180;
const SH: Vec2 = [SHADOW_K * Math.cos(LIGHT_AZ), SHADOW_K * Math.sin(LIGHT_AZ)];
const L = norm([-SH[0], -SH[1], 1]);
const LIN = norm([0.6, 0.2, 1]);
/** 바깥 면의 음영. */
export const tone = (n: Vec3, m: Mat): string => {
  const d = dot(n, L);
  return d > -0.15 ? m.l : d > -0.45 ? m.m : m.d;
};
/** 안쪽 면과 작은 소품의 음영. */
export const toneI = (n: Vec3, m: Mat): string => {
  const d = dot(n, LIN);
  return d > 0.6 ? m.l : d > 0.05 ? m.m : m.d;
};
export const mix = (a: string, b: string, t: number): string =>
  '#' +
  [1, 3, 5]
    .map((i) =>
      Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
export const matOf = (hex: string): Mat => ({ l: hex, m: mix(hex, '#000000', 0.16), d: mix(hex, '#000000', 0.42) });
export const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/* ---------- 그리기 (모두 SVG 문자열을 돌려준다) ---------- */
export const ink = (d: string, w = 1.0): string =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
export const fill = (d: string, c: string, extra = ''): string => `<path d="${d}" fill="${c}" ${extra}/>`;
export const face = (d: string, c: string): string =>
  `<path d="${d}" fill="${c}" stroke="${c}" stroke-width=".7" stroke-linejoin="round"/>`;
export const shape = (pts: Vec3[], c: string, w = 0.9): string => fill(pd(pts), c) + (w ? ink(pd(pts), w) : '');
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
    sp(hull(pts3.map(([x, y, z]) => P(x + (z - z0) * SH[0] * k, y + (z - z0) * SH[1] * k, z0)))),
    SHADOW,
  );
  return clip ? clipTo(clip, s) : s;
};

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

/** 흔들림·종이결 필터. wobble 은 원본 슬라이더의 기본값 2.4. */
export const filterFor = (id: string, k: number, wobble = 2.4): string =>
  `<filter id="${id}" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${(0.045 / k).toFixed(4)}" numOctaves="2" seed="4" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="${(wobble * k).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="wob"/>
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
