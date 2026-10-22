/*
 * 타일 벽화와 돋보기 figure 의 상태와 계산. 그리기는 lensScene.ts 가 맡는다.
 *
 * 그림은 scene.ts 의 장면을 격자로 굳힌 타일 벽화다. 타일 하나가 칸 하나이고 색 하나만 담는다.
 * 돋보기는 벽화 앞에 서서 초점 자리를 크게 보여 준다. 배율을 올리면 렌즈 안의 타일이 커질 뿐,
 * 타일 안쪽에 새로 보이는 것은 없다 (칸 안쪽은 처음부터 저장되지 않았다).
 *
 * 돋보기가 서는 자리(초점)는 바깥이 정한다 (아래 도형 견주기 화면과 함께 쓴다). figure 는 그 자리로
 * 돋보기를 옮겨 가는 움직임만 갖는다.
 */
import { visibleCells, type Rgb, type Viewport } from './scene';

/** 벽화 그림의 한 변과 렌즈의 반지름 (세계 단위). */
export const PICTURE_SIDE = 84;
export const LENS_RADIUS = 17;
/**
 * 1배에서 렌즈 지름에 들어오는 그림 폭 (그림 한 변 = 1). 렌즈 지름 ÷ 그림 한 변이라, 1배 렌즈는 벽화를 같은
 * 크기로 보여 준다. 배율 z 면 렌즈 안의 타일이 벽화의 타일보다 z 배 크다 (실제 돋보기처럼).
 * 그래서 칸이 촘촘하고 배율이 크면 렌즈에 칸 하나만 들어온다 — 같은 칸이 커질 뿐이다.
 */
export const LENS_SPAN = (2 * LENS_RADIUS) / PICTURE_SIDE;
/** 돋보기가 옮겨 가는 빠르기 (그림 한 변 / 초). */
const MOVE_SPEED = 1.4;

export interface LensState {
  /** 지금 돋보기가 선 자리 (그림 좌표 0..1, y 는 아래로). */
  x: number;
  y: number;
  /** 옮겨 갈 자리. */
  tx: number;
  ty: number;
}

export const initialLens = (focus: { x: number; y: number }): LensState => ({
  x: focus.x,
  y: focus.y,
  tx: focus.x,
  ty: focus.y,
});

export const isSettled = (s: LensState): boolean => s.x === s.tx && s.y === s.ty;

/** 옮겨 갈 자리를 바꾼다. 같은 자리면 s 를 그대로 돌려준다. */
export const retarget = (s: LensState, focus: { x: number; y: number }): LensState =>
  s.tx === focus.x && s.ty === focus.y ? s : { ...s, tx: focus.x, ty: focus.y };

/** 시간이 dt 초 흐른 뒤. 다 왔으면 목표 자리에 정확히 선다. */
export function advanceLens(s: LensState, dt: number): LensState {
  if (isSettled(s) || dt <= 0) return s;
  const dx = s.tx - s.x;
  const dy = s.ty - s.y;
  const d = Math.hypot(dx, dy);
  const step = MOVE_SPEED * dt;
  if (d <= step) return { ...s, x: s.tx, y: s.ty };
  return { ...s, x: s.x + (dx / d) * step, y: s.y + (dy / d) * step };
}

/** 렌즈에 보이는 그림의 구역 (렌즈 지름을 한 변으로 하는 정사각형). */
export function lensView(cx: number, cy: number, zoom: number): Viewport {
  const size = LENS_SPAN / Math.max(1, zoom);
  return { x: cx - size / 2, y: cy - size / 2, size };
}

/**
 * 렌즈의 동그라미에 조금이라도 걸치는 칸 수. 그림 밖은 세지 않는다.
 * 칸 [c, c+1) × [r, r+1) 에서 원의 중심에 가장 가까운 점이 반지름 안이면 걸친다.
 */
export function cellsInLens(cx: number, cy: number, zoom: number, gridSize: number): number {
  const view = lensView(cx, cy, zoom);
  const r = (view.size / 2) * gridSize;
  const ccx = cx * gridSize;
  const ccy = cy * gridSize;
  const { colStart, colEnd, rowStart, rowEnd } = visibleCells(view, gridSize);
  let n = 0;
  for (let row = rowStart; row < rowEnd; row++) {
    const ny = Math.max(row, Math.min(ccy, row + 1));
    for (let col = colStart; col < colEnd; col++) {
      const nx = Math.max(col, Math.min(ccx, col + 1));
      if ((nx - ccx) ** 2 + (ny - ccy) ** 2 < r * r) n += 1;
    }
  }
  return n;
}

/** 한 행에서 같은 색이 이어진 칸들. [c0, c1) */
export interface Run {
  row: number;
  c0: number;
  c1: number;
  color: Rgb;
}

/** 행·열 범위 안의 칸을 같은 색끼리 이어 붙인다. 타일 수만큼 도형을 그리지 않기 위해서다. */
export function runs(cells: Rgb[], gridSize: number, rows: [number, number], cols: [number, number]): Run[] {
  const out: Run[] = [];
  for (let row = rows[0]; row < rows[1]; row++) {
    let start = cols[0];
    for (let col = cols[0] + 1; col <= cols[1]; col++) {
      const a = cells[row * gridSize + start];
      const b = col < cols[1] ? cells[row * gridSize + col] : null;
      if (!b || b.r !== a.r || b.g !== a.g || b.b !== a.b) {
        out.push({ row, c0: start, c1: col, color: a });
        start = col;
      }
    }
  }
  return out;
}

/**
 * 화면의 세 점(그림 구역의 왼쪽 위, 오른쪽 위, 왼쪽 아래)과 그 자리의 그림 좌표로, 화면의 한 점이 그림의 어디인지 푼다.
 * 렌즈와 벽화를 누른 자리를 초점으로 옮길 때 쓴다.
 */
export function pictureAt(
  p: [number, number],
  a: [number, number],
  b: [number, number],
  c: [number, number],
  pic: { x: number; y: number; w: number; h: number },
): { x: number; y: number } {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const det = ux * vy - uy * vx;
  const px = p[0] - a[0];
  const py = p[1] - a[1];
  const s = (px * vy - py * vx) / det;
  const t = (ux * py - uy * px) / det;
  return { x: pic.x + s * pic.w, y: pic.y + t * pic.h };
}

/** 초점을 그림 안으로 묶는다. */
export const clampFocus = (f: { x: number; y: number }) => ({
  x: Math.min(1, Math.max(0, f.x)),
  y: Math.min(1, Math.max(0, f.y)),
});
