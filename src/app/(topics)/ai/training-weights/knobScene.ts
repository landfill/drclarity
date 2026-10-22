/*
 * 가중치 다이얼 figure 의 장면. 받침판 위에 계기판 하나가 서 있다. 앞면은 왼쪽부터:
 *   - 가중치 다이얼: 바늘이 지금 가중치를 가리킨다 (눈금 −2 … 1). 다이얼은 돌린 자리에 남는다.
 *   - 확률 막대: 아래 노란 층이 원문의 정답 '맑다' 의 확률, 위 회색 층이 '흐리다'. 두 층을 합하면 늘 막대 하나(100%).
 *   - 손실 기둥: 빨간 기둥의 높이가 정답 손실이다.
 * 위쪽 계산 띠에는 실행한 뒤에만 기울기와 새 가중치의 식을 적는다. 다이얼 바깥의 화살표가 그 식이 정한 만큼 돈다.
 * 실행한 뒤에는 학습 전 값을 흐린 선("전")으로 남겨 전후를 견준다. 목표로 삼을 "좋은 값" 표시는 그리지 않는다
 * (본문: 버튼은 좋은 숫자를 미리 골라 끼우지 않는다).
 *
 * 그리는 순서: 받침판 → 그림자 → 계기판 → 앞면 판 → 다이얼 → 막대 → 기둥 → 글자.
 */
import {
  METAL,
  BOARD,
  CERAMIC,
  INK,
  PALS,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  ellUV,
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
import { INITIAL_WEIGHT } from './model';
import { AFTER_WEIGHT, gradientLines, percent, readings, shownWeight, showsGradient, signed, type WeightState } from './knob';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 44, 190];
/** 계기판: 앞면 x = CON.x1. 앞면 좌표는 (y, z) 이고 y 가 클수록 화면 왼쪽이다. */
const CON = { x0: 10, x1: 30, y0: 6, y1: 184, z1: 112 };
const FACE = CON.x1 + 0.05;
/** 다이얼: 가운데와 반지름. 눈금은 −2 … 1 을 270° 에 펼친다. */
export const DIAL = { u: 158, v: 46, r: 18, min: -2, max: 1 };
/** 다이얼 바깥의 화살표 반지름 (눈금 숫자보다 바깥). */
const ARC_R = DIAL.r + 11;
/** 확률 막대 (가로 u0..u1, 높이 v0..v1). */
export const BAR = { u0: 112, u1: 124, v0: 14, v1: 74 };
/** 손실 기둥과 그 높이의 끝값 (손실 1.5 가 기둥 맨 위). */
export const COLUMN = { u0: 46, u1: 58, v0: 14, v1: 74, max: 1.5 };
/** 계산 띠: 두 줄의 식. */
export const STRIP = { u0: 10, u1: 180, v0: 88, v1: 108 };

export const WEIGHT_SIZE: Vec3 = [BASE[2], BASE[3], CON.z1];

/** 글자 크기 (좁은 화면에서는 키우되 상한을 둔다). */
export const labelSize = (scale = labelScale()) => 4.4 * Math.min(1.8, scale);
export const formulaSize = (scale = labelScale()) => 3.7 * Math.min(1.8, scale);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

/** 가중치 → 다이얼 각도 (도, 0° = 오른쪽, 90° = 위). −2 는 왼쪽 아래 225°, 1 은 오른쪽 아래 −45°. */
export const dialAngle = (w: number) => 225 - ((w - DIAL.min) / (DIAL.max - DIAL.min)) * 270;
/** 앞면에서 다이얼 가운데로부터 반지름 r, 각도 a 의 점 (u, v). 화면 오른쪽이 u 가 작은 쪽이다. */
export const dialPoint = (r: number, a: number): [number, number] => [DIAL.u - r * Math.cos((a * Math.PI) / 180), DIAL.v + r * Math.sin((a * Math.PI) / 180)];

/** 확률 → 막대 속 노란 층의 윗면 높이. */
export const barSplit = (sunny: number) => BAR.v0 + sunny * (BAR.v1 - BAR.v0);
/** 손실 → 기둥 윗면 높이. */
export const columnTop = (loss: number) => COLUMN.v0 + (Math.min(loss, COLUMN.max) / COLUMN.max) * (COLUMN.v1 - COLUMN.v0);

const face = (uv: [number, number][], dx = 0): Vec3[] => on(PX(FACE + dx), uv);
const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);

/** 장면 전체. */
export function weightScene(s: WeightState): string {
  const size = labelSize();
  const small = size * 0.8;
  const w = shownWeight(s);
  const now = readings(w);
  const before = readings(INITIAL_WEIGHT);
  const done = s.updated && s.t >= 1;

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [CON.x0, CON.x1].flatMap((x) => [CON.y0, CON.y1].flatMap((y) => [BASE_H, CON.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));
  out += box(CON.x0, CON.y0, BASE_H, CON.x1, CON.y1, CON.z1, PALS.mint, tone, 1.3);
  // 앞면 판 둘: 계기 판과 계산 띠.
  out += shape(face(rectUV(CON.y0 + 4, BASE_H + 4, CON.y1 - 4, STRIP.v0 - 3)), CERAMIC.l, 1);
  out += shape(face(rectUV(STRIP.u0, STRIP.v0, STRIP.u1, STRIP.v1)), CERAMIC.l, 1);

  let text = '';
  const put = (u: number, v: number, str: string, sz: number, color: string = INK, weight = 700) => (text += tx(FACE + 0.1, u, v - sz * 0.35, str, sz, color, weight));

  // 다이얼: 원판, 눈금, 숫자.
  out += shape(face(ellUV(DIAL.u, DIAL.v, DIAL.r, DIAL.r, 48), 0.05), CERAMIC.l, 1.2);
  for (let k = DIAL.min; k <= DIAL.max; k++) {
    const a = dialAngle(k);
    const [u0, v0] = dialPoint(DIAL.r - 4, a);
    const [u1, v1] = dialPoint(DIAL.r, a);
    out += line(face([[u0, v0], [u1, v1]], 0.1), 1);
    const [lu, lv] = dialPoint(DIAL.r + 6, a);
    text += mono(tx(FACE + 0.1, lu, lv - small * 0.35, signed(k, 0), small, INK, 400));
  }
  for (let k = DIAL.min; k < DIAL.max; k += 0.25) {
    if (Number.isInteger(k)) continue;
    const a = dialAngle(k);
    out += line(face([dialPoint(DIAL.r - 2, a), dialPoint(DIAL.r, a)], 0.1), 0.6);
  }
  // 지금 가중치 값은 figure 머리줄의 큰 숫자가 보여 준다 (다이얼 안에 쓰면 좁은 화면에서 눈금과 겹친다).
  put(DIAL.u, DIAL.v - DIAL.r - 4.5, '가중치', small, palette.muted, 400);

  // 학습 전 자리: 실행한 뒤에만 흐린 선으로 남긴다.
  if (s.updated) {
    const a = dialAngle(INITIAL_WEIGHT);
    out += `<path d="${pd(face([[DIAL.u, DIAL.v], dialPoint(DIAL.r - 5, a)], 0.15), false)}" fill="none" stroke="${palette.muted}" stroke-width="1" stroke-dasharray="1.6 1.4"/>`;
  }
  // 바늘과 꼭지.
  const a = dialAngle(w);
  out += `<path d="${pd(face([[DIAL.u, DIAL.v], dialPoint(DIAL.r - 5, a)], 0.2), false)}" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  out += shape(face(ellUV(DIAL.u, DIAL.v, 3.4, 3.4, 20), 0.25), PALS.cobalt.m, 1);

  // 기울기가 정한 만큼의 화살표 (다이얼 바깥, 학습 전 자리 → 새 자리).
  if (showsGradient(s)) {
    const a0 = dialAngle(INITIAL_WEIGHT);
    const a1 = dialAngle(AFTER_WEIGHT);
    const pts: [number, number][] = Array.from({ length: 17 }, (_, i) => dialPoint(ARC_R, a0 + ((a1 - a0) * i) / 16));
    out += `<path d="${pd(face(pts, 0.1), false)}" fill="none" stroke="${PALS.tomato.d}" stroke-width="1.4"/>`;
    const tip = dialPoint(ARC_R, a1);
    const back = (r: number) => dialPoint(r, a1 + 7);
    out += `<path d="${pd(face([back(ARC_R + 2.6), tip, back(ARC_R - 2.6)], 0.1), false)}" fill="none" stroke="${PALS.tomato.d}" stroke-width="1.4" stroke-linejoin="round"/>`;
    const [mu, mv] = dialPoint(ARC_R + 5, (a0 + a1) / 2);
    put(mu, mv, `+${(AFTER_WEIGHT - INITIAL_WEIGHT).toFixed(3)}`, small, INK, 700);
    const [l1, l2] = gradientLines(true);
    put((STRIP.u0 + STRIP.u1) / 2, STRIP.v1 - 6, l1, formulaSize());
    put((STRIP.u0 + STRIP.u1) / 2, STRIP.v0 + 5.5, l2, formulaSize());
  } else {
    put((STRIP.u0 + STRIP.u1) / 2, (STRIP.v0 + STRIP.v1) / 2, '실행하면 여기에 기울기와 새 가중치를 적습니다', formulaSize(), palette.muted, 400);
  }

  // 확률 막대: 노란 층 = 맑다(정답), 회색 층 = 흐리다.
  const split = barSplit(now.sunny);
  out += shape(face(rectUV(BAR.u0, BAR.v0, BAR.u1, split), 0.1), PALS.mustard.l, 0.9);
  out += shape(face(rectUV(BAR.u0, split, BAR.u1, BAR.v1), 0.1), METAL.m, 0.9);
  const labelU = BAR.u0 - 3;
  // 정답 맑다의 확률은 큰 글자로, 흐리다는 작은 글자로 (좁은 화면에서도 정답 쪽이 먼저 읽히게).
  const sunnyText = `맑다 ${percent(now.sunny)}`;
  const cloudyText = `흐리다 ${percent(now.cloudy)}`;
  put(labelU - textWidth(sunnyText, size) / 2, (BAR.v0 + split) / 2, sunnyText, size);
  put(labelU - textWidth(cloudyText, small) / 2, (split + BAR.v1) / 2, cloudyText, small);
  put((BAR.u0 + BAR.u1) / 2, BAR.v1 + 3.2, '확률', small, palette.muted, 400);

  // 손실 기둥.
  const top = columnTop(now.loss);
  out += `<path d="${pd(face(rectUV(COLUMN.u0, COLUMN.v0, COLUMN.u1, COLUMN.v1), 0.1))}" fill="none" stroke="${INK}" stroke-width=".8" stroke-dasharray="2 1.6" stroke-opacity=".7"/>`;
  out += shape(face(rectUV(COLUMN.u0, COLUMN.v0, COLUMN.u1, top), 0.12), PALS.tomato.l, 0.9);
  put((COLUMN.u0 + COLUMN.u1) / 2, COLUMN.v1 + 3.2, '정답 손실', small, palette.muted, 400);
  const lossText = now.loss.toFixed(3);
  text += mono(tx(FACE + 0.1, COLUMN.u0 - 4 - textWidth(lossText, size) / 2, top - size * 0.35, lossText, size, INK, 700));

  // 학습 전 값: 실행이 끝난 뒤 흐린 선과 "전" 으로.
  if (done) {
    const dash = (u0: number, u1: number, v: number) =>
      `<path d="${pd(face([[u0, v], [u1, v]], 0.2), false)}" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="1.8 1.4"/>`;
    const bSplit = barSplit(before.sunny);
    out += dash(BAR.u0 - 1, BAR.u1 + 2, bSplit);
    put(BAR.u1 + 3 + textWidth('전', small) / 2, bSplit, '전', small, palette.muted, 400);
    const bTop = columnTop(before.loss);
    out += dash(COLUMN.u0 - 1, COLUMN.u1 + 2, bTop);
    const beforeLoss = `전 ${before.loss.toFixed(3)}`;
    put(COLUMN.u0 - 4 - textWidth(beforeLoss, small) / 2, bTop, beforeLoss, small, palette.muted, 400);
  }

  return koreanLabels(out + text);
}

