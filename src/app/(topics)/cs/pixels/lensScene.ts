/*
 * 타일 벽화와 돋보기 figure 의 장면. 받침판 위 왼쪽에 나무 틀을 두른 타일 벽화가 서 있고, 오른쪽 스탠드의 팔이
 * 돋보기를 벽화 앞에 들고 있다. 돋보기는 초점 자리와 보는 사람을 잇는 시선 위에 있어 화면에서 초점과 겹친다.
 *
 * 렌즈 안에는 벽화의 같은 타일을 배율만큼 크게 그린다. 타일 안은 한 색이고, 격자선을 켜면 타일 사이 줄눈이 보인다.
 *
 * 그리는 순서: 받침판 → 그림자 → 벽화 틀 → 타일 → (스탠드 기둥) → 렌즈 속 타일 → 렌즈 테 → 팔.
 */
import {
  BOARD,
  INK,
  METAL,
  WOOD,
  P,
  act,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  currentView,
  cyl,
  ellUV,
  fill,
  ink,
  on,
  pd,
  PX,
  rod,
  shape,
  tone,
  type Vec3,
} from '@/lib/colorfigures/core';
import { rgbToHex, visibleCells, type Rgb } from './scene';
import { LENS_RADIUS, PICTURE_SIDE, lensView, runs } from './lens';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 44, 152];
/** 벽화 틀: 앞면 x = FX. */
const FX = 8;
const FRAME = { y0: 44, y1: 148, z1: 118 };
/** 그림이 놓인 자리: 그림 x = 0 이 Y_LEFT, 그림 y = 0 이 Z_TOP. 한 변 PS. */
const Y_LEFT = 142;
const Z_TOP = 112;
const PS = PICTURE_SIDE;
const TILE_X = FX + 0.05;
/** 렌즈: 반지름, 시선 위로 벽화에서 떨어진 거리. */
const LENS_R = LENS_RADIUS;
const LENS_RIM = 2.2;
const LENS_D = 16;
/** 스탠드. */
const STAND = { x: 32, y: 20, top: 122 };

export const LENS_SIZE: Vec3 = [BASE[2], BASE[3], STAND.top + 2];

/** 줄눈: 옅은 잉크. 흰 구름 타일 위에서도 보여야 한다 (예전 격자선도 잉크 25%였다). */
const GROUT_OPACITY = 0.28;
/** 줄눈을 그리는 타일 크기의 하한 (세계 단위). 이보다 작으면 줄눈만 보인다. */
const GROUT_MIN = 2.4;

/** 그림 좌표 → 벽화 위 3D 점. */
export const onPicture = (px: number, py: number, x = TILE_X): Vec3 => [x, Y_LEFT - px * PS, Z_TOP - py * PS];

/** 보는 사람 쪽 단위 벡터 (현재 시점). */
function eyeVec(): Vec3 {
  const { az, el } = currentView();
  const a = (az * Math.PI) / 180;
  const b = (el * Math.PI) / 180;
  return [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)];
}

/** 렌즈의 가운데: 초점 자리에서 시선을 따라 LENS_D 만큼 앞. 화면에서는 초점과 같은 자리다. */
export function lensCenter(px: number, py: number): Vec3 {
  const f = onPicture(px, py);
  const e = eyeVec();
  return [f[0] + e[0] * LENS_D, f[1] + e[1] * LENS_D, f[2] + e[2] * LENS_D];
}

/** 렌즈 평면 위의 한 점 (u 오른쪽, v 아래, 세계 단위). */
const onLens = (c: Vec3, u: number, v: number): Vec3 => [c[0], c[1] - u, c[2] - v];

/** 같은 색 칸 묶음을 path 하나로. 칸 [c0, c1) × [row, row+1) 을 to(col, row) 로 옮긴다. */
function runPaths(rs: ReturnType<typeof runs>, to: (col: number, row: number) => Vec3): string {
  const byColor = new Map<string, string>();
  for (const r of rs) {
    const hex = rgbToHex(r.color);
    const d = pd([to(r.c0, r.row), to(r.c1, r.row), to(r.c1, r.row + 1), to(r.c0, r.row + 1)]);
    byColor.set(hex, (byColor.get(hex) ?? '') + d);
  }
  // 칸 사이가 비어 보이지 않도록 같은 색 테두리를 얇게 두른다.
  return [...byColor].map(([c, d]) => `<path d="${d}" fill="${c}" stroke="${c}" stroke-width=".35"/>`).join('');
}

/** 줄눈: 열과 행 경계마다 선 하나. */
function groutLines(cols: [number, number], rows: [number, number], to: (col: number, row: number) => Vec3): string {
  let d = '';
  for (let c = cols[0]; c <= cols[1]; c++) d += pd([to(c, rows[0]), to(c, rows[1])], false);
  for (let r = rows[0]; r <= rows[1]; r++) d += pd([to(cols[0], r), to(cols[1], r)], false);
  return `<path class="grout" d="${d}" fill="none" stroke="${INK}" stroke-opacity="${GROUT_OPACITY}" stroke-width=".8"/>`;
}

/** 화면 좌표 세 점을 data 속성으로. 누른 자리를 그림 좌표로 풀 때 쓴다 (lens.ts 의 pictureAt). */
const mapData = (a: Vec3, b: Vec3, c: Vec3, pic: { x: number; y: number; w: number; h: number }) => {
  const s = (p: Vec3) => P(...p).map((v) => v.toFixed(2)).join(' ');
  return `data-a="${s(a)}" data-b="${s(b)}" data-c="${s(c)}" data-pic="${pic.x} ${pic.y} ${pic.w} ${pic.h}"`;
};

export interface LensSceneInput {
  cells: Rgb[];
  gridSize: number;
  zoom: number;
  showLines: boolean;
  /** 지금 돋보기가 선 자리. */
  lens: { x: number; y: number };
}

/** 벽화의 타일 전체. */
function mosaic(cells: Rgb[], g: number, showLines: boolean): string {
  const to = (col: number, row: number) => onPicture(col / g, row / g);
  let s = runPaths(runs(cells, g, [0, g], [0, g]), to);
  if (showLines && PS / g >= GROUT_MIN) s += groutLines([0, g], [0, g], to);
  return s;
}

/** 렌즈 속: 렌즈에 들어오는 구역의 타일을 렌즈 지름에 맞춰 크게 그린다. */
function lensContent(c: Vec3, inp: LensSceneInput): string {
  const { cells, gridSize: g, zoom, showLines, lens } = inp;
  const view = lensView(lens.x, lens.y, zoom);
  const k = (2 * LENS_R) / view.size; // 그림 한 변 1 → 세계 단위
  const to = (col: number, row: number) => onLens(c, (col / g - lens.x) * k, (row / g - lens.y) * k);
  const { colStart, colEnd, rowStart, rowEnd } = visibleCells(view, g);
  // 그림 밖(틀)은 나무색, 그 위에 그림 구역의 타일.
  let s = fill(pd(on(PX(c[0]), ellUV(c[1], c[2], LENS_R, LENS_R, 48))), WOOD.m);
  if (colEnd > colStart && rowEnd > rowStart) {
    s += runPaths(runs(cells, g, [rowStart, rowEnd], [colStart, colEnd]), to);
    if (showLines && k / g >= GROUT_MIN) s += groutLines([colStart, colEnd], [rowStart, rowEnd], to);
  }
  const pic = { x: view.x, y: view.y, w: view.size, h: view.size };
  const a = onLens(c, -LENS_R, -LENS_R);
  const b = onLens(c, LENS_R, -LENS_R);
  const cc = onLens(c, -LENS_R, LENS_R);
  return act('lens', clipTo(on(PX(c[0]), ellUV(c[1], c[2], LENS_R, LENS_R, 48)), s), mapData(a, b, cc, pic));
}

/** 렌즈 테: 렌즈 둘레의 고리. */
function lensRim(c: Vec3): string {
  const outer = on(PX(c[0] + 0.05), ellUV(c[1], c[2], LENS_R + LENS_RIM, LENS_R + LENS_RIM, 48));
  const inner = on(PX(c[0] + 0.05), ellUV(c[1], c[2], LENS_R, LENS_R, 48));
  const glare = on(PX(c[0] + 0.06), ellUV(c[1] + LENS_R * 0.45, c[2] + LENS_R * 0.5, LENS_R * 0.28, LENS_R * 0.1, 16));
  return (
    `<path d="${pd(outer)}${pd(inner)}" fill="${METAL.m}" fill-rule="evenodd"/>` +
    `<path d="${pd(glare)}" fill="#ffffff" opacity=".35" pointer-events="none"/>` +
    ink(pd(outer), 1.6) +
    ink(pd(inner), 1)
  );
}

/** 장면 전체. */
export function lensScene(inp: LensSceneInput): string {
  const c = lensCenter(inp.lens.x, inp.lens.y);
  let out = board(...BASE, BASE_H, 5, BOARD);
  out += clipTo(
    boardTop(...BASE, BASE_H, 5),
    castShadow(
      [FX - 4, FX].flatMap((x) => [FRAME.y0, FRAME.y1].flatMap((y) => [BASE_H, FRAME.z1].map((z) => [x, y, z] as Vec3))),
      BASE_H,
    ) +
      castShadow([[STAND.x - 1.2, STAND.y - 1.2, BASE_H], [STAND.x + 1.2, STAND.y + 1.2, BASE_H], [STAND.x, STAND.y, STAND.top]], BASE_H),
  );

  // 벽화: 나무 틀 → 타일
  out += box(FX - 4, FRAME.y0, BASE_H, FX, FRAME.y1, FRAME.z1, WOOD, tone, 1.2);
  const picOutline = [onPicture(0, 0), onPicture(1, 0), onPicture(1, 1), onPicture(0, 1)];
  out += act(
    'picture',
    mosaic(inp.cells, inp.gridSize, inp.showLines) + ink(pd(picOutline), 1.1),
    mapData(onPicture(0, 0), onPicture(1, 0), onPicture(0, 1), { x: 0, y: 0, w: 1, h: 1 }),
  );

  // 스탠드: 받침과 기둥
  out += cyl(STAND.x, STAND.y, BASE_H, BASE_H + 2, 7, METAL, tone, 1.1);
  out += rod([STAND.x, STAND.y, BASE_H + 2], [STAND.x, STAND.y, STAND.top], 1.2, METAL, tone, 1);

  // 돋보기
  out += lensContent(c, inp);
  out += lensRim(c);

  // 팔: 기둥 꼭대기에서 렌즈 테의 오른쪽 위로
  const rimPoint = onLens(c, LENS_R + LENS_RIM * 0.5, -LENS_R * 0.35);
  out += rod([STAND.x, STAND.y, STAND.top], rimPoint, 0.9, METAL, tone, 1);
  out += shape(on(PX(STAND.x), ellUV(STAND.y, STAND.top, 1.6, 1.6, 12)), METAL.d, 0.8);
  return out;
}

