/*
 * 점 찍는 기계 figure 의 장면. 나무판 위 오른쪽에 점판(종이에 정사각형과 꼭 맞는 원)을 단 기계,
 * 왼쪽에 원 안·원 밖 비율 막대 두 개를 단 판이 선다.
 *
 * 기계: 위아래 가로 레일을 따라 세로 막대가 가로 자리(x)로 가고, 펜 머리가 막대를 따라 세로 자리(y)로 가서
 * 종이를 콕 찍는다. 펜 끝은 펜 머리 뒤에 가려 보이지 않는다.
 *
 * 그리는 순서: 판 → 그림자 → 기계 판(멀다) → 종이·원·눈금 → 점 → 아래 레일 → 세로 막대 → 위 레일 → 펜 머리
 *   → 비율 막대 판(가깝다) → 이름표.
 */
import {
  CERAMIC,
  INK,
  METAL,
  PALS,
  WOOD,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  cylX,
  ellUV,
  fill,
  ink,
  line,
  on,
  P,
  pd,
  PX,
  rectUV,
  rod,
  shape,
  tag,
  tone,
  tx,
  type Vec3,
} from '@/lib/colorfigures/core';
import { MONO_FONT, palette } from '@/styles/palette';
import type { Dart } from './pi';
import { insideCount, penAt, type PlotterState } from './plotter';

const BOARD_H = 3;
const BOARD: [number, number, number, number] = [0, 0, 30, 156];

/** 기계 판: 앞면 x = PANEL_X. */
const PANEL_X = 10;
const PANEL = { y0: 6, y1: 100, z1: 101 };
/** 종이 위 정사각형: 한 변 2 가 2 × SQ 단위. 가운데 (CY, CZ). */
const SQ = 39;
const CY = 53;
const CZ = 55;
/** 레일과 세로 막대가 지나는 x. 종이 바로 앞이다. */
const RAIL_X = 12.5;
const RAIL_Z = { bottom: 8, top: 98 };
const RAIL_Y = { y0: PANEL.y0 + 3, y1: PANEL.y1 - 3 };
/** 펜 머리 상자 (펜 자리에서 ± HEAD). */
const HEAD = 3.2;
const HEAD_X1 = 18;

/** 비율 막대 판. */
const TALLY = { y0: 108, y1: 150, z1: 84 };
/** 막대 두 개의 y 범위와 높이 범위 (0% → 100%). */
const BAR_IN = { y0: 132, y1: 142 };
const BAR_OUT = { y0: 116, y1: 126 };
const BAR_Z0 = 18;
const BAR_H = 56;

/** 장면의 경계 상자 [W, D, H]. 펜 머리가 앞으로 가장 튀어나온 자리까지. */
export const PLOTTER_SIZE: Vec3 = [BOARD[2], BOARD[3], PANEL.z1];

/** 본문의 색: 주황은 원 안, 파랑은 원 밖. */
const ORANGE = palette['chart-warm'];
const BLUE = palette['blue-soft'];
const BODY = PALS.mint;

/** 정사각형 좌표 (x, y ∈ [-1, 1]) → 종이 위 3D 점. 수학의 x 가 커지면 보는 사람의 오른쪽(−y)이다. */
export const paperPoint = (x: number, y: number, dx = 0.05): Vec3 => [PANEL_X + dx, CY - x * SQ, CZ + y * SQ];

/** 고정폭 숫자 (눈금). 한글이 섞이지 않은 글자만. */
const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);

/** 상자의 여덟 꼭짓점 (그림자용). */
const corners = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Vec3[] =>
  [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [z0, z1].map((z) => [x, y, z] as Vec3)));

/** 점 크기: 점이 많을수록 작게. */
export const dotWidth = (n: number): number => Math.max(1.2, Math.min(5, 5.6 - 1.1 * Math.log10(Math.max(1, n))));

/** 점들을 색마다 path 하나로. 둥근 끝의 길이 0 선이 점 하나다. */
function dots(darts: Dart[]): string {
  if (!darts.length) return '';
  const w = dotWidth(darts.length).toFixed(2);
  let a = '';
  let b = '';
  for (const d of darts) {
    const [u, v] = P(...paperPoint(d.x, d.y));
    const m = `M${u.toFixed(1)} ${v.toFixed(1)}h0`;
    if (d.inside) a += m;
    else b += m;
  }
  const path = (dd: string, c: string) =>
    dd ? `<path d="${dd}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>` : '';
  return path(b, BLUE) + path(a, ORANGE);
}

/** 기계 판과 종이, 원, 눈금. */
function machineBack(): string {
  let s = box(PANEL_X - 4, PANEL.y0, BOARD_H, PANEL_X, PANEL.y1, PANEL.z1, BODY, tone, 1.2);
  const paper = on(PX(PANEL_X + 0.02), rectUV(CY - SQ, CZ - SQ, CY + SQ, CZ + SQ));
  s += shape(paper, CERAMIC.l, 1.3);
  s += ink(pd(on(PX(PANEL_X + 0.04), ellUV(CY, CZ, SQ, SQ, 72))), 1.3);
  // 가로 눈금 −1, 0, 1 은 아래에, 세로 눈금 0, 1 은 왼쪽에. 왼쪽 아래 모서리의 −1 은 가로 눈금 하나로 같이 읽는다.
  for (const t of [-1, 0, 1]) {
    s += line([paperPoint(t, -1), paperPoint(t, -1.06)], 0.9);
    const [, y, z] = paperPoint(t, -1);
    s += mono(tx(PANEL_X + 0.05, y, z - 3.9, String(t), 3.2));
  }
  for (const t of [0, 1]) {
    s += line([paperPoint(-1, t), paperPoint(-1.06, t)], 0.9);
    const [, y, z] = paperPoint(-1, t);
    s += mono(tx(PANEL_X + 0.05, y + 3.6, z - 1.1, String(t), 3.2));
  }
  return s;
}

/** 위아래 레일 하나. */
const rail = (z: number) =>
  rod([RAIL_X, RAIL_Y.y0, z], [RAIL_X, RAIL_Y.y1, z], 1.1, METAL, tone, 1) +
  box(PANEL_X, RAIL_Y.y0 - 1.5, z - 1.5, RAIL_X + 1, RAIL_Y.y0, z + 1.5, METAL, tone, 0.8) +
  box(PANEL_X, RAIL_Y.y1, z - 1.5, RAIL_X + 1, RAIL_Y.y1 + 1.5, z + 1.5, METAL, tone, 0.8);

/** 세로 막대와 양 끝의 미끄럼 쇠. 펜의 가로 자리 y 에 있다. */
function gantry(y: number): string {
  let s = rod([RAIL_X + 1, y, RAIL_Z.bottom], [RAIL_X + 1, y, RAIL_Z.top], 0.8, METAL, tone, 1);
  for (const z of [RAIL_Z.bottom, RAIL_Z.top]) s += box(RAIL_X - 1.6, y - 2.4, z - 2, RAIL_X + 2.6, y + 2.4, z + 2, DARK_METAL, tone, 0.9);
  return s;
}
const DARK_METAL = { l: METAL.m, m: METAL.d, d: '#5f676a' };

/** 펜 머리: 세로 막대에 걸린 상자와 앞으로 나온 펜 꼭지. */
function penHead(y: number, z: number): string {
  return (
    box(RAIL_X - 0.5, y - HEAD, z - HEAD, HEAD_X1 - 2, y + HEAD, z + HEAD, PALS.mustard, tone, 1) +
    cylX(HEAD_X1 - 2, HEAD_X1, y, z, 1.3, PALS.tomato, tone, 1)
  );
}

/** 비율 막대 하나: 유리관 안에 비율만큼 찬 색 기둥과 이론값 눈금. */
function bar(y0: number, y1: number, share: number | null, color: string, theory: number): string {
  const x = PANEL_X + 0.05;
  const tube = on(PX(x), rectUV(y0, BAR_Z0, y1, BAR_Z0 + BAR_H));
  let s = shape(tube, '#e8f2f2', 0.9);
  if (share !== null && share > 0) {
    s += clipTo(tube, fill(pd(on(PX(x + 0.01), rectUV(y0, BAR_Z0, y1, BAR_Z0 + BAR_H * share))), color));
  }
  s += ink(pd(tube), 1.3);
  const tz = BAR_Z0 + BAR_H * theory;
  s += `<path d="${pd([[x + 0.02, y0 - 1.6, tz], [x + 0.02, y1 + 1.6, tz]], false)}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="2.2 1.6"/>`;
  return s;
}

/** 비율 막대 판: 원 안(왼쪽), 원 밖(오른쪽), 0·50·100 눈금. */
function tallyBoard(s: PlotterState): string {
  const total = s.darts.length;
  const inside = insideCount(s);
  const shareIn = total ? inside / total : null;
  const shareOut = total ? (total - inside) / total : null;
  let out = box(PANEL_X - 4, TALLY.y0, BOARD_H, PANEL_X, TALLY.y1, TALLY.z1, BODY, tone, 1.2);
  out += bar(BAR_IN.y0, BAR_IN.y1, shareIn, ORANGE, Math.PI / 4);
  out += bar(BAR_OUT.y0, BAR_OUT.y1, shareOut, BLUE, 1 - Math.PI / 4);
  out += tx(PANEL_X + 0.05, (BAR_IN.y0 + BAR_IN.y1) / 2, BAR_Z0 - 6, '원 안', 4);
  out += tx(PANEL_X + 0.05, (BAR_OUT.y0 + BAR_OUT.y1) / 2, BAR_Z0 - 6, '원 밖', 4);
  for (const [pct, z] of [[0, BAR_Z0], [50, BAR_Z0 + BAR_H / 2], [100, BAR_Z0 + BAR_H]] as const) {
    out += line([[PANEL_X + 0.05, BAR_IN.y1 + 0.5, z], [PANEL_X + 0.05, BAR_IN.y1 + 2, z]], 0.8);
    out += mono(tx(PANEL_X + 0.05, BAR_IN.y1 + 4.6, z - 1.1, String(pct), 3));
  }
  return out;
}

/** 장면 전체. */
export function plotterScene(s: PlotterState): string {
  const pen = penAt(s);
  const [, penY, penZ] = paperPoint(pen.x, pen.y);
  const busy = s.queue > 0;

  let out = board(...BOARD, BOARD_H, 6, WOOD);
  out += clipTo(
    boardTop(...BOARD, BOARD_H, 6),
    castShadow(corners(PANEL_X - 4, PANEL.y0, BOARD_H, PANEL_X, PANEL.y1, PANEL.z1), BOARD_H) +
      castShadow(corners(PANEL_X - 4, TALLY.y0, BOARD_H, PANEL_X, TALLY.y1, TALLY.z1), BOARD_H),
  );
  out += machineBack();
  out += dots(s.darts);
  out += rail(RAIL_Z.bottom);
  out += gantry(penY);
  out += rail(RAIL_Z.top);
  out += penHead(penY, penZ);
  out += tallyBoard(s);

  // 펜 이름표는 종이 가운데 쪽으로 단다. 펜이 왼쪽 반에 있을 때 왼쪽으로 달면 비율 막대 판의 이름표와 겹친다.
  out += tag([HEAD_X1, penY, penZ + 1], pen.x < 0 ? 30 : -30, -26, '펜', busy);
  out += tag([PANEL_X, BAR_IN.y1, BAR_Z0 + BAR_H * (Math.PI / 4)], -26, -46, '이론값 π/4');
  return out;
}
