/*
 * 채점판 figure 의 장면. 받침판 위에 판 하나가 서 있다. 앞면은:
 *   - 위: 방식 판. 지금 방식과 그 방식이 학습 자료에서 무엇을 저장했는지 적는다. 왼쪽 위 화살표가 학습 칸에서
 *     방식 판으로 올라간다 ("학습 자료로만 만듦"). 새 예시 칸에서 올라가는 화살표는 없다.
 *   - 아래 왼쪽: 학습에 쓴 예시 카드 6장. 아래 오른쪽: 칸막이 너머 따로 남긴 새 예시 카드 4장.
 *   - 카드마다 날(요일), 날씨 그림, 정답, 예측 도장, 맞음/틀림 표시. 도장 색은 그 예측을 낸 방식의 색이다.
 *   - 칸 아래에 맞힌 수.
 * 맞음/틀림 표시는 잉크 한 색으로 그린다 (어느 방식이 옳다는 색을 칠하지 않는다).
 *
 * 그리는 순서: 받침판 → 그림자 → 판 → 앞면 판 → 칸 → 카드 → 화살표 → 글자.
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
import { MONO_FONT, palette } from '@/styles/palette';
import { TRAIN } from './evaluation';
import { CARDS, METHOD_NAME, dayOf, isIndoor, shownPrediction, shownScores, type GradeState, type Method } from './grade';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 44, 196];
/** 판: 앞면 x = STAND.x1. 앞면 좌표는 (y, z) 이고 y 가 클수록 화면 왼쪽이다. */
const STAND = { x0: 12, x1: 30, y0: 6, y1: 190, z1: 136 };
const FACE = STAND.x1 + 0.05;
/** 방식 판. */
export const PLAQUE = { u0: 14, u1: 182, v0: 110, v1: 130 };
/** 두 칸: 학습에 쓴 예시(왼쪽), 새 예시(오른쪽). */
export const TRAY = { train: { u0: 98, u1: 186 }, heldOut: { u0: 10, u1: 72 }, v0: 20, v1: 98 };
/** 카드 크기와 사이. */
export const CARD = { w: 25, h: 30, gap: 3 };
/** 카드 위 줄의 날 이름은 가운데보다 왼쪽에 둔다 (오른쪽 위에 맞음·틀림 표시가 있다). */
export const DAY_SHIFT = 3;
/** 맞음·틀림 표시의 가운데: 카드 가운데에서 오른쪽으로. */
export const MARK_SHIFT = -9;
/** 카드 두 줄의 위 끝 높이. */
const ROW_TOP = [88, 54];

export const GRADE_SIZE: Vec3 = [BASE[2], BASE[3], STAND.z1];

/** 방식의 도장 색. */
export const METHOD_COLOR: Record<Method, string> = { memory: PALS.cobalt.l, rule: PALS.blush.l };

export const labelSize = (scale = labelScale()) => 4.2 * Math.min(1.5, scale);
/** 카드 안 글자 크기: 카드가 작아 좁은 화면에서도 조금만 키운다. */
export const cardTextSize = (scale = labelScale()) => 3.4 * Math.min(1.25, scale);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

/** 카드 i 의 가운데 (u, v). 학습 카드는 3 열, 새 예시 카드는 2 열. */
export function cardCenter(i: number): [number, number] {
  const train = i < TRAIN.length;
  const k = train ? i : i - TRAIN.length;
  const cols = train ? 3 : 2;
  const tray = train ? TRAY.train : TRAY.heldOut;
  const width = cols * CARD.w + (cols - 1) * CARD.gap;
  const left = tray.u1 - (tray.u1 - tray.u0 - width) / 2;
  const col = k % cols;
  const row = Math.floor(k / cols);
  return [left - CARD.w / 2 - col * (CARD.w + CARD.gap), ROW_TOP[row] - CARD.h / 2];
}

const face = (uv: [number, number][], dx = 0): Vec3[] => on(PX(FACE + dx), uv);
const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);

/** 방식 판의 두 줄. */
export function plaqueLines(m: Method): [string, string] {
  return m === 'memory'
    ? [`지금 방식: ${METHOD_NAME.memory}`, '학습 문장 6개의 답을 저장 · 처음 보는 문장 → 0']
    : [`지금 방식: ${METHOD_NAME.rule}`, '학습 자료의 날씨별 다수 답: 비 → 1 · 맑음 → 0'];
}

/** 날씨 그림: 비면 구름과 빗줄기, 맑으면 해. 실내에서 쉬는 날은 작은 집을 더한다. */
function weather(cu: number, cv: number, rainy: boolean, indoor: boolean): string {
  let out = '';
  if (rainy) {
    out += shape(face(ellUV(cu + 2.5, cv + 1.5, 4.2, 3, 16), 0.3), METAL.m, 0.7);
    out += shape(face(ellUV(cu - 2, cv + 2.2, 4.6, 3.6, 16), 0.32), METAL.l, 0.7);
    for (const du of [3, 0, -3]) out += line(face([[cu + du, cv - 2], [cu + du - 1, cv - 5]], 0.33), 0.8);
  } else {
    out += shape(face(ellUV(cu, cv, 3.6, 3.6, 16), 0.3), PALS.mustard.l, 0.8);
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      out += line(face([[cu + 5 * Math.cos(a), cv + 5 * Math.sin(a)], [cu + 6.6 * Math.cos(a), cv + 6.6 * Math.sin(a)]], 0.3), 0.7);
    }
  }
  if (indoor) {
    const hu = cu - 8;
    const hv = cv - 4;
    out += shape(face([[hu + 3, hv - 2.5], [hu - 3, hv - 2.5], [hu - 3, hv + 1], [hu, hv + 3.5], [hu + 3, hv + 1]], 0.34), PALS.mustard.m, 0.7);
  }
  return out;
}

/** 맞음(체크)·틀림(가위표) 표시. 잉크 한 색. */
function mark(u: number, v: number, hit: boolean): string {
  return hit
    ? line(face([[u + 2, v], [u + 0.5, v - 1.8], [u - 2.2, v + 2]], 0.35), 1.1)
    : line(face([[u + 1.8, v + 1.8], [u - 1.8, v - 1.8]], 0.35), 1.1) + line(face([[u - 1.8, v + 1.8], [u + 1.8, v - 1.8]], 0.35), 1.1);
}

/** 장면 전체. */
export function gradeScene(s: GradeState): string {
  const size = labelSize();
  const small = size * 0.82;
  const cardText = cardTextSize();

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [STAND.x0, STAND.x1].flatMap((x) => [STAND.y0, STAND.y1].flatMap((y) => [BASE_H, STAND.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));
  out += box(STAND.x0, STAND.y0, BASE_H, STAND.x1, STAND.y1, STAND.z1, WOOD, tone, 1.3);
  out += shape(face(rectUV(STAND.y0 + 3, BASE_H + 3, STAND.y1 - 3, STAND.z1 - 3)), CERAMIC.l, 1);

  let text = '';
  const put = (u: number, v: number, str: string, sz: number, color: string = INK, weight = 700) => (text += tx(FACE + 0.1, u, v - sz * 0.35, str, sz, color, weight));

  // 방식 판: 지금 방식의 도장 색 견본과 두 줄.
  out += shape(face(rectUV(PLAQUE.u0, PLAQUE.v0, PLAQUE.u1, PLAQUE.v1), 0.1), CERAMIC.l, 1.1);
  out += shape(face(rectUV(PLAQUE.u1 - 12, PLAQUE.v0 + 6, PLAQUE.u1 - 4, PLAQUE.v1 - 6), 0.15), METHOD_COLOR[s.method], 0.9);
  const [l1, l2] = plaqueLines(s.method);
  const mid = (PLAQUE.u0 + PLAQUE.u1 - 14) / 2;
  put(mid, PLAQUE.v1 - 6, l1, size);
  put(mid, PLAQUE.v0 + 6, l2, small, INK, 400);

  // 두 칸과 칸막이.
  out += shape(face(rectUV(TRAY.train.u0, TRAY.v0, TRAY.train.u1, TRAY.v1), 0.05), PALS.mint.l, 1);
  out += shape(face(rectUV(TRAY.heldOut.u0, TRAY.v0, TRAY.heldOut.u1, TRAY.v1), 0.05), PALS.blush.l, 1);
  const divider = (TRAY.train.u0 + TRAY.heldOut.u1) / 2;
  out += box(STAND.x1, divider - 2, BASE_H + 3, STAND.x1 + 5, divider + 2, TRAY.v1 + 4, WOOD, tone, 1);
  put((TRAY.train.u0 + TRAY.train.u1) / 2, TRAY.v1 - 5, '학습에 쓴 예시', small);
  put((TRAY.heldOut.u0 + TRAY.heldOut.u1) / 2, TRAY.v1 - 5, '새 예시 · 학습에 안 씀', small);

  // 카드.
  CARDS.forEach((e, i) => {
    const [cu, cv] = cardCenter(i);
    out += shape(face(rectUV(cu - CARD.w / 2, cv - CARD.h / 2, cu + CARD.w / 2, cv + CARD.h / 2), 0.2), CERAMIC.l, 0.9);
    out += weather(cu, cv + 2, e.rainy, isIndoor(e));
    put(cu + DAY_SHIFT, cv + CARD.h / 2 - 4.5, dayOf(e), cardText, INK, 700);
    const p = shownPrediction(s, i);
    // 아래 줄: 정답(왼쪽)과 예측 도장(오른쪽).
    const bv = cv - CARD.h / 2 + 5;
    put(cu + 5.5, bv, `정답 ${e.label}`, cardText * 0.9, palette.muted, 400);
    out += shape(face(rectUV(cu - 11, bv - 4, cu - 3, bv + 4), 0.3), METHOD_COLOR[p.method], 0.9);
    text += mono(tx(FACE + 0.4, cu - 7, bv - size * 0.35, String(p.value), size, INK, 700));
    out += mark(cu + MARK_SHIFT, cv + CARD.h / 2 - 4.5, p.value === e.label);
  });

  // 화살표: 학습 칸 → 방식 판, 방식 판 → 두 칸의 예측.
  const arrow = (u: number, v0: number, v1: number) => {
    const dir = Math.sign(v1 - v0);
    return line(face([[u, v0], [u, v1]], 0.1), 1.1) + line(face([[u + 2, v1 - dir * 2.6], [u, v1], [u - 2, v1 - dir * 2.6]], 0.1), 1.1);
  };
  const up = TRAY.train.u1 - 6;
  out += arrow(up, TRAY.v1 + 1, PLAQUE.v0 - 1);
  put(up - 5 - textWidth('학습 자료로만 만듦', small * 0.85) / 2, (TRAY.v1 + PLAQUE.v0) / 2, '학습 자료로만 만듦', small * 0.85, palette.muted, 400);
  out += arrow((TRAY.train.u0 + TRAY.train.u1) / 2 - 20, PLAQUE.v0 - 1, TRAY.v1 + 1);
  out += arrow((TRAY.heldOut.u0 + TRAY.heldOut.u1) / 2, PLAQUE.v0 - 1, TRAY.v1 + 1);
  put((TRAY.heldOut.u0 + TRAY.heldOut.u1) / 2 - 6 - textWidth('예측', small * 0.85) / 2, (TRAY.v1 + PLAQUE.v0) / 2, '예측', small * 0.85, palette.muted, 400);

  // 맞힌 수.
  const sc = shownScores(s);
  put((TRAY.train.u0 + TRAY.train.u1) / 2, (BASE_H + 3 + TRAY.v0) / 2 + 1, `맞힌 수 ${sc.train} / ${TRAIN.length}`, size);
  put((TRAY.heldOut.u0 + TRAY.heldOut.u1) / 2, (BASE_H + 3 + TRAY.v0) / 2 + 1, `맞힌 수 ${sc.heldOut} / ${CARDS.length - TRAIN.length}`, size);

  return koreanLabels(out + text);
}
