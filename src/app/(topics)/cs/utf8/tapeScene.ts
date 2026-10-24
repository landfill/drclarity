/*
 * 바이트 테이프 기계 figure 의 장면.
 *
 * 왼쪽에 테이프 기계(앞면에 판독 창), 오른쪽으로 바이트 테이프가 가이드 판을 따라 나와 있다. 가이드 판 위에
 * 칼날을 단 레일이 있고, 테이프 앞 받침판 위에는 잘린 조각을 받는 쟁반이 있다.
 *
 * 테이프 칸 하나에 바이트 하나(16진수)를 찍는다. 칸 색은 위 보드와 같게 그 바이트가 속한 글자의 바이트 수를
 * 따른다. 첫 바이트는 굵게, 이어지는 바이트는 흐리게 찍고, 글자가 바뀌는 자리에는 굵은 선을 긋는다.
 * 잘려서 글자가 되지 못한 조각의 칸은 붉게 칠한다.
 *
 * 그리는 순서: 받침판 → 그림자 → 가이드 판 → 쟁반 → 테이프(앞 조각, 뒤 조각) → 레일과 칼날 → 기계 → 글자.
 */
import {
  BOARD,
  CERAMIC,
  DARK,
  INK,
  METAL,
  PALS,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  fill,
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
import { MONO_FONT, palette, type PaletteKey } from '@/styles/palette';
import { cutAt, toHex, type EncodedChar } from './utf8';
import { NARROW_WINDOW, WINDOW, bladeDown, displayText, isCut, pieceFall, tapeCells, windowStart, type TapeState } from './tape';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 48, 250];
/** 기계: 왼쪽 끝의 상자. 앞면 x = MX1. */
const MACHINE = { x0: 6, x1: 40, y0: 186, y1: 246, z1: 66 };
/** 가이드 판: 테이프가 기대는 판. 앞면 x = GX. */
const GX = 24;
const GUIDE = { y0: 8, y1: MACHINE.y0, z1: 56 };
/** 테이프: 앞면 x, 아래·위 z, 첫 칸의 왼쪽 끝 y, 칸 폭. */
const TAPE_X = GX + 0.5;
const TAPE = { z0: 24, z1: 38 };
/** 기계 앞면이 테이프 첫머리를 가리지 않도록, 첫 칸 앞에 빈 테이프(머리)를 조금 둔다. */
const CELL_Y0 = MACHINE.y0 - 8;
/** 테이프의 보이는 길이. 칸 수에 따라 칸 폭이 정해진다. */
const TAPE_LEN = WINDOW * 8.6;

/** 이 화면의 창 칸 수: 글자가 커진 좁은 화면이면 칸을 줄인다. */
export const windowFor = (scale: number) => (scale >= 1.6 ? NARROW_WINDOW : WINDOW);
/** 칸 폭과 칸 안 16진수 글자 크기 (글자 두 개가 칸 안에 든다). */
export const cellWidth = (scale: number) => TAPE_LEN / windowFor(scale);
export const hexSize = (scale: number) => Math.min((cellWidth(scale) - 0.8) / 1.32, 4.4 * Math.min(2, scale));
/** 쟁반: 받침판 앞쪽. 뒤 조각은 앞으로 나오며 여기로 떨어진다. */
const TRAY = { x0: 30, x1: 46, y0: 6, y1: MACHINE.y0 - 2, z1: BASE_H + 4 };
const FALL = { x: 12, y: -6, z: -(TAPE.z0 - (TRAY.z1 + 1)) };
/** 레일과 칼날. */
const RAIL_Z = 52;
/** 칼날: 폭, 높이, 올렸을 때와 내렸을 때 아래 끝 z (내리면 테이프를 지나 아래까지). */
const BLADE = { w: 1.6, h: 9, upZ: TAPE.z1 + 3, downZ: TAPE.z0 - 4 };

export const TAPE_SIZE: Vec3 = [BASE[2], BASE[3], MACHINE.z1];

/**
 * CSS 의 `color-mix(in srgb, var(--color-<name>) <percent>%, var(--color-surface))` 와 같은 색.
 * SVG 는 CSS 변수를 섞을 수 없으므로 palette 에서 같은 비율로 섞는다.
 */
export function mixWithSurface(name: PaletteKey, percent: number): string {
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = rgb(palette[name]);
  const b = rgb(palette.surface);
  return '#' + a.map((v, i) => Math.round((v * percent + b[i] * (100 - percent)) / 100).toString(16).padStart(2, '0')).join('');
}

/** 칸 색: 위 보드(Utf8.module.css 의 .size1~4)와 같은 섞음. 깨진 조각은 .cutBroken 과 같다. 비율은 테스트가 CSS 와 맞춰 본다. */
export const SIZE_MIX = [
  ['blue-soft', 30],
  ['success', 25],
  ['dough', 75],
  ['accent', 35],
] as const satisfies readonly (readonly [PaletteKey, number])[];
export const BROKEN_MIX = ['danger-soft', 35] as const satisfies readonly [PaletteKey, number];
export const SIZE_FILL = SIZE_MIX.map(([name, percent]) => mixWithSurface(name, percent));
export const BROKEN_FILL = mixWithSurface(...BROKEN_MIX);

/** 창의 k 번째 칸 왼쪽 끝 y. */
const cellY = (k: number, w: number) => CELL_Y0 - k * w;

const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);

interface Shift {
  x: number;
  y: number;
  z: number;
}

/** 테이프 칸들 (창의 k0..k1) 을 shift 만큼 옮겨 그린다. */
function tapePiece(
  cells: ReturnType<typeof tapeCells>,
  start: number,
  k0: number,
  k1: number,
  shift: Shift,
  brokenFrom: number,
  tornRight: boolean,
  blank = false,
): { art: string; text: string } {
  if (k1 <= k0) return { art: '', text: '' };
  const x = TAPE_X + shift.x;
  const plane = PX(x);
  const z0 = TAPE.z0 + shift.z;
  const z1 = TAPE.z1 + shift.z;
  const scale = labelScale();
  const w = cellWidth(scale);
  const yOf = (k: number) => cellY(k, w) + shift.y;
  let art = '';
  let text = '';
  const size = hexSize(scale);
  if (blank) art += fill(pd(on(plane, rectUV(yOf(k1), z0, yOf(k0), z1))), CERAMIC.l);
  for (let k = k0; k < k1 && !blank; k++) {
    const c = cells[start + k];
    const broken = start + k >= brokenFrom;
    art += fill(pd(on(plane, rectUV(yOf(k + 1), z0, yOf(k), z1))), broken ? BROKEN_FILL : SIZE_FILL[c.size - 1]);
    // 칸 선: 글자가 바뀌는 자리는 굵게.
    if (k > k0) art += line([[x + 0.02, yOf(k), z0], [x + 0.02, yOf(k), z1]], c.part === 0 ? 1.5 : 0.5);
    const t = tx(x + 0.05, yOf(k) - w / 2, (z0 + z1) / 2 - size * 0.35, toHex(c.byte), size, c.part === 0 ? INK : palette.muted, c.part === 0 ? 700 : 400);
    text += mono(t);
  }
  // 테이프 테두리. 창 밖으로 이어지는 쪽은 찢긴 끝으로 그린다.
  const yL = yOf(k0);
  const yR = yOf(k1);
  const edge: Vec3[] = [[x, yL, z1], [x, yL, z0], [x, yR, z0]];
  if (tornRight) {
    for (let i = 1; i <= 4; i++) edge.push([x, yR + (i % 2 ? 1.2 : 0), z0 + ((z1 - z0) * i) / 4]);
  } else edge.push([x, yR, z1]);
  edge.push([x, yL, z1]);
  art += `<path d="${pd(edge)}" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>`;
  return { art, text };
}

/**
 * 장면 전체. chars 는 지금 문장의 글자별 바이트.
 * problem 이면 퀴즈 전의 첫 장면: 기계는 문장을 읽고 있지만 테이프는 빈 종이다. 바이트와 칼날의 바이트 수는 적지 않는다.
 */
export function tapeScene(state: TapeState, chars: readonly EncodedChar[], { problem = false }: { problem?: boolean } = {}): string {
  const cells = tapeCells(chars);
  const total = cells.length;
  const limit = Math.min(Math.max(0, state.limit), total);
  const window = windowFor(labelScale());
  const start = windowStart(total, limit, window);
  const end = Math.min(total, start + window);
  const cutK = limit - start;
  const cut = cutAt([...chars], limit);
  const brokenFrom = cut.broken ? limit - cut.broken.keptBytes.length : Infinity;
  const cutDone = isCut(state.t);
  const fall = pieceFall(state.t);

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners = (x0: number, x1: number, y0: number, y1: number, z1: number): Vec3[] =>
    [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [BASE_H, z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(
    boardTop(...BASE, BASE_H, 5),
    castShadow(corners(GX - 3, GX, GUIDE.y0, GUIDE.y1, GUIDE.z1), BASE_H) + castShadow(corners(MACHINE.x0, MACHINE.x1, MACHINE.y0, MACHINE.y1, MACHINE.z1), BASE_H),
  );
  out += box(GX - 3, GUIDE.y0, BASE_H, GX, GUIDE.y1, GUIDE.z1, PALS.mint, tone, 1.2);
  out += box(TRAY.x0, TRAY.y0, BASE_H, TRAY.x1, TRAY.y1, TRAY.z1, CERAMIC, tone, 1);

  // 테이프 머리: 기계에서 나와 첫 칸까지 이어진 빈 테이프. 앞 조각은 늘 기계에 붙어 있다.
  out += shape(on(PX(TAPE_X), rectUV(CELL_Y0, TAPE.z0, MACHINE.y0 + 1, TAPE.z1)), CERAMIC.l, 1.1);
  // 테이프: 칼날이 지나기 전에는 한 장, 지난 뒤에는 앞 조각(기계에 붙음)과 뒤 조각(쟁반으로 떨어짐).
  let text = '';
  const visibleEnd = end - start;
  const tornRight = end < total;
  if (problem) {
    out += tapePiece(cells, start, 0, visibleEnd, { x: 0, y: 0, z: 0 }, Infinity, tornRight, true).art;
  } else if (!cutDone || cutK >= visibleEnd) {
    const p = tapePiece(cells, start, 0, visibleEnd, { x: 0, y: 0, z: 0 }, cutDone ? brokenFrom : Infinity, tornRight);
    out += p.art;
    text += p.text;
  } else {
    const front = tapePiece(cells, start, 0, cutK, { x: 0, y: 0, z: 0 }, brokenFrom, false);
    const back = tapePiece(cells, start, cutK, visibleEnd, { x: FALL.x * fall, y: FALL.y * fall, z: FALL.z * fall }, Infinity, tornRight);
    out += front.art + back.art;
    text += front.text + back.text;
  }

  // 레일과 칼날. 칼날은 자르는 자리(칸 경계) 위에 선다.
  out += box(GX, GUIDE.y0, RAIL_Z, GX + 6, GUIDE.y1, RAIL_Z + 3, METAL, tone, 1);
  const by = cellY(Math.min(Math.max(cutK, 0), window), cellWidth(labelScale()));
  const drop = bladeDown(state.t);
  const bz0 = BLADE.upZ + (BLADE.downZ - BLADE.upZ) * drop;
  const bz1 = bz0 + BLADE.h;
  const bx = TAPE_X + 1.2;
  out += box(GX + 1.5, by - 4, RAIL_Z + 3, GX + 7, by + 4, RAIL_Z + 9, PALS.tomato, tone, 1);
  out += line([[bx, by, RAIL_Z + 3], [bx, by, bz1]], 1.4);
  out += shape(on(PX(bx), rectUV(by - BLADE.w / 2, bz0, by + BLADE.w / 2, bz1)), METAL.l, 1);
  if (!problem) text += mono(tx(GX + 7.05, by, RAIL_Z + 4.6, `${limit}`, 3.6 * Math.min(1.5, labelScale())));

  // 기계와 판독 창.
  out += box(MACHINE.x0, MACHINE.y0, BASE_H, MACHINE.x1, MACHINE.y1, MACHINE.z1, PALS.cobalt, tone, 1.3);
  const screen = { y0: MACHINE.y0 + 4, y1: MACHINE.y1 - 4, z0: 30, z1: 50 };
  out += shape(on(PX(MACHINE.x1 + 0.05), rectUV(screen.y0, screen.z0, screen.y1, screen.z1)), DARK.m, 1.2);
  out += shape(on(PX(MACHINE.x1 + 0.05), rectUV(MACHINE.y0 + 18, 16, MACHINE.y1 - 18, 20)), DARK.d, 0.9);
  const s = Math.min(1.3, labelScale());
  text += tx(MACHINE.x1 + 0.1, (screen.y0 + screen.y1) / 2, screen.z1 + 4, '읽은 글자', 4.2 * s, INK);
  // 칼날이 지나기 전에는 기계에 붙은 테이프 전체를, 지난 뒤에는 앞 조각을 읽는다.
  const read = displayText(cutDone ? cut : cutAt([...chars], total));
  // 계산기처럼 오른쪽에 맞춰 쓴다: 남은 글자는 밝게, 글자가 되지 못한 조각(□)은 붉게.
  const size = 5.2 * s;
  const right = screen.y0 + 3;
  const boxY = right + (read.broken ? size * 1.1 : 0);
  const sz = (screen.z0 + screen.z1) / 2 - size * 0.35;
  const anchor = (svg: string, a: 'start' | 'end') => svg.replace('text-anchor="middle"', `text-anchor="${a}"`);
  if (read.text) text += anchor(tx(MACHINE.x1 + 0.1, boxY, sz, read.text, size, CERAMIC.l), 'end');
  if (read.broken) text += anchor(tx(MACHINE.x1 + 0.1, boxY, sz, '□', size, PALS.tomato.l), 'start');

  return koreanLabels(out + text);
}
