/*
 * 돌림판 figure 의 장면. 받침판 위에 나무 판이 서 있다. 앞면은:
 *   - 위: 문맥 한 줄과 커서 (예전 화면의 문장 줄).
 *   - 왼쪽: 돌림판. 칸마다 한 후보이고 칸의 각도가 뽑힐 확률이다. 위쪽 바늘은 고정이고 판이 돈다.
 *   - 오른쪽: 후보 표. 한 줄에 색 견본, 후보, 확률 막대(막대 길이 = 뽑힐 확률), 확률, 오른쪽 끝에 뽑힌 횟수.
 *     판이 비스듬해 오른쪽이 위로 올라가 보이므로, 한 후보의 값은 모두 한 줄에 둔다.
 *     (본문 note-logit: "막대 길이는 뽑힐 확률, 오른쪽 횟수는 실제로 뽑힌 결과입니다.")
 * 방금 뽑힌 후보는 판의 칸과 표의 줄을 굵은 테로 표시한다.
 *
 * 그리는 순서: 받침판 → 그림자 → 판 → 앞면 → 돌림판 → 바늘 → 표 → 글자.
 */
import {
  METAL,
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
  ellUV,
  labelScale,
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
import { isSettled, shownRot, type WheelState } from './wheel';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 40, 196];
/** 판: 앞면 x = STAND.x1. 앞면 좌표는 (y, z) 이고 y 가 클수록 화면 왼쪽이다. */
const STAND = { x0: 8, x1: 14, y0: 4, y1: 192, z1: 126 };
const FACE = STAND.x1 + 0.05;
/** 문맥 줄. */
export const PROMPT_LINE = { u0: 10, u1: 188, v0: 108, v1: 121 };
/** 돌림판: 가운데와 반지름. */
export const WHEEL = { u: 150, v: 56, r: 37 };
/** 후보 표: 첫 줄의 위 끝, 줄 높이, 열 자리. */
export const TABLE = { top: 96, row: 13, swatch: 106, word: 99, barL: 67, barR: 45, pct: 43, count: 22 };

export const SECTOR_COLORS = [PALS.mustard.l, PALS.cobalt.l, PALS.tomato.l, PALS.mint.l, PALS.blush.l, METAL.m];

export const WHEEL_SIZE: Vec3 = [BASE[2], BASE[3], STAND.z1];

export const labelSize = (scale = labelScale()) => 4.2 * Math.min(1.35, scale);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

const face = (uv: [number, number][], dx = 0): Vec3[] => on(PX(FACE + dx), uv);

/** 화면에서 위쪽부터 시계 방향으로 θ(도) 인 판 위의 점. 화면 오른쪽이 u 가 작은 쪽이다. */
export function wheelPoint(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [WHEEL.u - r * Math.sin(a), WHEEL.v + r * Math.cos(a)];
}

/** 후보 i 의 칸이 차지하는 판 위 각도 [시작, 끝) (위쪽부터 시계 방향, 판을 돌리기 전). */
export function sectorRange(probs: number[], i: number): [number, number] {
  const start = probs.slice(0, i).reduce((a, b) => a + b, 0) * 360;
  return [start, start + probs[i] * 360];
}

/** 장면 전체. words 는 후보 낱말, prompt 는 문맥 문장. */
export function wheelScene(s: WheelState, words: string[], prompt: string): string {
  const size = labelSize();
  const rot = shownRot(s);
  const settled = isSettled(s);
  const picked = settled ? s.last : null;
  const total = s.tally.reduce((a, b) => a + b, 0);

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [STAND.x0, STAND.x1].flatMap((x) => [STAND.y0, STAND.y1].flatMap((y) => [BASE_H, STAND.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));
  out += box(STAND.x0 - 4, STAND.y0 + 10, BASE_H, STAND.x1 + 10, STAND.y0 + 16, BASE_H + 5, WOOD, tone, 1);
  out += box(STAND.x0 - 4, STAND.y1 - 16, BASE_H, STAND.x1 + 10, STAND.y1 - 10, BASE_H + 5, WOOD, tone, 1);
  out += box(STAND.x0, STAND.y0, BASE_H + 5, STAND.x1, STAND.y1, STAND.z1, WOOD, tone, 1.3);
  out += shape(face(rectUV(STAND.y0 + 3, BASE_H + 8, STAND.y1 - 3, STAND.z1 - 3)), CERAMIC.l, 1);

  let text = '';
  const put = (u: number, v: number, str: string, sz: number, color: string = INK, weight = 700) => (text += tx(FACE + 0.1, u, v - sz * 0.35, str, sz, color, weight));
  const putLeft = (uLeft: number, v: number, str: string, sz: number, color: string = INK, weight = 700) => put(uLeft - textWidth(str, sz) / 2, v, str, sz, color, weight);

  // 문맥 줄.
  out += shape(face(rectUV(PROMPT_LINE.u0, PROMPT_LINE.v0, PROMPT_LINE.u1, PROMPT_LINE.v1), 0.05), CERAMIC.l, 1);
  putLeft(PROMPT_LINE.u1 - 5, (PROMPT_LINE.v0 + PROMPT_LINE.v1) / 2, `${prompt} ▮`, size * 1.1);

  // 돌림판: 칸마다 한 후보.
  out += shape(face(ellUV(WHEEL.u, WHEEL.v, WHEEL.r + 2.5, WHEEL.r + 2.5, 48), 0.1), WOOD.m, 1.2);
  s.probs.forEach((p, i) => {
    if (p <= 0) return;
    const [a0, a1] = sectorRange(s.probs, i);
    const n = Math.max(2, Math.ceil((a1 - a0) / 6));
    const pts: [number, number][] = [[WHEEL.u, WHEEL.v]];
    for (let k = 0; k <= n; k++) pts.push(wheelPoint(WHEEL.r, a0 + ((a1 - a0) * k) / n + rot));
    out += shape(face(pts, 0.2), SECTOR_COLORS[i % SECTOR_COLORS.length], i === picked ? 1.8 : 0.7);
  });
  out += shape(face(ellUV(WHEEL.u, WHEEL.v, 4, 4, 20), 0.3), WOOD.d, 1);
  // 바늘: 위쪽에 고정, 아래를 가리킨다.
  const tip = wheelPoint(WHEEL.r - 6, 0);
  out += shape(face([tip, [tip[0] + 4, WHEEL.v + WHEEL.r + 6], [tip[0] - 4, WHEEL.v + WHEEL.r + 6]], 0.4), PALS.tomato.m, 1.2);

  // 후보 표.
  const head = TABLE.top + 4;
  putLeft(TABLE.swatch, head, '막대: 뽑힐 확률 · 횟수: 뽑힌 결과', size * 0.8, palette.muted, 400);
  words.forEach((w, i) => {
    const v = TABLE.top - 4 - i * TABLE.row;
    const mine = i === picked;
    const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
    // 줄 아래의 가는 선: 판이 비스듬해도 한 줄로 읽히게 한다.
    const rule = v - TABLE.row / 2;
    out += `<path d="${pd(face([[TABLE.swatch + 1, rule], [TABLE.count - 9, rule]], 0.06), false)}" fill="none" stroke="${palette.muted}" stroke-width=".5" stroke-opacity=".6"/>`;
    out += shape(face(rectUV(TABLE.swatch - 5, v - 2.5, TABLE.swatch, v + 2.5), 0.1), color, mine ? 1.6 : 0.8);
    putLeft(TABLE.word, v, w, size, INK, mine ? 700 : 400);
    // 확률 막대.
    out += shape(face(rectUV(TABLE.barR, v - 2, TABLE.barL, v + 2), 0.08), BOARD.l, 0.6);
    const len = (TABLE.barL - TABLE.barR) * s.probs[i];
    if (len > 0.3) out += shape(face(rectUV(TABLE.barL - len, v - 2, TABLE.barL, v + 2), 0.12), color, 0.6);
    putLeft(TABLE.pct, v, `${(s.probs[i] * 100).toFixed(1)}%`, size * 0.85, INK, 400);
    if (total > 0) putLeft(TABLE.count, v, `${s.tally[i]}회`, size * 0.9, INK, mine ? 700 : 400);
  });

  return koreanLabels(out + text);
}
