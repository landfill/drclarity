/*
 * 종이 테이프 기계 figure 의 장면. 받침판 위에 기계 하나가 서 있고, 앞면은:
 *   - 가운데 줄: 종이 테이프. 왼쪽부터 질문 조각(파란 칸)과 모델이 쓴 조각(노란 칸)이 한 칸씩 이어진다.
 *     ② 앞말 참고 단계에서는 테이프 전체 위에 파란 띠가 켜진다 (입력 전체가 다음 선택의 재료).
 *   - 위 왼쪽: "저장된 계산" 칸. 계산해 둔 조각마다 작은 카드가 한 장씩 쌓인다 (KV 캐시).
 *   - 위 오른쪽: "고른 조각" 창. ③ 에서 고른 조각이 나타나고, ④ 에서 테이프 끝으로 옮겨 붙는다.
 *   - 아래 줄: 네 단계의 등. 지금 단계의 등이 켜진다. 마지막 바퀴는 ④ 를 밟지 않는다.
 * 아직 고르지 않은 조각은 어디에도 그리지 않는다.
 *
 * 그리는 순서: 받침판 → 그림자 → 기계 → 앞면 판 → 칸 → 테이프 → 창 → 옮겨 가는 조각 → 등 → 글자.
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
import { LOOP_STAGES } from './loop';
import { STAGE_LABEL, cachedCount, view, visibleText, type ReelState } from './reel';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 44, 200];
/** 기계: 앞면 x = MACH.x1. 앞면 좌표는 (y, z) 이고 y 가 클수록 화면 왼쪽이다. */
const MACH = { x0: 12, x1: 30, y0: 6, y1: 194, z1: 116 };
const FACE = MACH.x1 + 0.05;
/** 테이프 줄. */
export const TAPE = { u0: 10, u1: 188, v0: 52, v1: 70 };
/** 칸 글자의 기준 크기와 최대 크기. 칸 폭은 최대 크기의 글자에 맞춘다. */
const CELL_TEXT = 5;
export const CELL_TEXT_MAX = 6;
/** 저장된 계산 칸. */
export const CACHE = { u0: 112, u1: 188, v0: 78, v1: 110, cols: 7 };
/** 고른 조각 창. */
export const WINDOW = { u0: 14, u1: 64, v0: 78, v1: 110 };
/** 단계 등의 가운데 (u) 와 높이. */
export const LAMP_U = [165, 122, 79, 36];
const LAMP_V = 38;

export const REEL_SIZE: Vec3 = [BASE[2], BASE[3], MACH.z1];

export const labelSize = (scale = labelScale()) => 4.4 * Math.min(1.4, scale);
/** 단계 등 이름의 크기: 네 이름이 한 줄에 놓이므로 조금만 키운다. */
export const lampLabelSize = (scale = labelScale()) => 4.4 * Math.min(1.3, scale) * 0.85;
export const cellTextSize = (scale = labelScale()) => Math.min(CELL_TEXT_MAX, CELL_TEXT * scale);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

/** 테이프 칸: 왼쪽 끝부터 차례로, 폭은 글자에 맞춘다. */
export function cells(context: readonly string[]): { uL: number; uR: number }[] {
  let u = TAPE.u1 - 3;
  return context.map((tok) => {
    const w = Math.max(9, textWidth(visibleText(tok), CELL_TEXT_MAX) + 2.4);
    const c = { uL: u, uR: u - w };
    u -= w + 1;
    return c;
  });
}

const face = (uv: [number, number][], dx = 0): Vec3[] => on(PX(FACE + dx), uv);
const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);
const ease = (t: number) => t * t * (3 - 2 * t);

/** 장면 전체. */
export function reelScene(s: ReelState): string {
  const size = labelSize();
  const small = size * 0.85;
  const cellSize = cellTextSize();
  const { stage, step, context, freshIndex, isFinal } = view(s);
  const promptLength = s.sample.prompt.length;

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [MACH.x0, MACH.x1].flatMap((x) => [MACH.y0, MACH.y1].flatMap((y) => [BASE_H, MACH.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));
  out += box(MACH.x0, MACH.y0, BASE_H, MACH.x1, MACH.y1, MACH.z1, WOOD, tone, 1.3);
  out += shape(face(rectUV(MACH.y0 + 3, BASE_H + 3, MACH.y1 - 3, MACH.z1 - 3)), CERAMIC.l, 1);

  let text = '';
  const put = (u: number, v: number, str: string, sz: number, color: string = INK, weight = 700, dx = 0.1) => (text += tx(FACE + dx, u, v - sz * 0.35, str, sz, color, weight));

  // 저장된 계산: 계산해 둔 조각마다 작은 카드 한 장.
  const reading = stage === 'read';
  out += shape(face(rectUV(CACHE.u0, CACHE.v0, CACHE.u1, CACHE.v1), 0.05), reading ? PALS.cobalt.l : BOARD.l, 1);
  const cached = cachedCount(s);
  const cw = (CACHE.u1 - CACHE.u0 - 8) / CACHE.cols;
  for (let i = 0; i < cached; i++) {
    const col = i % CACHE.cols;
    const row = Math.floor(i / CACHE.cols);
    const u = CACHE.u1 - 4 - col * cw;
    const v = CACHE.v1 - 14 - row * 8;
    out += shape(face(rectUV(u - cw + 1.2, v - 6, u, v), 0.1), CERAMIC.l, 0.7);
  }
  put((CACHE.u0 + CACHE.u1) / 2, CACHE.v1 - 5, `저장된 계산 ${cached}개`, small, INK, 700);

  // 고른 조각 창.
  out += shape(face(rectUV(WINDOW.u0, WINDOW.v0, WINDOW.u1, WINDOW.v1), 0.05), BOARD.l, 1);
  put((WINDOW.u0 + WINDOW.u1) / 2, WINDOW.v1 - 5, '고른 조각', small, INK, 700);
  const slot = { u0: WINDOW.u0 + 8, u1: WINDOW.u1 - 8, v0: WINDOW.v0 + 4, v1: WINDOW.v1 - 11 };
  out += shape(face(rectUV(slot.u0, slot.v0, slot.u1, slot.v1), 0.1), CERAMIC.l, 0.9);

  // 테이프.
  out += shape(face(rectUV(TAPE.u0, TAPE.v0, TAPE.u1, TAPE.v1), 0.05), BOARD.l, 1);
  if (reading) out += `<path d="${pd(face(rectUV(TAPE.u0 + 1, TAPE.v0 + 1, TAPE.u1 - 1, TAPE.v1 - 1), 0.08))}" fill="none" stroke="${PALS.cobalt.d}" stroke-width="2.2"/>`;
  const cs = cells(context);
  const flying = stage === 'append' && freshIndex >= 0 && s.t < 1;
  cs.forEach((c, i) => {
    if (flying && i === freshIndex) {
      // 아직 옮겨 가는 중: 자리만 점선으로.
      out += `<path d="${pd(face(rectUV(c.uR, TAPE.v0 + 2, c.uL, TAPE.v1 - 2), 0.1))}" fill="none" stroke="${INK}" stroke-width=".8" stroke-dasharray="1.8 1.4"/>`;
      return;
    }
    const generated = i >= promptLength;
    out += shape(face(rectUV(c.uR, TAPE.v0 + 2, c.uL, TAPE.v1 - 2), 0.1), generated ? PALS.mustard.l : PALS.cobalt.l, i === freshIndex ? 1.6 : 0.8);
    text += mono(tx(FACE + 0.2, (c.uL + c.uR) / 2, (TAPE.v0 + TAPE.v1) / 2 - cellSize * 0.35, visibleText(context[i]), cellSize, INK, i === freshIndex ? 700 : 400));
  });
  put(TAPE.u1 - 4 - textWidth('질문 + 지금까지 쓴 답 → 다음 선택의 입력', small * 0.9) / 2, TAPE.v0 - 5, '질문 + 지금까지 쓴 답 → 다음 선택의 입력', small * 0.9, palette.muted, 400);

  // 고른 조각: ③ 에서 창에, ④ 에서 테이프 끝으로 옮겨 간다. 마지막 바퀴에는 "끝".
  const pickedText = isFinal ? '끝' : step.emitted === null ? '' : visibleText(step.emitted);
  if (stage === 'pick') {
    put((slot.u0 + slot.u1) / 2, (slot.v0 + slot.v1) / 2, pickedText, size * 1.1, INK, 700, 0.2);
  } else if (flying) {
    const target = cs[freshIndex];
    const k = ease(s.t);
    const w = target.uL - target.uR;
    const cu = (slot.u0 + slot.u1) / 2 + (((target.uL + target.uR) / 2) - (slot.u0 + slot.u1) / 2) * k;
    const cv = (slot.v0 + slot.v1) / 2 + ((TAPE.v0 + TAPE.v1) / 2 - (slot.v0 + slot.v1) / 2) * k;
    const h = TAPE.v1 - TAPE.v0 - 4;
    out += shape(face(rectUV(cu - w / 2, cv - h / 2, cu + w / 2, cv + h / 2), 1.2), PALS.mustard.l, 1.6);
    text += mono(tx(FACE + 1.3, cu, cv - cellSize * 0.35, pickedText, cellSize, INK, 700));
  }
  // 창에서 테이프 끝으로 가는 화살표 (④ 끝에 붙이기 ↻).
  const tipU = Math.max(TAPE.u0 + 6, (cs.length ? cs[cs.length - 1].uR : TAPE.u1) - 6);
  out += line(face([[(slot.u0 + slot.u1) / 2, WINDOW.v0], [(slot.u0 + slot.u1) / 2, TAPE.v1 + 4], [tipU, TAPE.v1 + 4]], 0.1), 0.9);

  // 네 단계의 등.
  LOOP_STAGES.forEach((st, i) => {
    const unreachable = isFinal && st === 'append';
    const lit = st === stage && !unreachable;
    out += shape(face(ellUV(LAMP_U[i], LAMP_V, 4.2, 4.2, 20), 0.1), lit ? PALS.mint.m : unreachable ? BOARD.l : BOARD.m, lit ? 1.4 : 0.9);
    put(LAMP_U[i], LAMP_V - 10, `${'①②③④'[i]} ${STAGE_LABEL[st]}`, lampLabelSize(), unreachable ? palette.muted : INK, lit ? 700 : 400);
  });

  return koreanLabels(out + text);
}

