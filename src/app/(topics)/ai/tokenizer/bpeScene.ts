/*
 * 바이트 타일과 규칙표 figure 의 장면.
 *
 * 받침판 뒤쪽 왼편에 규칙표를 끼운 판이 서 있고, 그 앞의 긴 선반 위에 바이트 타일이 한 줄로 선다.
 * 타일 하나가 바이트 하나다. 합쳐진 타일들은 한 받침에 함께 올라 붙어 서고, 받침 하나가 지금의 묶음 하나다.
 * 묶음이 글자로 읽히면 그 위에 글자를 적는다. 끝까지 묶은 뒤의 받침 하나가 토큰 하나다.
 *
 * 그리는 순서: 받침판 → 그림자 → 규칙표 판 → 선반 → 묶음 받침 → 타일 → 글자.
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
  on,
  PX,
  rectUV,
  shape,
  tone,
  tx,
  type Vec3,
} from '@/lib/colorfigures/core';
import { koreanLabels } from '@/lib/colorfigures/fonts';
import { MONO_FONT } from '@/styles/palette';
import { RULE_COUNT, byteLabel, lastRule, pieceText, planFor, tokensAt, type BpeState } from './bpe';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 40, 182];
/** 규칙표 판: 선반 뒤에 선다. 앞면 x = RX. 아래쪽은 선반과 타일에 가리므로 글자는 위쪽에 쓴다. */
const RX = 8;
const RULES = { y0: 116, y1: 176, z1: 100 };
/** 선반: 앞면 x = SX, 윗면 z = SZ. */
const SX = 30;
const SZ = 20;
const SHELF = { x0: 12, y0: 4, y1: 176 };
/** 타일: 폭(y), 높이(z), 두께(x). 묶음 안 타일 사이와 묶음 사이 틈. */
export const TILE = { w: 11, h: 16, d: 6 };
const GAP_IN = 0.8;
const GAP_OUT = 3.5;
/** 첫 타일의 왼쪽 끝 y. */
const Y0 = SHELF.y1 - 4;
/** 받침: 타일 아래의 얇은 판. */
const HOLDER_H = 2.2;

export const BPE_SIZE: Vec3 = [BASE[2], BASE[3], RULES.z1];

/** 묶음 받침 색: 둘 이상 묶인 것은 차례대로 돌려 쓰고, 혼자인 바이트는 흰 받침. */
const GROUP_COLORS = [PALS.mustard, PALS.mint, PALS.cobalt, PALS.blush];

const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);

/** 묶음들의 자리: 묶음마다 왼쪽·오른쪽 끝 y. 합치는 중인 경계(at)의 틈은 frac 만큼 좁힌다. */
export function groupSpans(sizes: readonly number[], at = -1, frac = 0): { yL: number; yR: number }[] {
  const spans: { yL: number; yR: number }[] = [];
  let y = Y0;
  sizes.forEach((n, i) => {
    if (i > 0) y -= i === at + 1 ? GAP_OUT + (GAP_IN - GAP_OUT) * frac : GAP_OUT;
    const w = n * TILE.w + (n - 1) * GAP_IN;
    spans.push({ yL: y, yR: y - w });
    y -= w;
  });
  return spans;
}

/** 묶음 위 글자의 크기 (좁은 화면에서는 키운다). */
export const groupLabelSize = (scale = labelScale()) => 6 * Math.min(1.6, scale);
/** 타일 글자의 크기: 16진수 두 글자가 타일 폭 안에 든다. */
export const tileLabelSize = (scale = labelScale()) => Math.min((TILE.w - 0.8) / 1.32, 4.6 * scale);

/** 묶음 이름의 밑줄 높이. */
const GROUP_LABEL_Z = SZ + HOLDER_H + TILE.h + 6;
/** 묶음 이름의 위 끝 높이 (글자 크기의 0.85 배까지 올라온다). */
export const groupLabelTop = (scale: number) => GROUP_LABEL_Z + 0.85 * groupLabelSize(scale);
/** 규칙표 종이의 아래 끝. 그 아래는 선반과 타일에 가린다. */
const PAPER_Z0 = 50;
const paperScale = (scale = labelScale()) => Math.min(1.5, scale);
/** 규칙표 종이 글자의 가장 낮은 밑줄과 아래 끝 (마지막 줄: 방금 쓴 규칙). */
export const paperTextBottom = (scale: number) => RULES.z1 - 5 - 7 - 20 * paperScale(scale) - 0.25 * 4.2 * paperScale(scale);

/** 규칙표 종이의 폭 (y). */
export const PAPER_W = RULES.y1 - RULES.y0 - 8;
/** 방금 쓴 규칙의 글자 크기: 종이 폭 안에 든다. */
export const ruleTextSize = (text: string, scale: number) => Math.min(4.2 * scale, (PAPER_W - 6) / ([...text].length * 0.66));

/** 장면 전체. */
export function bpeScene(state: BpeState): string {
  const plan = planFor(state.text);
  const k = Math.floor(state.step);
  const frac = state.running ? state.step - k : 0;
  const groups = tokensAt(plan, k);
  // 지금 합치는 중인 쌍: 다음 단계의 at.
  const merging = state.running && k < plan.steps.length ? plan.steps[k].at : -1;
  const spans = groupSpans(
    groups.map((g) => g.length),
    merging,
    frac,
  );

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners = (x0: number, x1: number, y0: number, y1: number, z1: number): Vec3[] =>
    [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [BASE_H, z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(
    boardTop(...BASE, BASE_H, 5),
    castShadow(corners(RX - 4, RX, RULES.y0, RULES.y1, RULES.z1), BASE_H) + castShadow(corners(SHELF.x0, SX, SHELF.y0, SHELF.y1, SZ), BASE_H),
  );

  // 규칙표 판: 나무 판에 끼운 종이. 줄은 규칙들 (읽을 수 있게 적지는 않는다).
  out += box(RX - 4, RULES.y0, BASE_H, RX, RULES.y1, RULES.z1, WOOD, tone, 1.2);
  const paper = { y0: RULES.y0 + 4, y1: RULES.y1 - 4, z0: PAPER_Z0, z1: RULES.z1 - 5 };
  out += shape(on(PX(RX + 0.05), rectUV(paper.y0, paper.z0, paper.y1, paper.z1)), CERAMIC.l, 1);
  let text = '';
  const s = paperScale();
  const cy = (paper.y0 + paper.y1) / 2;
  text += tx(RX + 0.1, cy, paper.z1 - 7, '규칙표', 5 * s, INK);
  text += tx(RX + 0.1, cy, paper.z1 - 7 - 6 * s, `고정 · 규칙 ${RULE_COUNT}개`, 3.4 * s, INK, 400);
  const rule = lastRule(plan, state.running ? k : state.step);
  text += tx(RX + 0.1, cy, paper.z1 - 7 - 13 * s, rule ? `방금 쓴 규칙 ${rule.number}번` : plan.clipped ? '긴 글: 끝 모습만' : '아직 쓴 규칙 없음', 3.4 * s, INK, 400);
  if (rule) text += tx(RX + 0.1, cy, paper.z1 - 7 - 20 * s, rule.text, ruleTextSize(rule.text, s), INK);

  // 선반.
  out += box(SHELF.x0, SHELF.y0, BASE_H, SX, SHELF.y1, SZ, WOOD, tone, 1.2);

  // 묶음과 타일. 받침은 타일 아래, 타일은 받침 위에 선다.
  const tx0 = SX - TILE.d - 1;
  const tileSize = tileLabelSize();
  const groupSize = groupLabelSize();
  let colorIndex = 0;
  groups.forEach((g, i) => {
    const { yL, yR } = spans[i];
    const color = g.length > 1 ? GROUP_COLORS[colorIndex++ % GROUP_COLORS.length] : CERAMIC;
    out += box(tx0 - 0.6, yR - 0.6, SZ, SX - 0.4, yL + 0.6, SZ + HOLDER_H, color, tone, 1);
    g.forEach((byte, j) => {
      const ty = yL - j * (TILE.w + GAP_IN);
      out += box(tx0, ty - TILE.w, SZ + HOLDER_H, tx0 + TILE.d, ty, SZ + HOLDER_H + TILE.h, CERAMIC, tone, 0.9);
      const label = byteLabel(byte);
      const t = tx(tx0 + TILE.d + 0.05, ty - TILE.w / 2, SZ + HOLDER_H + TILE.h / 2 - tileSize * 0.35, label, tileSize, INK, label.length > 1 ? 400 : 700);
      text += mono(t);
    });
    // 둘 이상 묶여 글자로 읽히면 그 위에 적는다.
    const read = g.length > 1 ? pieceText(g) : null;
    if (read) text += tx(tx0 + TILE.d + 0.05, (yL + yR) / 2, GROUP_LABEL_Z, read, groupSize, INK);
  });

  return koreanLabels(out + text);
}
