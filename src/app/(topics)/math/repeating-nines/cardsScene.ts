/*
 * 확대 카드 figure 의 장면. 받침판 뒤쪽에 파란 판이 서 있고, 판에 카드가 두 줄로 붙는다.
 * 판 앞 받침판 위에 나무 카드 상자가 있다. 상자는 칸막이로 나뉘어, 앞칸에는 아직 꺼내지 않은 카드가,
 * 뒤칸에는 이미 본 카드가 선다. 카드는 앞면이 보는 사람을 향해 서 있다(색인 카드 상자처럼).
 *
 * 위아래로 붙은 카드 사이에는 윗 카드의 마지막 눈금 한 칸(틈)에서 아랫 카드의 양 끝으로 점선을 긋는다.
 * 아랫 카드가 그 한 칸을 열 배로 키운 것이라는 표시다.
 *
 * 그리는 순서: 받침판 → 그림자 → 판 → 점선 → 판의 카드 → 상자 뒷벽 → 뒤칸 카드 → 들어가는 카드 → 칸막이
 *   → 앞칸 카드 → 나오는 카드 → 상자 옆벽·앞벽 → 글자.
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
import { MONO_FONT, palette } from '@/styles/palette';
import { MAX_DIGITS } from './nines';
import { TICKS, cardFace, cardPlace, type CardsState } from './cards';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 40, 226];
/** 판: 앞면 x = FX. */
const FX = 8;
const PANEL = { y0: 2, y1: 224, z1: 146 };
/** 카드: 판 위에서 앞면 x = CARD_X. 폭(y)과 높이(z). 왼쪽 끝 y = CARD_YL. */
const CARD_X = FX + 0.6;
export const CARD_W = 172;
export const CARD_H = 40;
const CARD_YL = 199;
/** 맨 위 줄 카드의 아래 끝 z 와 줄 간격. */
const TOP_ROW_Z = 100;
const ROW_GAP = 54;
/** 카드 상자: x 앞뒤, y 좌우, 높이. 칸막이 x. */
const BOX = { x0: 12, x1: 37, y0: CARD_YL - CARD_W - 3, y1: CARD_YL + 3, z1: BASE_H + 24, wall: 1 };
const DIVIDER_X = 23.5;
/** 상자 안 카드: 바닥 z, 앞칸 맨 앞 x, 뒤칸 맨 뒤 x, 카드 사이. */
const IN_BOX_Z = BASE_H + 1;
const FRONT_X = BOX.x1 - BOX.wall - 1;
const BACK_X = BOX.x0 + BOX.wall + 0.8;
const IN_BOX_STEP = 0.6;
/** 상자에서 들어 올린 높이 (카드 아래 끝 z). */
const LIFT_Z = BOX.z1 + 12;

export const CARDS_SIZE: Vec3 = [BASE[2], BASE[3], PANEL.z1];

const PANEL_MAT = PALS.cobalt;
const GAP_FILL = palette['accent-fill'];
const PIN_COLOR = palette.accent;
const ONE_COLOR = palette.blue;

/** 카드의 눈금 자 (카드 안 비율): 왼쪽 끝 u, 오른쪽 끝 u, 높이 v. */
const RULER = { u0: 0.06, u1: 0.94, v: 0.46 };
/** 자의 굵은 표시(아홉째 눈금과 1)가 차지하는 높이 (카드 안 비율). 글자는 이 띠를 가리지 않는다. */
export const RULER_BAND = { v0: RULER.v - 0.14, v1: RULER.v + 0.16 };
/** 눈금 i (0..TICKS) 의 u. 정수 칸으로 정하므로 어느 카드든 같은 자리다. */
export const tickU = (i: number) => RULER.u0 + ((RULER.u1 - RULER.u0) * i) / TICKS;

/** 줄 row (0 = 맨 위) 에 붙은 카드의 아래 끝 z. */
export const rowZ = (row: number) => TOP_ROW_Z - row * ROW_GAP;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

/** 카드가 선 자리: 앞면 x 와 아래 끝 z. */
interface Pose {
  x: number;
  z: number;
}

/** 상자 앞칸의 i 번째 카드 (0 = 맨 앞, 다음에 나올 카드). */
const frontSlot = (i: number): Pose => ({ x: FRONT_X - i * IN_BOX_STEP, z: IN_BOX_Z });
/** 상자 뒤칸의 i 번째 카드 (0 = 맨 뒤, 가장 먼저 본 카드). */
const backSlot = (i: number): Pose => ({ x: BACK_X + i * IN_BOX_STEP, z: IN_BOX_Z });

/** 상자 → 판: 먼저 곧게 들어 올리고, 그다음 판의 줄로 간다. */
function arrivePose(row: number, t: number): Pose {
  const from = frontSlot(0);
  const a = 0.35;
  if (t < a) return { x: from.x, z: lerp(from.z, LIFT_Z, ease(t / a)) };
  const u = ease((t - a) / (1 - a));
  return { x: lerp(from.x, CARD_X, u), z: lerp(LIFT_Z, rowZ(row), u) };
}

/** 판의 맨 위 줄 → 상자 뒤칸: 뒤칸 위로 와서 곧게 내려간다. */
function leavePose(t: number, seen: number): Pose {
  const to = backSlot(seen);
  const a = 0.65;
  if (t < a) {
    const u = ease(t / a);
    return { x: lerp(CARD_X, to.x, u), z: lerp(rowZ(0), LIFT_Z, u) };
  }
  return { x: to.x, z: lerp(LIFT_Z, to.z, ease((t - a) / (1 - a))) };
}

const cardY = (u: number) => CARD_YL - u * CARD_W;

/** 카드 글자 하나. u 는 가운데, v 는 밑줄 (카드 안 비율). */
export interface CardLabel {
  u: number;
  v: number;
  text: string;
  size: number;
  mono: boolean;
  color: string;
}

/** 글자 폭 (세계 단위). 한글은 1em, 나머지는 0.62em 에 자간 0.04em. */
export const textWidth = (text: string, size: number) =>
  [...text].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

/** 가운데가 u 인 글자를 카드 안에 들도록 민다. */
function clampU(u: number, text: string, size: number): number {
  const half = textWidth(text, size) / 2 / CARD_W;
  return Math.min(0.97 - half, Math.max(0.03 + half, u));
}

/**
 * 카드 k 의 글자. 위 줄: 왼쪽에 이름, 아홉째 눈금 위에 9 가 k 개인 수. 아래 줄: 양 끝 수.
 * 좁은 화면에서는 글자를 키운다 (scale ≤ 2).
 */
export function cardLabels(k: number, scale = Math.min(2, labelScale())): CardLabel[] {
  const f = cardFace(k);
  const size = 4.6 * scale;
  const top = 0.74;
  const bottom = 0.08;
  const nameSize = 4.3 * scale;
  const nameU = 0.03 + textWidth(f.name, nameSize) / 2 / CARD_W;
  return [
    { u: nameU, v: top, text: f.name, size: nameSize, mono: false, color: INK },
    { u: clampU(tickU(TICKS - 1), f.pin, size), v: top, text: f.pin, size, mono: true, color: PIN_COLOR },
    { u: clampU(tickU(0), f.left, size), v: bottom, text: f.left, size, mono: true, color: INK },
    { u: clampU(tickU(TICKS), f.right, size), v: bottom, text: f.right, size, mono: true, color: ONE_COLOR },
  ];
}

const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);

/** 카드 k 의 그림 (글자 제외). */
function cardArt(p: Pose): string {
  const P2 = (u: number, v: number): Vec3 => [p.x, cardY(u), p.z + v * CARD_H];
  const at = (x: number) => PX(x);
  let s = shape(on(at(p.x), rectUV(cardY(1), p.z, cardY(0), p.z + CARD_H)), CERAMIC.l, 1.1);
  // 틈: 마지막 눈금 한 칸.
  s += fill(pd(on(at(p.x + 0.02), rectUV(cardY(tickU(TICKS)), p.z + (RULER_BAND.v0 + 0.02) * CARD_H, cardY(tickU(TICKS - 1)), p.z + (RULER_BAND.v1 - 0.02) * CARD_H))), GAP_FILL);
  // 자와 눈금.
  s += line([P2(RULER.u0, RULER.v), P2(RULER.u1, RULER.v)], 1.1);
  for (let i = 1; i < TICKS - 1; i++) s += line([P2(tickU(i), RULER.v - 0.06), P2(tickU(i), RULER.v + 0.06)], 0.8);
  s += line([P2(tickU(0), RULER.v - 0.1), P2(tickU(0), RULER.v + 0.1)], 1.1);
  const mark = (i: number, c: string) =>
    `<path d="${pd([P2(tickU(i), RULER_BAND.v0), P2(tickU(i), RULER_BAND.v1)], false)}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`;
  s += mark(TICKS - 1, PIN_COLOR) + mark(TICKS, ONE_COLOR);
  return s;
}

function cardText(k: number, p: Pose): string {
  let s = '';
  for (const l of cardLabels(k)) {
    const t = tx(p.x + 0.05, cardY(l.u), p.z + l.v * CARD_H, l.text, l.size, l.color);
    s += l.mono ? mono(t) : t;
  }
  return s;
}

/** 위 카드의 틈에서 아래 카드의 양 끝으로 긋는 점선. */
function zoomLines(upperZ: number, lowerZ: number): string {
  const x = FX + 0.3;
  const dash = `fill="none" stroke="${INK}" stroke-width=".9" stroke-dasharray="2 1.6" stroke-opacity=".75"`;
  const a: Vec3 = [x, cardY(tickU(TICKS - 1)), upperZ];
  const b: Vec3 = [x, cardY(tickU(TICKS)), upperZ];
  const c: Vec3 = [x, cardY(0), lowerZ + CARD_H];
  const d: Vec3 = [x, cardY(1), lowerZ + CARD_H];
  return `<path d="${pd([a, c], false)}" ${dash}/><path d="${pd([b, d], false)}" ${dash}/>`;
}

/** 장면 전체. 카드는 9 의 개수(state.shown)에 따라 상자 앞칸 → 판 → 상자 뒤칸으로 옮겨 간다. */
export function cardsScene(state: CardsState): string {
  const places = Array.from({ length: MAX_DIGITS }, (_, i) => ({ k: i + 1, place: cardPlace(i + 1, state.shown) }));
  const inBox = places.filter((c) => c.place.kind === 'box');
  const seen = places.filter((c) => c.place.kind === 'seen');
  const onBoard = places.filter((c) => c.place.kind === 'row');

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [FX - 4, FX].flatMap((x) => [PANEL.y0, PANEL.y1].flatMap((y) => [BASE_H, PANEL.z1].map((z) => [x, y, z] as Vec3)));
  const boxCorners: Vec3[] = [BOX.x0, BOX.x1].flatMap((x) => [BOX.y0, BOX.y1].flatMap((y) => [BASE_H, BOX.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H) + castShadow(boxCorners, BASE_H));
  out += box(FX - 4, PANEL.y0, BASE_H, FX, PANEL.y1, PANEL.z1, PANEL_MAT, tone, 1.3);

  // 판의 카드와 그 사이 점선.
  const rowOf = new Map(onBoard.map((c) => [c.k, c.place.kind === 'row' ? c.place.row : 0]));
  for (const { k } of onBoard) {
    const upper = rowOf.get(k - 1);
    if (upper !== undefined) out += zoomLines(rowZ(upper), rowZ(rowOf.get(k)!));
  }
  // 글자는 필터 밖 층에서 모든 그림 위에 얹힌다. 옮겨 가는 카드가 판의 카드 앞을 지나는 동안 글자가 겹쳐 보이지
  // 않도록, 옮겨 가는 카드는 자리에 선 뒤에야 글자를 쓰고, 판의 카드가 한 줄씩 올라가는 동안에는 판의 글자도 쉰다.
  const shifting = places.some((c) => c.place.kind === 'leave');
  let text = '';
  for (const { k } of onBoard) {
    const p = { x: CARD_X, z: rowZ(rowOf.get(k)!) };
    out += cardArt(p);
    if (!shifting) text += cardText(k, p);
  }

  // 상자: 뒷벽 → 뒤칸 카드 → 들어가는 카드 → 칸막이 → 앞칸 카드 → 나오는 카드 → 옆벽·앞벽.
  const wall = (x0: number, x1: number, z1 = BOX.z1) => box(x0, BOX.y0, BASE_H, x1, BOX.y1, z1, WOOD, tone, 1.1);
  out += wall(BOX.x0, BOX.x0 + BOX.wall);
  seen.forEach((_, i) => (out += cardArt(backSlot(i))));
  for (const c of places) {
    if (c.place.kind !== 'leave') continue;
    const p = leavePose(c.place.t, seen.length);
    out += cardArt(p);
  }
  out += wall(DIVIDER_X - 0.4, DIVIDER_X + 0.4, BOX.z1 - 6);
  // 앞칸: 맨 앞이 다음에 나올 카드다. 뒤에서부터 그린다.
  for (let i = inBox.length - 1; i >= 0; i--) out += cardArt(frontSlot(i));
  for (const c of places) {
    if (c.place.kind !== 'arrive') continue;
    const p = arrivePose(c.place.row, c.place.t);
    out += cardArt(p);
  }
  out += box(BOX.x0, BOX.y1 - BOX.wall, BASE_H, BOX.x1, BOX.y1, BOX.z1, WOOD, tone, 1.1);
  out += box(BOX.x0, BOX.y0, BASE_H, BOX.x1, BOX.y0 + BOX.wall, BOX.z1, WOOD, tone, 1.1);
  out += wall(BOX.x1 - BOX.wall, BOX.x1);
  // 상자 앞벽의 글자: 남은 카드 수.
  text += tx(BOX.x1 + 0.05, (BOX.y0 + BOX.y1) / 2, BASE_H + 8, `남은 카드 ${inBox.length}장`, 5.2 * Math.min(1.8, labelScale()));

  return koreanLabels(out + text);
}
