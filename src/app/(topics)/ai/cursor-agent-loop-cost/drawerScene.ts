/*
 * 범위 서랍장 figure 의 장면. 받침판 위에 서랍장이 서 있다.
 *   - 서랍 다섯 칸이 탐색 범위 사다리다. 맨 아래가 짚어 준 파일, 위로 갈수록 넓은 범위다.
 *   - 뒤진 칸의 서랍은 앞으로 열리고 앞판이 밝다. 뒤지지 않은 칸은 닫힌 채 앞판이 흐리다
 *     (본문 panel-a-note: "밝은 칸이 실제로 살펴본 범위입니다. 막대 길이는 그 범위에서 가져온 문맥의 양입니다.").
 *   - 앞판마다 칸 이름, 그 칸이 문맥에 남긴 양의 막대(모든 칸이 같은 자, TIER_CONTEXT_SCALE), "N회 · +양" 을 적는다.
 *     막대 색은 칸마다 다르다 (예전 사다리의 칸 색과 같은 차례: 파랑 · 민트 · 겨자 · 분홍 · 빨강).
 *   - 찾는 것이 있으면: 찾은 칸이 열렸을 때 빨간 카드가 서랍장 옆 받침판에 나와 선다.
 *     못 찾고 끝나면 카드 끝이 "그 폴더" 서랍 틈으로 삐져나와 보인다 (거기 있었는데 열지 않았다).
 * 사람이나 손은 그리지 않는다 (AI 주제: 모델을 사람으로 그리지 않는다).
 *
 * 그리는 순서: 받침판 → 그림자 → 카드 → 서랍장 → 서랍(위 칸부터: 몸통 → 앞판 → 카드 끝) → 글자.
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
  ease,
  labelScale,
  on,
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
import { SCOPE_TIERS, TIER_CONTEXT_SCALE } from './search';
import { TARGET_TIER, cardOut, drawerView, formatTokens, tabShown, type DrawerState } from './drawer';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 50, 188];
/** 서랍장: 앞면 x1, 좌우, 서랍 칸 높이. */
export const CAB = { x0: 6, x1: 28, y0: 42, y1: 178, z0: BASE_H, dh: 17 };
const DRAWER_Z0 = CAB.z0 + 2;
export const CAB_TOP = DRAWER_Z0 + SCOPE_TIERS.length * CAB.dh + 2;
/** 서랍이 열리는 길이. */
export const OPEN_D = 9;
/** 앞판 안의 자리 (u). 막대는 barL 에서 barL - BAR_LEN 까지가 TIER_CONTEXT_SCALE 이다. */
export const FRONT = { labelL: CAB.y1 - 5, barL: CAB.y1 - 52, valueR: CAB.y0 + 4 };
export const BAR_LEN = 36;
/** 찾은 카드: 서랍장 오른쪽 받침판 위. */
export const CARD = { x0: 22, x1: 24, y0: 8, y1: 34, z1: BASE_H + 22 };
/** 위 제목의 높이: 서랍장 윗면의 뒤쪽 모서리보다 위. */
const TITLE_Z = CAB_TOP + (CAB.x1 - CAB.x0) * 0.5 + 4;

export const DRAWER_SIZE: Vec3 = [BASE[2], BASE[3], TITLE_Z + 8];

export const labelSize = (scale = labelScale()) => 3.8 * Math.min(1.25, scale);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

/** 칸마다 막대 색 (예전 사다리: blue-soft · success · accent · warm · danger 의 차례를 엔진 색으로). */
export const TIER_COLOR: Record<(typeof SCOPE_TIERS)[number]['id'], string> = {
  file: PALS.cobalt.l,
  folder: PALS.mint.m,
  repo: PALS.mustard.m,
  git: PALS.blush.m,
  opened: PALS.tomato.m,
};
/** 앞판: 뒤진 칸은 밝게, 뒤지지 않은 칸은 흐리게. */
export const FRONT_COLOR = { searched: CERAMIC.l, idle: BOARD.m } as const;
const TARGET: Mat = PALS.tomato;

/** 칸 i 서랍의 아래·위 (z). */
export function drawerZ(i: number) {
  const lo = DRAWER_Z0 + i * CAB.dh + 0.8;
  return { lo, hi: lo + CAB.dh - 1.6, mid: lo + (CAB.dh - 1.6) / 2 };
}

/** 앞판 글자: 칸 이름과 "N회 · +양" (뒤지지 않은 칸은 "—"). */
export function frontTexts(s: DrawerState, i: number): [string, string] {
  const v = drawerView(s, i);
  return [SCOPE_TIERS[i].label, v.done && v.step ? `${v.step.calls}회 · +${formatTokens(v.step.contextAdded)}` : '—'];
}

/** 카드 판단은 대체 글과 같은 것을 쓴다 (drawer.ts). */
export { cardOut, tabShown };

/** 장면 전체. */
export function drawerScene(s: DrawerState): string {
  const size = labelSize();
  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [CAB.x0, CAB.x1 + OPEN_D].flatMap((x) => [CAB.y0, CAB.y1].flatMap((y) => [BASE_H, CAB_TOP].map((z) => [x, y, z] as Vec3)));
  if (cardOut(s)) corners.push([CARD.x0, CARD.y0, CARD.z1], [CARD.x1, CARD.y1, CARD.z1]);
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));

  // 찾은 카드 (서랍장보다 앞쪽 오른편, 먼저 그려도 서랍장과 겹치지 않는다).
  if (cardOut(s)) out += box(CARD.x0, CARD.y0, BASE_H, CARD.x1, CARD.y1, CARD.z1, TARGET, tone, 1.1);

  // 서랍장.
  out += box(CAB.x0, CAB.y0, CAB.z0, CAB.x1, CAB.y1, CAB_TOP, WOOD, tone, 1.3);

  let text = '';
  const putFront = (x: number, u: number, v: number, str: string, sz: number, color: string = INK, weight = 700) => (text += tx(x + 0.1, u, v - sz * 0.35, str, sz, color, weight));

  // 서랍: 위 칸부터 그린다 (아래 칸이 열리면 그 몸통이 위 칸 앞판의 아랫부분 앞에 온다).
  for (let i = SCOPE_TIERS.length - 1; i >= 0; i--) {
    const v = drawerView(s, i);
    const z = drawerZ(i);
    const slide = OPEN_D * ease(v.open);
    const fx = CAB.x1 + slide;
    // 밖으로 나온 몸통만 그린다 (안쪽은 서랍장에 가려진다).
    if (slide > 0.3) {
      out += box(CAB.x1, CAB.y0 + 4, z.lo + 1, fx - 1.2, CAB.y1 - 4, z.hi - 3, WOOD, tone, 0.9);
      out += shape(on(([u, w]) => [w, u, z.hi - 3 + 0.05], rectUV(CAB.y0 + 6, CAB.x1 + 0.6, CAB.y1 - 6, fx - 1.8)), WOOD.d, 0.5);
    }
    const searched = v.done || v.open > 0;
    out += box(fx - 1.2, CAB.y0 + 2, z.lo, fx, CAB.y1 - 2, z.hi, searched ? CERAMIC : BOARD, tone, 1);
    out += shape(on(PX(fx + 0.02), rectUV(CAB.y0 + 3, z.lo + 1, CAB.y1 - 3, z.hi - 1)), searched ? FRONT_COLOR.searched : FRONT_COLOR.idle, 0.6);
    // 막대 자리와, 뒤진 칸의 막대.
    out += shape(on(PX(fx + 0.05), rectUV(FRONT.barL - BAR_LEN, z.mid - 1.4, FRONT.barL, z.mid + 1.4)), BOARD.l, 0.5);
    if (v.done && v.step) {
      const len = (v.step.contextAdded / TIER_CONTEXT_SCALE) * BAR_LEN;
      out += shape(on(PX(fx + 0.08), rectUV(FRONT.barL - len, z.mid - 1.4, FRONT.barL, z.mid + 1.4)), TIER_COLOR[SCOPE_TIERS[i].id], 0.6);
    }
    // 못 찾고 끝났을 때: 그 폴더 서랍 틈으로 보이는 카드 끝.
    if (i === TARGET_TIER && tabShown(s)) out += box(CAB.x1 - 1.5, CAB.y1 - 34, z.hi - 1, CAB.x1 + 0.2, CAB.y1 - 24, z.hi + 2.6, TARGET, tone, 0.9);

    const [label, value] = frontTexts(s, i);
    putFront(fx, FRONT.labelL - textWidth(label, size) / 2, z.mid, label, size, searched ? INK : palette.muted, searched ? 700 : 400);
    // 값에 '회' 가 섞여 있어 일반 글꼴로 쓴다 (고정폭이면 한글 사이가 벌어진다).
    putFront(fx, FRONT.valueR + textWidth(value, size) / 2, z.mid, value, size, searched ? INK : palette.muted, 400);
  }

  // 제목과 카드 글자.
  text += tx(CAB.x1 + 0.1, (CAB.y0 + CAB.y1) / 2, TITLE_Z, '위로 갈수록 넓은 범위', size, palette.muted, 400);
  if (cardOut(s)) {
    putFront(CARD.x1, (CARD.y0 + CARD.y1) / 2, CARD.z1 - 6, '무료배송', size, INK);
    putFront(CARD.x1, (CARD.y0 + CARD.y1) / 2, CARD.z1 - 6 - size * 1.3, '기준', size, INK);
  }

  return koreanLabels(out + text);
}
