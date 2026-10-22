/*
 * 시간 선반 figure 의 장면. 받침판 위에 벽판이 서 있고, 벽판에 선반 두 개가 가로로 달려 있다.
 * 선반은 같은 눈금의 시간 자다 (왼쪽이 0, 오른쪽으로 갈수록 나중). 선반마다:
 *   - 겨자색 판: 읽기(프리필). 입력 전체를 한 덩어리로 읽으므로 하나의 판이고, 길이는 입력 토큰 수에 비례한다.
 *   - 파란 막대: 쓰기(디코드). 줄 하나가 출력 토큰 하나다(줄이 너무 촘촘하면 한 띠로 그린다).
 *   - 빨간 깃발: 첫 토큰이 나오는 순간(읽기 + 첫 출력 토큰).
 *   - 막대의 끝: 답이 끝나는 순간.
 * 색은 아래 범례(예전 타임라인)와 같다: 프리필 = 겨자색(accent), 디코드 = 파란 줄무늬(secondary), 첫 토큰 = 빨강.
 * 위 선반이 지금 요청, 아래 선반이 견줄 줄이다 (색을 옅게). 수치는 모형의 상대 시간이며 초가 아니다.
 *
 * 그리는 순서: 받침판 → 그림자 → 벽판 → 앞면 → 선반 → 블록 → 깃발 → 글자.
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
  PX,
  rectUV,
  shape,
  tone,
  tx,
  type Vec3,
} from '@/lib/colorfigures/core';
import { koreanLabels } from '@/lib/colorfigures/fonts';
import { palette } from '@/styles/palette';
import type { Phase } from './timeline';
import { rowSummary } from './shelf';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 50, 200];
/** 벽판: 앞면 x = WALL.x1. 앞면 좌표는 (y, z) 이고 y 가 클수록 화면 왼쪽이다. */
const WALL = { x0: 8, x1: 12, y0: 4, y1: 196, z1: 120 };
const FACE = WALL.x1 + 0.05;
/** 시간 0 과 눈금 끝의 자리 (y). */
export const TRACK = { u0: 184, u1: 22 };
/** 선반 윗면 높이 (위 줄, 아래 줄), 선반 앞뒤, 블록 높이. */
export const SHELF_TOP = [74, 16] as const;
const SHELF = { x1: 26, thick: 3 };
const BLOCK_H = 9;
/** 깃발 기둥 높이. */
export const FLAG_H = 15;
/** 줄 이름과 수치의 높이 (선반 윗면에서). 깃발 이름표(FLAG_H + 3.5) 보다 위다. */
export const HEAD_V = [FLAG_H + 17, FLAG_H + 10] as const;

export const SHELF_SIZE: Vec3 = [BASE[2], BASE[3], WALL.z1];

export interface Row {
  label: string;
  /** 사용자의 요청 (대체 글에만 쓴다. 그림에는 이름과 수치만 적는다). */
  prompt?: string;
  phases: Phase[];
  muted?: boolean;
}

export const labelSize = (scale = labelScale()) => 4.4 * Math.min(1.4, scale);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

/** 상대 시간 → 선반 위 자리 (y). */
export const timeU = (t: number, scale: number) => TRACK.u0 - (t / scale) * (TRACK.u0 - TRACK.u1);

/** 쓰기 막대의 줄 간격 (y). 이보다 촘촘하면 한 띠로 그린다. */
export const MIN_STRIPE = 1.5;

/** 줄 하나 위의 글자 두 줄 (이름, 수치). */
export function rowLines(row: Row): [string, string] {
  const { first, total, waitPercent } = rowSummary(row.phases);
  const n = (v: number) => Math.round(v).toLocaleString('ko-KR');
  return [row.label, `첫 토큰까지 ${n(first)} · 끝까지 ${n(total)} · 기다림의 몫 ${waitPercent}%`];
}

const face = (uv: [number, number][], dx = 0): Vec3[] => on(PX(FACE + dx), uv);

/** 장면 전체. rows 는 위 줄부터, scale 은 두 줄이 함께 쓰는 시간 눈금. */
export function shelfScene(rows: Row[], scale: number): string {
  const size = labelSize();
  const small = size * 0.85;

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [WALL.x0, SHELF.x1].flatMap((x) => [WALL.y0, WALL.y1].flatMap((y) => [BASE_H, WALL.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));
  out += box(WALL.x0, WALL.y0, BASE_H, WALL.x1, WALL.y1, WALL.z1, WOOD, tone, 1.3);
  out += shape(face(rectUV(WALL.y0 + 3, BASE_H + 3, WALL.y1 - 3, WALL.z1 - 3)), CERAMIC.l, 1);

  let text = '';
  const put = (x: number, u: number, v: number, str: string, sz: number, color: string = INK, weight = 700) => (text += tx(x, u, v - sz * 0.35, str, sz, color, weight));
  const putLeft = (x: number, uLeft: number, v: number, str: string, sz: number, color: string = INK, weight = 700) => put(x, uLeft - textWidth(str, sz) / 2, v, str, sz, color, weight);

  rows.forEach((row, r) => {
    const top = SHELF_TOP[r];
    const muted = !!row.muted;
    // 선반: 벽판에서 앞으로 나온 나무 판.
    out += box(WALL.x1, TRACK.u1 - 6, top - SHELF.thick, SHELF.x1, TRACK.u0 + 6, top, WOOD, tone, 1.1);
    // 눈금: 선반 앞면에 열 칸.
    for (let k = 0; k <= 10; k++) {
      const u = timeU((scale * k) / 10, scale);
      out += line([[SHELF.x1 + 0.05, u, top - 0.4], [SHELF.x1 + 0.05, u, top - SHELF.thick + 0.6]], 0.7);
    }
    const prefill = row.phases.find((p) => p.kind === 'prefill');
    const decodes = row.phases.filter((p) => p.kind === 'decode');
    const x0 = WALL.x1 + 2;
    const x1 = SHELF.x1 - 2;
    const h = muted ? BLOCK_H * 0.75 : BLOCK_H;
    if (prefill) {
      out += box(x0, timeU(prefill.start + prefill.width, scale), top, x1, timeU(prefill.start, scale), top + h, PALS.mustard, tone, muted ? 0.9 : 1.2);
    }
    if (decodes.length) {
      const d0 = decodes[0].start;
      const d1 = decodes[decodes.length - 1].start + decodes[decodes.length - 1].width;
      out += box(x0 + 1, timeU(d1, scale), top, x1 - 1, timeU(d0, scale), top + h * 0.8, PALS.cobalt, tone, muted ? 0.9 : 1.1);
      // 줄: 출력 토큰 하나에 하나. 너무 촘촘하면 생략한다(한 띠).
      const step = timeU(0, scale) - timeU(decodes[0].width, scale);
      if (step >= MIN_STRIPE) {
        for (const d of decodes.slice(1)) {
          const u = timeU(d.start, scale);
          out += line([[x1 - 1 + 0.05, u, top + 0.6], [x1 - 1 + 0.05, u, top + h * 0.8 - 0.6]], 0.5);
        }
      }
      // 깃발: 첫 토큰.
      const fu = timeU(rowSummary(row.phases).first, scale);
      out += line([[x1 + 0.5, fu, top], [x1 + 0.5, fu, top + FLAG_H]], 1.3);
      out += shape([[x1 + 0.6, fu, top + FLAG_H], [x1 + 0.6, fu - 6, top + FLAG_H - 2], [x1 + 0.6, fu, top + FLAG_H - 4]], muted ? PALS.tomato.l : PALS.tomato.m, 1);
      put(x1 + 0.7, fu - 2, top + FLAG_H + 3.5, '첫 토큰', small * 0.9, INK, 700);
    }
    // 줄 이름과 수치.
    const [l1, l2] = rowLines(row);
    putLeft(FACE + 0.1, TRACK.u0, top + HEAD_V[0], l1, size, muted ? palette.muted : INK, 700);
    putLeft(FACE + 0.1, TRACK.u0, top + HEAD_V[1], l2, small, muted ? palette.muted : INK, 400);
  });
  const axis = '시간 → (모형의 상대 단위)';
  put(FACE + 0.1, TRACK.u1 + textWidth(axis, small * 0.9) / 2, SHELF_TOP[0] + HEAD_V[0], axis, small * 0.9, palette.muted, 400);

  return koreanLabels(out + text);
}
