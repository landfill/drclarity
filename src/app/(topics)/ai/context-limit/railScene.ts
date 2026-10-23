/*
 * 메시지 레일 figure 의 장면. 받침판 위에 판이 서 있고, 판 앞면에 나무 레일이 가로로 붙어 있다.
 *   - 레일 위에 메시지 블록이 왼쪽(오래된 것)부터 차례로 놓인다. 블록 폭은 그 메시지의 토큰 수에 비례한다.
 *     이름이 든 첫 메시지는 겨자색, 내 메시지는 흰색, AI 메시지는 회색. 블록은 모두 그대로 있다(기록).
 *   - 파란 틀이 이번 입력이다. 맨 오른쪽(가장 최근)부터 메시지를 통째로 담는다. 실선은 담긴 메시지를 감싸고,
 *     점선은 창 크기까지 남은 자리다. 남은 자리보다 큰 메시지는 담지 않고, 그 앞은 모두 입력 밖이다(fitToWindow).
 *   - 입력 밖 메시지 아래에는 괄호와 "입력 밖 N개" 를 적는다. 흐리게 그리지 않는다
 *     (본문: 시간이 지나 흐려지는 것이 아니라 입력에 넣지 않은 것이다).
 *
 * 그리는 순서: 받침판 → 그림자 → 판 → 앞면 → 레일 → 블록 → 틀 → 글자.
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
  tone,
  tx,
  type Vec3,
} from '@/lib/colorfigures/core';
import { koreanLabels } from '@/lib/colorfigures/fonts';
import { MONO_FONT } from '@/styles/palette';
import type { WindowState } from './conversation';
import { blockName } from './rail';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 44, 196];
/** 판: 앞면 x = STAND.x1. 앞면 좌표는 (y, z) 이고 y 가 클수록 화면 왼쪽이다. */
const STAND = { x0: 8, x1: 12, y0: 4, y1: 192, z1: 78 };
const FACE = STAND.x1 + 0.05;
/** 레일과 블록: 블록 아래 끝 높이, 블록 높이, 앞으로 나온 깊이. */
export const RAIL = { v: 34, h: 14, depth: 7, right: 16 };
/** 토큰 하나의 폭. 가장 넓은 창(800토큰)이 판 안에 들어가게 정한다. */
export const TOKEN_W = 0.205;
/** 틀의 위아래 여백. */
const FRAME_PAD = 4;

export const RAIL_SIZE: Vec3 = [BASE[2], BASE[3], STAND.z1];

export const labelSize = (scale = labelScale()) => 4.4 * Math.min(1.35, scale);
/** 블록 안 순번의 크기: 가장 좁은 블록에도 두 자리 숫자가 들어가게 상한을 둔다. */
export const blockTextSize = (scale = labelScale()) => 4 * Math.min(1.15, scale);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

/** 블록 i 의 왼쪽·오른쪽 끝 (y). 가장 최근 메시지가 RAIL.right 에 닿는다. */
export function blocks(s: WindowState): { uL: number; uR: number }[] {
  let u = RAIL.right;
  const out: { uL: number; uR: number }[] = [];
  for (let i = s.turns.length - 1; i >= 0; i--) {
    const w = s.turns[i].tokens * TOKEN_W;
    out[i] = { uL: u + w, uR: u };
    u += w;
  }
  return out;
}

/** 틀: 담긴 메시지를 감싸는 실선 구간과, 창 크기까지의 점선 끝 (y). */
export function frame(s: WindowState) {
  return { uR: RAIL.right, usedL: RAIL.right + s.used * TOKEN_W, limitL: RAIL.right + s.limit * TOKEN_W };
}

/** 틀 이름표의 가운데: 틀 가운데에 두되, 판 오른쪽 끝(y 10)을 넘지 않게 민다. */
export function frameLabelU(s: WindowState, size: number): number {
  const f = frame(s);
  const w = textWidth(`이번 입력: ${s.used} / ${s.limit}토큰`, size);
  return Math.max((f.uR + f.limitL) / 2, 10 + w / 2);
}

const face = (uv: [number, number][], dx = 0): Vec3[] => on(PX(FACE + dx), uv);

/** 장면 전체. */
export function railScene(s: WindowState): string {
  const size = labelSize();
  const small = size * 0.85;
  const bsize = blockTextSize();
  const bs = blocks(s);
  const f = frame(s);

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [STAND.x0, STAND.x1 + RAIL.depth].flatMap((x) => [STAND.y0, STAND.y1].flatMap((y) => [BASE_H, STAND.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));
  out += box(STAND.x0, STAND.y0, BASE_H, STAND.x1, STAND.y1, STAND.z1, WOOD, tone, 1.3);
  out += `<path d="${pd(face(rectUV(STAND.y0 + 3, BASE_H + 3, STAND.y1 - 3, STAND.z1 - 3)))}" fill="${CERAMIC.l}" stroke="${INK}" stroke-width="1"/>`;
  // 레일.
  out += box(STAND.x1, RAIL.right - 4, RAIL.v - 3, STAND.x1 + RAIL.depth + 1, STAND.y1 - 6, RAIL.v, WOOD, tone, 1.1);

  let text = '';
  const put = (x: number, u: number, v: number, str: string, sz: number, color: string = INK, weight = 700) => (text += tx(x, u, v - sz * 0.35, str, sz, color, weight));
  const fx = STAND.x1 + RAIL.depth + 0.05;

  // 블록: 오른쪽(최근)부터 그려야 왼쪽 블록의 옆면이 덮이지 않는다. 앞뒤가 같으니 왼쪽부터 그려도 된다.
  s.turns.forEach((t, i) => {
    const b = bs[i];
    const mat = i === 0 ? PALS.mustard : t.role === 'user' ? CERAMIC : BOARD;
    out += box(STAND.x1 + 1, b.uR + 0.4, RAIL.v, STAND.x1 + RAIL.depth, b.uL - 0.4, RAIL.v + RAIL.h, mat, tone, 1);
    const name = blockName(i, t.id);
    const inside = name !== '질문' && textWidth(name, bsize) <= b.uL - b.uR - 1.2;
    // 순번(숫자만)은 블록 안이든 위든 고정폭으로 쓴다 (AGENTS.md "색과 글자").
    const svg = inside
      ? tx(fx, (b.uL + b.uR) / 2, RAIL.v + RAIL.h / 2 - bsize * 0.35, name, bsize, INK, 700)
      : tx(fx, (b.uL + b.uR) / 2, RAIL.v + RAIL.h + FRAME_PAD + 4 - small * 0.35, name, small, INK, 700);
    text += /^\d+$/.test(name) ? svg.replace('<text ', `<text font-family="${MONO_FONT}" `) : svg;
  });

  // 틀: 담긴 메시지를 감싸는 실선, 창 끝까지 점선.
  const v0 = RAIL.v - FRAME_PAD;
  const v1 = RAIL.v + RAIL.h + FRAME_PAD;
  const fxx = fx + 0.3;
  out += `<path d="${pd([[fxx, f.usedL, v0], [fxx, f.uR - 1, v0], [fxx, f.uR - 1, v1], [fxx, f.usedL, v1]], false)}" fill="none" stroke="${PALS.cobalt.m}" stroke-width="2.2" stroke-linejoin="round"/>`;
  out += `<path d="${pd([[fxx, f.usedL, v0], [fxx, f.limitL, v0], [fxx, f.limitL, v1], [fxx, f.usedL, v1]], false)}" fill="none" stroke="${PALS.cobalt.m}" stroke-width="1.4" stroke-dasharray="2.4 1.8"/>`;
  if (s.used > 0) out += line([[fxx, f.usedL, v0], [fxx, f.usedL, v1]], 0.8);
  const head = `이번 입력: ${s.used} / ${s.limit}토큰`;
  put(fxx, frameLabelU(s, size), v1 + 13, head, size, PALS.cobalt.d, 700);

  // 입력 밖: 괄호와 개수.
  if (s.droppedCount > 0) {
    const left = bs[0].uL;
    const right = bs[s.droppedCount - 1].uR;
    const z = v0 - 3;
    out += line([[fx, left - 0.5, z + 2], [fx, left - 0.5, z], [fx, right + 0.5, z], [fx, right + 0.5, z + 2]], 1);
    put(fx, (left + right) / 2, z - 5, `입력 밖 ${s.droppedCount}개 · 기록에는 그대로`, small, INK, 700);
  }

  return koreanLabels(out + text);
}
