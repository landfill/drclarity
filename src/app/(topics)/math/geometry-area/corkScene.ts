/*
 * 코르크판 figure 의 장면. 받침판 위에 나무 테를 두른 코르크판이 서 있고, 판 앞면에 빨간 사분원 펠트와 흰 반원
 * 종이 두 장이 붙어 있다. 판 앞 오른쪽에 핀 통과 실패가 놓여 있다. 핀과 실은 여기서 나온다.
 *
 * 그리는 순서: 받침판 → 그림자 → 코르크판 → 펠트·종이 → 치수와 글자 → 겨자색 테두리(넓이 비교) → 실 → 꽂힌 핀
 *   → 핀 통(남은 핀)·실패 → 옮겨 가는 핀 → 실패에서 풀려 나오는 실.
 */
import {
  BOARD,
  CERAMIC,
  INK,
  PALS,
  WOOD,
  arcUV,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  cyl,
  cylX,
  ease,
  ellUV,
  fill,
  ink,
  labelScale,
  line,
  matOf,
  on,
  pd,
  PX,
  rectUV,
  shape,
  tag,
  tone,
  tx,
  type Vec2,
  type Vec3,
} from '@/lib/colorfigures/core';
import { palette } from '@/styles/palette';
import { GEOMETRY } from './scene';
import {
  AREAS,
  PIN_TARGETS,
  TANGENT,
  piText,
  pinProgress,
  stepDuration,
  sideLabels,
  stringPoints,
  stringProgress,
  stringRunning,
  type CorkState,
  type Pt,
} from './cork';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 24, 104];
/** 코르크판: 앞면 x = FX. */
const FX = 8;
const FRAME = { y0: 20, y1: 100, z1: 86 };
const CORK = { y0: 23, y1: 97, z0: 6, z1: 83 };
/** 도형 좌표 (u 오른쪽, v 위, 단위 = 사분원 반지름 6 의 1/6) → 판 위. */
const K = 8.5;
const Y0 = 80;
const Z0 = 17;
/** 판 위에 붙은 것들의 x. 겹쳐 붙은 순서대로 조금씩 앞이다. */
const FELT_X = FX + 0.05;
const PAPER_X = FX + 0.1;
const MARK_X = FX + 0.15;
const STRING_X = FX + 1.6;
const PIN_LEN = 2.6;
const PIN_R = 1.25;

/** 핀 통과 실패. */
const CUP = { x: 15, y: 8, r: 4, h: 7 };
const SPOOL = { x: 15, y: 17, r: 3.2, h: 6 };

export const CORK_SIZE: Vec3 = [BASE[2], BASE[3], FRAME.z1];

const RED = palette['danger-soft'];
const PAPER = CERAMIC.l;
const CORK_MAT = matOf('#c9a36c');
const PIN = PALS.cobalt;
const STRING = '#3d3935';
const HIGHLIGHT = PALS.mustard.l;

/** 도형 좌표 → 판 앞면 위 3D 점. */
export const onBoard = ([u, v]: Pt | Vec2, x = MARK_X): Vec3 => [x, Y0 - u * K, Z0 + v * K];
const pts = (uv: (Pt | Vec2)[], x = MARK_X) => uv.map((p) => onBoard(p, x));

/** 사분원 (반지름 6). */
const quarterUV = (): Vec2[] => [[0, 0], ...arcUV(0, 0, GEOMETRY.quarter.radius, 90, 0, 36)];
/** 아래 반원 (중심 (3,0), 위쪽 반). */
const bottomUV = (): Vec2[] => arcUV(GEOMETRY.bottom.center[0], GEOMETRY.bottom.center[1], GEOMETRY.bottom.radius, 0, 180, 28);
/** 옆 반원 (중심 (0,4), 오른쪽 반). */
const hangingUV = (): Vec2[] => arcUV(GEOMETRY.hanging.center[0], GEOMETRY.hanging.center[1], GEOMETRY.hanging.radius, 90, -90, 24);

/** 판 앞면에 쓴 글자. 가운데 밑줄이 (u, v). */
export interface BoardLabel {
  u: number;
  v: number;
  text: string;
  size: number;
}

/** 좁은 화면에서 판 글자를 키우는 배율의 상한. 2.2 까지 키우면 세로 치수 "6" 과 변 이름 "6−x" 가 겹친다. */
const BOARD_TEXT_MAX = 1.6;

/** 이 단계에서 판에 쓰인 글자들. 겹침 테스트가 같은 목록을 쓴다. withFrame 안에서 부른다. */
export function boardLabels(s: CorkState): BoardLabel[] {
  const k = Math.min(BOARD_TEXT_MAX, labelScale());
  return baseLabels(s).map((l) => ({ ...l, size: l.size * k }));
}

function baseLabels(s: CorkState): BoardLabel[] {
  const out: BoardLabel[] = [
    { u: -1.75, v: 2.85, text: '6', size: 4.6 },
    { u: 3, v: -1.25, text: '6', size: 4.6 },
  ];
  const [base, upright, hyp] = sideLabels(s);
  // 2단계는 실이 삼각형을 다 두른 뒤에 변 이름을 쓴다.
  const triangle = (s.step === 2 && s.t >= stepDuration(2)) || s.step === 3;
  if (triangle) {
    out.push({ u: 1.5, v: 0.3, text: base, size: 4.4 });
    out.push({ u: -0.68, v: 1.85, text: upright, size: 4.4 });
    out.push({ u: 2.15, v: 2.3, text: hyp, size: 4.4 });
  } else {
    out.push({ u: 1.5, v: 0.3, text: '3', size: 4.4 });
  }
  if (s.step === 0) out.push({ u: 0.75, v: 4.55, text: 'x ?', size: 4.4 });
  if ((s.step === 3 && s.solved) || s.step >= 4) out.push({ u: 0.95, v: 4.75, text: 'x = 2', size: 4.2 });
  if (s.step === 4) out.push({ ...AREA_SPOT[s.area], text: piText(AREAS[s.area]), size: 5 });
  if (s.step === 5 && s.t > 0) out.push({ ...AREA_SPOT.red, text: '2.5π', size: 6 });
  return out;
}

/** 접점 이름표의 자리 (기준 배율의 화면 단위). 빨간 영역 위쪽 빈 곳으로 단다. */
export const TANGENT_TAG: [number, number] = [52, -58];

/** 넓이를 적는 자리. 빨간 영역 안(사분원 안, 두 반원 밖)의 한 점과 각 반원 안. */
export const AREA_SPOT: Record<keyof typeof AREAS, { u: number; v: number }> = {
  quarter: { u: 3.75, v: 4.05 },
  red: { u: 3.75, v: 4.05 },
  bottom: { u: 3, v: 1.15 },
  hanging: { u: 0.9, v: 3.45 },
};

/** 글자 하나 (판 앞면, 연필로 쓴 듯 잉크색). */
const label = (l: BoardLabel) => tx(MARK_X + 0.02, Y0 - l.u * K, Z0 + l.v * K, l.text, l.size, INK, 700);

/** 치수선: 왼쪽(세로 6)과 아래(가로 6). */
function dimensions(): string {
  const tick = 0.18;
  const du = -1.35;
  let s = line(pts([[du, 0], [du, 6]]), 0.9);
  s += line(pts([[du - tick, 0], [du + tick, 0]]), 0.9) + line(pts([[du - tick, 6], [du + tick, 6]]), 0.9);
  s += line(pts([[0, -0.55], [6, -0.55]]), 0.9);
  s += line(pts([[0, -0.55 - tick], [0, -0.55 + tick]]), 0.9) + line(pts([[6, -0.55 - tick], [6, -0.55 + tick]]), 0.9);
  return s;
}

/** 받침판 위에 선 원기둥의 바닥·윗면 둘레 점 (그림자용). */
const cylPoints = (x: number, y: number, r: number, top: number): Vec3[] =>
  [BASE_H, top].flatMap((z) => ellUV(x, y, r, r, 12).map(([u, v]) => [u, v, z] as Vec3));

/** 꽂힌 핀 하나 (판에서 앞으로 나온 머리). */
const pinAt = (p: Vec3) => cylX(p[0], p[0] + PIN_LEN, p[1], p[2], PIN_R, PIN, tone, 1);

/** 핀 통 위, i 번째 핀이 꽂혀 있는 자리. */
const cupSlot = (i: number): Vec3 => [CUP.x - 1 + i, CUP.y - 1.5 + 1.5 * i, BASE_H + CUP.h + 1];

/** 옮겨 가는 핀: 통에서 판까지 위로 볼록한 길. */
function flyingPin(i: number, k: number): Vec3 {
  const a = cupSlot(i);
  const b = onBoard(PIN_TARGETS[i], FX);
  const e = ease(k);
  return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e + 10 * Math.sin(Math.PI * e)];
}

/** 겨자색 테두리로 고른 조각을 칠한다 (넓이 비교). */
function highlight(s: CorkState): string {
  if (s.step !== 4) return '';
  const outline: Record<string, Vec2[]> = {
    quarter: quarterUV(),
    bottom: [...bottomUV()],
    hanging: [...hangingUV()],
  };
  const stroke = (uv: Vec2[]) =>
    `<path d="${pd(pts(uv, MARK_X + 0.01))}" fill="none" stroke="${HIGHLIGHT}" stroke-width="4.6" stroke-linejoin="round"/>` +
    ink(pd(pts(uv, MARK_X + 0.02)), 1.1);
  if (s.area === 'red') {
    // 빨간 영역의 테두리: 사분원 호, 두 반원 호. 사분원 안쪽으로 자른다.
    return clipTo(pts(quarterUV()), stroke(quarterUV()) + stroke(bottomUV()) + stroke(hangingUV()));
  }
  return stroke(outline[s.area]);
}

/** 장면 전체. */
export function corkScene(s: CorkState): string {
  let out = board(...BASE, BASE_H, 5, BOARD);
  out += clipTo(
    boardTop(...BASE, BASE_H, 5),
    castShadow(
      [FX - 4, FX].flatMap((x) => [FRAME.y0, FRAME.y1].flatMap((y) => [BASE_H, FRAME.z1].map((z) => [x, y, z] as Vec3))),
      BASE_H,
    ) +
      castShadow(cylPoints(CUP.x, CUP.y, CUP.r, BASE_H + CUP.h), BASE_H) +
      castShadow(cylPoints(SPOOL.x, SPOOL.y, SPOOL.r + 0.8, BASE_H + SPOOL.h), BASE_H),
  );

  // 코르크판: 나무 테 → 코르크 면
  out += box(FX - 4, FRAME.y0, BASE_H, FX, FRAME.y1, FRAME.z1, WOOD, tone, 1.2);
  out += shape(on(PX(FX + 0.02), rectUV(CORK.y0, CORK.z0, CORK.y1, CORK.z1)), CORK_MAT.l, 1);

  // 펠트와 종이
  out += shape(pts(quarterUV(), FELT_X), RED, 1.3);
  out += shape(pts(bottomUV(), PAPER_X), PAPER, 1.1);
  out += shape(pts(hangingUV(), PAPER_X), PAPER, 1.1);

  out += dimensions();
  out += highlight(s);

  // 직각 표시 (삼각형 단계)
  if (s.step === 2 || s.step === 3) {
    const k = s.step === 2 ? Math.min(1, s.t / 0.4) : 1;
    if (k >= 1) out += line(pts([[0, 0.42], [0.42, 0.42], [0.42, 0]]), 0.9);
  }

  for (const l of boardLabels(s)) out += label(l);

  // 실: 판 위 (핀 높이)
  const sp = stringPoints(stringProgress(s));
  if (sp.length > 1) out += `<path d="${pd(pts(sp, STRING_X), false)}" fill="none" stroke="${STRING}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  const tangentShown = s.step === 1 && stringProgress(s) >= 1;
  if (tangentShown) {
    // 접점 표시: 실이 지나는 자리의 작은 점
    const [x, y, z] = onBoard(TANGENT, STRING_X + 0.05);
    out += fill(pd(on(PX(x), [[y - 0.9, z], [y, z + 0.9], [y + 0.9, z], [y, z - 0.9]])), HIGHLIGHT) + ink(pd(on(PX(x), [[y - 0.9, z], [y, z + 0.9], [y + 0.9, z], [y, z - 0.9]])), 0.9);
  }

  // 꽂힌 핀
  PIN_TARGETS.forEach((t, i) => {
    if (pinProgress(s, i) >= 1) out += pinAt(onBoard(t, FX));
  });

  // 핀 통 (아직 남은 핀)과 실패
  out += cyl(CUP.x, CUP.y, BASE_H, BASE_H + CUP.h, CUP.r, CERAMIC, tone, 1.2);
  PIN_TARGETS.forEach((_, i) => {
    if (pinProgress(s, i) <= 0) {
      const p = cupSlot(i);
      out += line([[p[0], p[1], BASE_H + CUP.h - 1], p], 0.8) + cylX(p[0] - 0.6, p[0] + 0.6, p[1], p[2], PIN_R, PIN, tone, 0.9);
    }
  });
  out += cyl(SPOOL.x, SPOOL.y, BASE_H, BASE_H + 1, SPOOL.r + 0.8, WOOD, tone, 1);
  out += cyl(SPOOL.x, SPOOL.y, BASE_H + 1, BASE_H + SPOOL.h - 1, SPOOL.r - 0.6, matOf('#5b5650'), tone, 1);
  out += cyl(SPOOL.x, SPOOL.y, BASE_H + SPOOL.h - 1, BASE_H + SPOOL.h, SPOOL.r + 0.8, WOOD, tone, 1);

  // 옮겨 가는 핀
  PIN_TARGETS.forEach((_, i) => {
    const k = pinProgress(s, i);
    if (k > 0 && k < 1) out += pinAt(flyingPin(i, k));
  });
  if (tangentShown) out += tag(onBoard(TANGENT, STRING_X), TANGENT_TAG[0], TANGENT_TAG[1], '접점');

  // 실패에서 실 끝까지 풀려 나오는 실
  if (stringRunning(s) && sp.length) {
    const tip = onBoard(sp[sp.length - 1], STRING_X);
    out += `<path d="${pd([[SPOOL.x, SPOOL.y + SPOOL.r - 0.6, BASE_H + SPOOL.h / 2], tip], false)}" fill="none" stroke="${STRING}" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  return out;
}
