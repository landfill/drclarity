/*
 * 피자 figure 의 장면. 나무 도마 위에 피자 두 판: 왼쪽이 10진법, 오른쪽이 2진법.
 *
 * 피자 한 판은 칼자국 사이의 조각들로 그린다. 조각은 모두 180° 이하라 볼록하다.
 * 움직이지 않는 조각끼리는 화면에서 겹치지 않으므로, 이웃이 빠져나간 자리의 단면만 그리면
 * 그리는 순서가 상관없다. 꺼내거나 들어 올린 조각은 그 뒤에 먼 것부터 그린다.
 */
import {
  WOOD,
  board,
  boardTop,
  byDepth,
  castShadow,
  clipTo,
  currentView,
  ease,
  ellUV,
  fill,
  ink,
  line,
  on,
  pd,
  PZ,
  shape,
  tag,
  tone,
  toneI,
  vis,
  type Mat,
  type Vec3,
} from '@/lib/colorfigures/core';
import { DECIMAL_PIECES, UNITS, binaryCuts, binaryTries, type PizzaState } from './pizza';

const R = 30; // 피자 반지름
const TH = 3.5; // 피자 두께
const BOARD_H = 3;
const BOARD: [number, number, number, number] = [2, 2, 82, 154];
const PULL = 9; // 꺼낸 조각이 밀려나는 거리
const LIFT = 3; // 들어 올리는 높이
/** 0.1 자리가 시작하는 각도. 조각의 가운데가 보는 사람 쪽(시점의 방위각)을 향한다. */
const sliceStart = () => currentView().az - 18;

const DECIMAL = { cx: 40, cy: 114 };
const BINARY = { cx: 40, cy: 40 };

/** 장면의 경계 상자 [W, D, H]: 도마와 들어 올린 조각까지. */
export const PIZZA_SIZE: Vec3 = [84, 156, BOARD_H + TH + LIFT];

const CRUST: Mat = { l: '#e8b874', m: '#cf9a56', d: '#9a6a34' };
const DOUGH: Mat = { l: '#f4dfae', m: '#e2c487', d: '#b99659' };
const SAUCE = '#d65a3c';
const CHEESE = '#f8d873';
const PEPPERONI = '#b5412e';

/** 페퍼로니 자리 (반지름, 각도°). 두 판이 같다. */
const TOPPINGS: [number, number][] = [
  [21, 40],
  [11, 95],
  [20, 140],
  [13, 205],
  [21, 250],
  [9, 315],
  [20, 345],
];
const TOPPING_R = 3.3;

interface Piece {
  a0: number;
  a1: number;
  full: boolean;
  pull: number;
  lift: number;
}

/** 도 → 라디안. */
const rad = (deg: number) => (deg * Math.PI) / 180;
/** 조각이 제자리에서 움직였는가 (꺼냈거나 들어 올렸다). */
const moved = (p: Piece) => p.pull > 0.01 || p.lift > 0.01;

interface Pizza {
  cx: number;
  cy: number;
}

/** 조각이 놓인 자리: 가운데 점과 바닥 높이. */
function placement(pz: Pizza, p: Piece) {
  const b = rad((p.a0 + p.a1) / 2);
  const ox = p.full ? 0 : p.pull * Math.cos(b);
  const oy = p.full ? 0 : p.pull * Math.sin(b);
  return { x: pz.cx + ox, y: pz.cy + oy, z0: BOARD_H + p.lift };
}

/** 조각 테두리를 8° 안팎 간격으로 나눈 각도들. */
function arcAngles(p: Piece): number[] {
  const span = p.a1 - p.a0;
  const n = Math.max(1, Math.ceil(span / 8));
  return Array.from({ length: n + 1 }, (_, i) => p.a0 + (span * i) / n);
}

/** 가운데 (x, y) 에서 반지름 r, 각도 a 인 높이 z 의 점. */
const rim = (x: number, y: number, z: number, r: number, a: number): Vec3 => [
  x + r * Math.cos(rad(a)),
  y + r * Math.sin(rad(a)),
  z,
];

/** 조각 윗면 외곽선 (반지름 r). 통째인 판이면 원. */
function topOutline(pz: Pizza, p: Piece, r: number, z: number): Vec3[] {
  const { x, y } = placement(pz, p);
  if (p.full) return on(PZ(z), ellUV(x, y, r, r, 48));
  return [[x, y, z], ...arcAngles(p).map((a) => rim(x, y, z, r, a))];
}

/** 조각의 모든 점 (그림자용). */
function piecePoints(pz: Pizza, p: Piece): Vec3[] {
  const { z0 } = placement(pz, p);
  return [...topOutline(pz, p, R, z0), ...topOutline(pz, p, R, z0 + TH)];
}

/** 조각 하나: 단면, 크러스트 옆면, 윗면(소스·치즈·페퍼로니), 잉크. face0/face1 = 양쪽 단면을 그릴지. */
function pieceSvg(pz: Pizza, p: Piece, face0: boolean, face1: boolean): string {
  const { x, y, z0 } = placement(pz, p);
  const z1 = z0 + TH;
  let s = '';

  // 단면: 칼로 자른 면. 이웃이 빠져나갔거나 이 조각이 움직였을 때만 보인다.
  if (!p.full) {
    const radial = (a: number, n: Vec3) =>
      vis(n) ? shape([[x, y, z0], rim(x, y, z0, R, a), rim(x, y, z1, R, a), [x, y, z1]], toneI(n, DOUGH), 0.7) : '';
    if (face0) s += radial(p.a0, [Math.sin(rad(p.a0)), -Math.cos(rad(p.a0)), 0]);
    if (face1) s += radial(p.a1, [-Math.sin(rad(p.a1)), Math.cos(rad(p.a1)), 0]);
  }

  // 바깥 테두리 (크러스트 옆면)
  // 통째인 판은 보이는 테두리(방위각 ± 90°)가 끊기지 않도록 방위각 − 90° 에서 시작한다.
  const ringStart = currentView().az - 90;
  const angles = p.full ? Array.from({ length: 49 }, (_, i) => ringStart + (i * 360) / 48) : arcAngles(p);
  const bottomArc: Vec3[][] = [];
  let run: Vec3[] = [];
  for (let i = 0; i < angles.length - 1; i++) {
    const am = (angles[i] + angles[i + 1]) / 2;
    const n: Vec3 = [Math.cos(rad(am)), Math.sin(rad(am)), 0];
    if (!vis(n)) {
      if (run.length) bottomArc.push(run);
      run = [];
      continue;
    }
    const b0 = rim(x, y, z0, R, angles[i]);
    const b1 = rim(x, y, z0, R, angles[i + 1]);
    s += `<path d="${pd([b0, b1, rim(x, y, z1, R, angles[i + 1]), rim(x, y, z1, R, angles[i])])}" fill="${tone(n, CRUST)}" stroke="${tone(n, CRUST)}" stroke-width=".7" stroke-linejoin="round"/>`;
    if (!run.length) run.push(b0);
    run.push(b1);
  }
  if (run.length) bottomArc.push(run);

  // 윗면: 크러스트 → 소스 → 치즈 → 페퍼로니
  const top = topOutline(pz, p, R, z1);
  s += fill(pd(top), CRUST.l);
  s += fill(pd(topOutline(pz, p, R - 2.4, z1)), SAUCE);
  const cheese = topOutline(pz, p, R - 3.4, z1);
  s += fill(pd(cheese), CHEESE);
  let toppings = '';
  for (const [tr, ta] of TOPPINGS) {
    const margin = (Math.asin(TOPPING_R / tr) * 180) / Math.PI;
    const inside = p.full || angleIn(ta, p.a0 - margin, p.a1 + margin);
    if (!inside) continue;
    const c = rim(x, y, z1, tr, ta);
    toppings += shape(on(PZ(z1), ellUV(c[0], c[1], TOPPING_R, TOPPING_R, 16)), PEPPERONI, 0.6);
  }
  if (toppings) s += p.full ? toppings : clipTo(cheese, toppings);

  // 잉크: 윗면 외곽, 보이는 바닥 테두리, 양 끝 세로선
  s += ink(pd(top), moved(p) ? 1.3 : 1.0);
  for (const arc of bottomArc) {
    s += line(arc, 1.5);
    s += line([arc[0], [arc[0][0], arc[0][1], z1]], 1.0);
    const last = arc[arc.length - 1];
    s += line([last, [last[0], last[1], z1]], 1.0);
  }
  return s;
}

/** a 가 [lo, hi] 안에 드는가 (360° 를 돌아서 비교). */
function angleIn(a: number, lo: number, hi: number): boolean {
  const t = (((a - lo) % 360) + 360) % 360;
  return t <= hi - lo;
}

interface Drawn {
  pizza: Pizza;
  pieces: Piece[];
}

/** 10진법 피자의 조각들. 다 자르기 전에는 통째인 판 하나. */
function decimalPieces(s: PizzaState): Piece[] {
  if (s.decCut < DECIMAL_PIECES) return [{ a0: 0, a1: 360, full: true, pull: 0, lift: 0 }];
  const t = s.decPull;
  const A0 = sliceStart();
  return Array.from({ length: DECIMAL_PIECES }, (_, i) => ({
    a0: A0 + i * 36,
    a1: A0 + (i + 1) * 36,
    full: false,
    pull: i === 0 ? PULL * ease(t) : 0,
    lift: i === 0 ? LIFT * Math.sin(Math.PI * t) : 0,
  }));
}

/** 칸 수 → 판 위의 각도. */
const unitDeg = (u: number) => sliceStart() + (360 * u) / UNITS;

/** 2진법 피자의 조각들: 칼자국 사이마다 하나. 담은 조각은 밀려나 있고, 마지막으로 대 본 조각은 움직이는 중일 수 있다. */
function binaryPieces(s: PizzaState): Piece[] {
  const cuts = binaryCuts(s.binSteps);
  if (cuts.length < 2) return [{ a0: 0, a1: 360, full: true, pull: 0, lift: 0 }];
  const tries = binaryTries(s.binSteps);
  const latest = tries[tries.length - 1];
  return cuts.map((c, i) => {
    const end = i + 1 < cuts.length ? cuts[i + 1] : cuts[0] + UNITS;
    const tr = tries.find((t) => t.start === c && t.start + t.size === end && (t.keep || t === latest));
    let pull = 0;
    let lift = 0;
    if (tr === latest) {
      const t = s.binT;
      lift = LIFT * Math.sin(Math.PI * t);
      pull = tr.keep ? PULL * ease(t) : 2 * Math.sin(Math.PI * t);
    } else if (tr?.keep) {
      pull = PULL;
    }
    return { a0: unitDeg(c), a1: unitDeg(end), full: false, pull, lift };
  });
}

/** 그 판의 조각 그림. 움직이지 않는 조각은 여기서, 움직인 조각은 depth 목록으로 넘긴다. */
function drawPizza({ pizza, pieces }: Drawn, movedParts: { at: Vec3; svg: string }[]): string {
  let s = '';
  pieces.forEach((p, i) => {
    const prev = pieces[(i - 1 + pieces.length) % pieces.length];
    const next = pieces[(i + 1) % pieces.length];
    if (moved(p)) {
      const { x, y, z0 } = placement(pizza, p);
      const b = rad((p.a0 + p.a1) / 2);
      movedParts.push({
        at: [x + (R / 2) * Math.cos(b), y + (R / 2) * Math.sin(b), z0],
        svg: pieceSvg(pizza, p, true, true),
      });
    } else {
      s += pieceSvg(pizza, p, moved(prev), moved(next));
    }
  });
  return s;
}

/** 칼질 중인 10진법 피자: 통째인 판 위에 칼자국만 긋는다. */
function cutLines(s: PizzaState): string {
  if (s.decCut >= DECIMAL_PIECES) return '';
  const z = BOARD_H + TH;
  let out = '';
  for (let i = 0; i < Math.floor(s.decCut); i++) {
    const a = sliceStart() + i * 36;
    out += line([[DECIMAL.cx, DECIMAL.cy, z], rim(DECIMAL.cx, DECIMAL.cy, z, R, a)], 1.0);
  }
  return out;
}

/** 조각 윗면의 가운데 (이름표 자리). */
function pieceTop(pz: Pizza, p: Piece): Vec3 {
  const { x, y, z0 } = placement(pz, p);
  return rim(x, y, z0 + TH, R * 0.62, (p.a0 + p.a1) / 2);
}

/** 장면 전체: 도마 → 그림자 → 움직이지 않은 조각 → 움직인 조각 → 이름표. */
export function pizzaScene(s: PizzaState): string {
  const dec: Drawn = { pizza: DECIMAL, pieces: decimalPieces(s) };
  const bin: Drawn = { pizza: BINARY, pieces: binaryPieces(s) };

  let out = board(...BOARD, BOARD_H, 8, WOOD);
  const clip = boardTop(...BOARD, BOARD_H, 8);
  const shadows = [dec, bin]
    .flatMap(({ pizza, pieces }) => pieces.map((p) => castShadow(piecePoints(pizza, p), BOARD_H)))
    .join('');
  out += clipTo(clip, shadows);

  const movedParts: { at: Vec3; svg: string }[] = [];
  out += drawPizza(dec, movedParts);
  out += cutLines(s);
  out += drawPizza(bin, movedParts);
  out += byDepth(movedParts);

  // 이름표
  out += tag([DECIMAL.cx - 14, DECIMAL.cy + 6, BOARD_H + TH], -18, -62, '10진법 피자');
  out += tag([BINARY.cx - 14, BINARY.cy - 6, BOARD_H + TH], 30, -62, '2진법 피자');
  if (s.decPullTarget === 1 && s.decCut >= DECIMAL_PIECES) {
    out += tag(pieceTop(DECIMAL, dec.pieces[0]), -54, 34, '0.1', s.decPull < 1);
  }
  const tries = binaryTries(s.binSteps);
  const latest = tries[tries.length - 1];
  if (latest) {
    const piece = bin.pieces.find((p) => Math.abs(p.a0 - unitDeg(latest.start)) < 1e-9 && Math.abs(p.a1 - unitDeg(latest.start + latest.size)) < 1e-9);
    if (piece) {
      const text = `1/${latest.denominator} ${latest.keep ? '담음' : '큼'}`;
      out += tag(pieceTop(BINARY, piece), 84, 46, text, s.binT < 1);
    }
  }
  return out;
}
