/*
 * 정렬 선반 figure 의 장면. 받침판 위에 선반 세 칸짜리 나무 장이 서 있고, 칸마다 같은 배열의 막대가 줄지어 선다.
 * 위에서부터 버블·병합·퀵 정렬이다. 칸 선반의 앞 모서리에 정렬 이름과 비교·이동 횟수를 적는다.
 *
 * 그리는 순서: 받침판 → 그림자 → 장의 뒤판·옆판 → 칸마다 (선반 판 → 막대, 먼 것부터) → 앞 모서리 글자 → 장의 앞 테.
 */
import {
  BOARD,
  INK,
  PALS,
  WOOD,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  fill,
  labelScale,
  matOf,
  on,
  pd,
  PX,
  rectUV,
  shape,
  tone,
  tx,
  type Mat,
  type Vec3,
} from '@/lib/colorfigures/core';
import { koreanLabels } from '@/lib/colorfigures/fonts';
import { palette } from '@/styles/palette';
import { laneDone, type Lane, type RaceState } from './race';

const BASE_H = 3;
/** 장: 깊이 x 0..DEPTH, 폭 y 0..WIDTH. 앞면이 x = DEPTH. */
const DEPTH = 16;
const WIDTH = 132;
const SIDE = 4; // 옆판 두께
const SHELF_T = 11; // 선반 판 두께 (앞 모서리에 글자 두 줄을 쓴다)
const ROD_MAX = 27; // 가장 큰 값의 막대 높이
const BAY = SHELF_T + ROD_MAX + 4; // 칸 하나의 높이
const TOP = BASE_H + 3 * BAY + 4;
/** 막대가 서는 x 범위와 y 범위. */
const ROD_X: [number, number] = [5, 10];
const ROD_Y: [number, number] = [SIDE + 3, WIDTH - SIDE - 3];

export const RACE_SIZE: Vec3 = [DEPTH + 4, WIDTH + 4, TOP];

const ROD: Mat = matOf(palette['blue-soft']);
const ROD_ACTIVE: Mat = matOf(palette['chart-warm']);
const ROD_DONE: Mat = PALS.mint;
const CABINET: Mat = WOOD;

/** 칸 i (0 = 맨 위)의 선반 판 윗면 높이. */
export const shelfTop = (i: number): number => BASE_H + (2 - i) * BAY + SHELF_T;

/** 값 v 인 막대 높이. */
export const rodHeight = (v: number, n: number): number => Math.max(0.6, (v / n) * ROD_MAX);

/** 앞 모서리에 쓰는 글자: 윗줄은 정렬 이름과 복잡도, 아랫줄은 횟수와 (끝났으면) "정렬 완료". */
export function edgeTexts(l: Lane): { title: string; counts: string; done: string } {
  return {
    title: `${l.label} · ${l.complexity}`,
    counts: `비교 ${l.compares.toLocaleString('ko-KR')} · 이동 ${l.writes.toLocaleString('ko-KR')}`,
    done: laneDone(l) ? '정렬 완료' : '',
  };
}

/** 앞 모서리 글자 크기. 좁은 화면에서 1.25배까지 키운다. 더 키우면 퀵 정렬의 윗줄이 모서리를 넘는다. */
export const edgeFontSize = (): number => 3.9 * Math.min(1.25, labelScale());

/** 칸 하나: 선반 판, 막대, 앞 모서리 글자. */
function bay(l: Lane, i: number, n: number): string {
  const z1 = shelfTop(i);
  const z0 = z1 - SHELF_T;
  let s = box(0, SIDE, z0, DEPTH, WIDTH - SIDE, z1, CABINET, tone, 1);

  const slot = (ROD_Y[1] - ROD_Y[0]) / n;
  const gap = slot > 2 ? slot * 0.18 : 0;
  const done = laneDone(l);
  const active = new Set(l.active);
  const thin = n > 60;
  // 먼 것부터: 보는 사람의 오른쪽(작은 y)이 멀다.
  for (let k = n - 1; k >= 0; k--) {
    // 배열의 0번이 보는 사람의 왼쪽(큰 y)이다.
    const y1 = ROD_Y[1] - k * slot;
    const y0 = y1 - slot + gap;
    const h = rodHeight(l.values[k], n);
    const m = done ? ROD_DONE : active.has(k) ? ROD_ACTIVE : ROD;
    if (thin) {
      // 막대가 많으면 앞면과 윗면만 칠한다. 잉크를 두르면 줄 전체가 검게 뭉친다.
      s += fill(pd(on(PX(ROD_X[1]), rectUV(y0, z1, y1, z1 + h))), m.l);
      s += fill(pd([[ROD_X[0], y0, z1 + h], [ROD_X[1], y0, z1 + h], [ROD_X[1], y1, z1 + h], [ROD_X[0], y1, z1 + h]]), m.m);
    } else {
      s += box(ROD_X[0], y0, z1, ROD_X[1], y1, z1 + h, m, tone, 0.7);
    }
  }
  if (thin) {
    // 줄 전체의 바닥 선 하나
    s += `<path d="${pd([[ROD_X[1], ROD_Y[0], z1], [ROD_X[1], ROD_Y[1], z1]], false)}" fill="none" stroke="${INK}" stroke-width="0.9"/>`;
  }

  // 앞 모서리 글자: 왼쪽 끝에 맞춰 두 줄. 정렬 완료는 아랫줄 오른쪽 끝.
  const { title, counts, done: doneText } = edgeTexts(l);
  const fs = edgeFontSize();
  const left = EDGE_LEFT;
  // 글자 폭을 어림하지 않고 글자 기준점으로 맞춘다: 왼쪽 정렬은 시작점, 오른쪽 정렬은 끝점.
  const at = (text: string, z: number, alignRight = false) =>
    tx(DEPTH + 0.05, alignRight ? EDGE_RIGHT : left, z, text, fs, INK, 700).replace(
      'text-anchor="middle"',
      `text-anchor="${alignRight ? 'end' : 'start'}"`,
    );
  const [lineTop, lineBottom] = edgeLines(z0, fs);
  s += at(title, lineTop);
  s += at(counts, lineBottom);
  if (doneText) s += at(doneText, lineBottom, true);
  return s;
}

/** 글자 폭의 어림 (세계 단위). 한글은 1em, 나머지는 0.62em. */
export const textWidth = (text: string, size: number): number =>
  [...text].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1 : 0.62), 0) * size;

/** 앞 모서리에서 글자가 쓸 수 있는 범위 (y). 왼쪽 끝(큰 y)에서 시작한다. */
export const EDGE_LEFT = WIDTH - SIDE - 4;
export const EDGE_RIGHT = SIDE + 4;

/** 두 줄의 밑줄 높이. 선반 판 (z0 .. z0 + SHELF_T) 안에 들어간다. */
export const edgeLines = (z0: number, fs: number): [number, number] => {
  const gap = (SHELF_T - 2 * 0.72 * fs) / 3;
  return [z0 + 2 * gap + 0.72 * fs, z0 + gap];
};
export const SHELF_THICKNESS = SHELF_T;

/** 장면 전체. */
export function raceScene(s: RaceState): string {
  let out = board(0, 0, DEPTH + 4, WIDTH + 4, BASE_H, 4, BOARD);
  out += clipTo(
    boardTop(0, 0, DEPTH + 4, WIDTH + 4, BASE_H, 4),
    castShadow(
      [0, DEPTH].flatMap((x) => [0, WIDTH].flatMap((y) => [BASE_H, TOP].map((z) => [x, y, z] as Vec3))),
      BASE_H,
    ),
  );
  // 뒤판
  out += shape(on(PX(0.5), rectUV(0, BASE_H, WIDTH, TOP)), CABINET.d, 1);
  // 오른쪽 옆판(작은 y)은 칸보다 멀고, 왼쪽 옆판은 가깝다.
  out += box(0, 0, BASE_H, DEPTH, SIDE, TOP, CABINET, tone, 1.2);
  s.lanes.forEach((l, i) => {
    out += bay(l, i, s.n);
  });
  out += box(0, WIDTH - SIDE, BASE_H, DEPTH, WIDTH, TOP, CABINET, tone, 1.2);
  out += box(0, 0, TOP - 4, DEPTH, WIDTH, TOP, CABINET, tone, 1.2);
  // 모서리 글자는 한글과 숫자가 섞여 있어 일반 글꼴로 쓴다.
  return koreanLabels(out);
}
