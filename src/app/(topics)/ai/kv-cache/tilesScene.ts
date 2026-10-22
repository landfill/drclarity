/*
 * 타일 판 figure 의 장면. 받침판 위에 판 하나가 서 있다. 앞면은:
 *   - 왼쪽: 삼각형 타일 판. 줄 = 처리 단계(위에서 아래로), 칸 = 그때 K·V 를 가진 토큰(왼쪽에서 오른쪽으로).
 *     + 겨자색 = 새로 만든 K·V, ↶ 회색 = 메모 상자에서 꺼내 다시 쓴 K·V, 빈 칸 = 보지 않는 칸(미래 · 아직 처리하지 않은 줄).
 *     지금 줄은 파란 테로 짚는다. 색은 아래 범례(예전 격자)와 같다: accent · muted-2 · subtle · blue.
 *   - 오른쪽: "적어둔 메모" 상자. 캐시를 켜면 새로 만든 K·V 마다 메모 한 장이 쌓인다(메모리).
 *     캐시를 켜고 지금 줄에 다시 쓴 칸이 있으면, 상자에서 지금 줄로 점선을 긋는다.
 * 칸 수의 비율을 속도로 그리지 않는다 (about: 칸 수의 비율이 실제 속도 향상률은 아니다).
 *
 * 그리는 순서: 받침판 → 그림자 → 판 → 앞면 → 타일 → 지금 줄 → 메모 상자 → 글자.
 */
import {
  BOARD,
  CERAMIC,
  INK,
  PALS,
  WOOD,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  labelScale,
  line,
  on,
  pd,
  PX,
  rectUV,
  shape,
  tone,
  tx,
  type Vec3,
} from '@/lib/colorfigures/core';
import { koreanLabels } from '@/lib/colorfigures/fonts';
import { palette } from '@/styles/palette';
import { buildGrid, type CellState } from './grid';
import { readouts, type KvState } from './tiles';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 44, 196];
/** 판: 앞면 x = STAND.x1. 앞면 좌표는 (y, z) 이고 y 가 클수록 화면 왼쪽이다. */
const STAND = { x0: 10, x1: 14, y0: 4, y1: 192, z1: 132 };
const FACE = STAND.x1 + 0.05;
/** 타일 판: 왼쪽 위 모서리와 한 변의 길이. */
export const GRID = { u: 168, v: 112, size: 100 };
/** 메모 상자: 앞면 위의 자리와 앞으로 나온 깊이. */
export const MEMO = { u0: 12, u1: 64, v0: 22, v1: 86, depth: 10, cols: 2 };

export const TILES_SIZE: Vec3 = [BASE[2], BASE[3], STAND.z1];

/** 칸 색 (예전 격자의 CSS 와 같은 뜻). */
export const CELL_COLOR: Record<CellState, string> = { computed: PALS.mustard.m, reused: CERAMIC.d, empty: BOARD.l };

export const labelSize = (scale = labelScale()) => 4.4 * Math.min(1.4, scale);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

const face = (uv: [number, number][], dx = 0): Vec3[] => on(PX(FACE + dx), uv);

/** 칸 (줄 r, 칸 c) 의 네 변 (u 왼쪽·오른쪽, v 위·아래). */
export function cellBox(length: number, r: number, c: number) {
  const cs = GRID.size / length;
  return { uL: GRID.u - c * cs, uR: GRID.u - (c + 1) * cs, vT: GRID.v - r * cs, vB: GRID.v - (r + 1) * cs, cs };
}

/** + 표시: 두 선. ↶ 표시: 반원과 화살촉. 글자 대신 선으로 그려 작은 칸에서도 보이게 한다. */
function glyph(cell: CellState, u: number, v: number, k: number): string {
  if (cell === 'computed') return line(face([[u + k, v], [u - k, v]], 0.3), 0.9) + line(face([[u, v + k], [u, v - k]], 0.3), 0.9);
  if (cell === 'reused') {
    const pts: [number, number][] = Array.from({ length: 9 }, (_, i) => {
      const a = Math.PI * (0.15 + (1.1 * i) / 8);
      return [u - k * Math.cos(a), v + k * 0.8 * Math.sin(a) - k * 0.2];
    });
    const [hu, hv] = pts[0];
    return `<path d="${pd(face(pts, 0.3), false)}" fill="none" stroke="${INK}" stroke-width=".8"/>` + line(face([[hu + k * 0.45, hv + k * 0.1], [hu, hv], [hu + k * 0.1, hv + k * 0.5]], 0.3), 0.8);
  }
  return '';
}

/** 장면 전체. */
export function tilesScene(s: KvState): string {
  const size = labelSize();
  const small = size * 0.85;
  const grid = buildGrid(s.length, s.step, s.cacheOn);
  const r = readouts(s);

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [STAND.x0, STAND.x1 + MEMO.depth].flatMap((x) => [STAND.y0, STAND.y1].flatMap((y) => [BASE_H, STAND.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));
  out += box(STAND.x0, STAND.y0, BASE_H, STAND.x1, STAND.y1, STAND.z1, WOOD, tone, 1.3);
  out += shape(face(rectUV(STAND.y0 + 3, BASE_H + 3, STAND.y1 - 3, STAND.z1 - 3)), CERAMIC.l, 1);

  let text = '';
  const put = (u: number, v: number, str: string, sz: number, color: string = INK, weight = 700, dx = 0.1) => (text += tx(FACE + dx, u, v - sz * 0.35, str, sz, color, weight));

  // 타일.
  grid.forEach((row, ri) =>
    row.forEach((cell, ci) => {
      const b = cellBox(s.length, ri, ci);
      const pad = Math.min(0.6, b.cs * 0.08);
      out += shape(face(rectUV(b.uR + pad, b.vB + pad, b.uL - pad, b.vT - pad), 0.15), CELL_COLOR[cell], cell === 'empty' ? 0.4 : 0.7);
      out += glyph(cell, (b.uL + b.uR) / 2, (b.vT + b.vB) / 2, b.cs * 0.26);
    }),
  );
  // 지금 줄: 파란 테.
  if (s.step > 0) {
    const first = cellBox(s.length, s.step - 1, 0);
    const last = cellBox(s.length, s.step - 1, s.step - 1);
    out += `<path d="${pd(face(rectUV(last.uR, first.vB, first.uL, first.vT), 0.25))}" fill="none" stroke="${PALS.cobalt.m}" stroke-width="1.8"/>`;
  }
  put(GRID.u - GRID.size / 2, GRID.v + 6, 'K·V를 가진 토큰 →', small, palette.muted, 400);
  put(GRID.u + 11, GRID.v - 4, '처리', small, palette.muted, 400);
  put(GRID.u + 11, GRID.v - 4 - small * 1.25, '단계 ↓', small, palette.muted, 400);

  // 메모 상자: 앞으로 나온 상자, 그 안에 메모가 한 장씩.
  out += box(STAND.x1, MEMO.u0, MEMO.v0, STAND.x1 + MEMO.depth, MEMO.u1, MEMO.v1, WOOD, tone, 1.2);
  const fx = STAND.x1 + MEMO.depth + 0.05;
  out += shape(on(PX(fx), rectUV(MEMO.u0 + 3, MEMO.v0 + 3, MEMO.u1 - 3, MEMO.v1 - 12)), BOARD.l, 0.9);
  const rows = Math.ceil(16 / MEMO.cols);
  const cw = (MEMO.u1 - MEMO.u0 - 10) / MEMO.cols;
  const ch = (MEMO.v1 - 12 - MEMO.v0 - 8) / rows;
  for (let i = 0; i < r.memos; i++) {
    const col = i % MEMO.cols;
    const row = Math.floor(i / MEMO.cols);
    const u = MEMO.u1 - 5 - col * cw;
    const v = MEMO.v1 - 16 - row * ch;
    out += shape(on(PX(fx + 0.1), rectUV(u - cw + 1, v - ch + 0.8, u, v)), CERAMIC.l, 0.6);
  }
  text += tx(fx + 0.1, (MEMO.u0 + MEMO.u1) / 2, MEMO.v1 - 6 - small * 0.35, `적어둔 메모 ${r.memos}개`, small, INK, 700);
  // 상자에서 지금 줄로: 다시 쓴 칸이 있을 때만.
  if (s.cacheOn && s.step > 1) {
    const last = cellBox(s.length, s.step - 1, s.step - 2);
    const y = (last.vT + last.vB) / 2;
    out += `<path d="${pd([[fx, MEMO.u1, MEMO.v1 - 12], [FACE + 0.3, last.uR - 2, y]], false)}" fill="none" stroke="${INK}" stroke-width=".9" stroke-dasharray="2 1.6"/>`;
  }

  return koreanLabels(out + text);
}
