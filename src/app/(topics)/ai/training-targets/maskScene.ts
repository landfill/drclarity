/*
 * 가림 상자 figure 의 장면. 받침판 위의 나무 레일에 원문 조각이 블록으로 서 있고, 파란 가림 상자가
 * 정답 자리부터 끝까지를 덮는다. 상자 왼쪽 위에는 깃발이 서서 비교할 정답을 적는다.
 * 레일 앞면에는 상자 밖의 블록(입력) 아래에 괄호와 "입력 N개" 를 적는다.
 *
 * 그리는 순서: 받침판 → 그림자 → 레일 → 블록 → 가림 상자 → 깃발 → 글자.
 * 상자 안의 블록 글자는 쓰지 않는다 (글자 층은 그림 위에 얹히므로 상자 위로 비쳐 보인다).
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
import { PIECES } from './pairs';
import type { MaskState } from './mask';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 40, 168];
/** 레일: 앞면 x = RAIL.x1, 윗면 z = RAIL.z1. */
const RAIL = { x0: 10, x1: 30, y0: 4, y1: 164, z1: 14 };
/** 블록: 두께(x), 높이(z), 사이 틈. 폭은 글자에 맞춘다. */
const BLOCK = { x0: 14, x1: 26, h: 18, gap: 3 };
/** 첫 블록의 왼쪽 끝 y. */
const Y0 = RAIL.y1 - 8;
/** 가림 상자: 블록보다 조금 크다. */
/** pad: 상자의 뒤쪽 왼쪽 끝을 정답 블록 왼쪽 끝보다 조금 안쪽에 둔다. 상자 앞면은 시점 때문에 왼쪽으로 비켜 보이므로, 그래야 앞면 끝이 블록 사이 틈에 온다. */
const COVER = { pad: -2, x0: BLOCK.x0 - 2.5, x1: BLOCK.x1 + 2.5, z1: RAIL.z1 + BLOCK.h + 3, yEnd: RAIL.y0 + 2 };
/** 깃발: 상자 왼쪽 위에 선 막대와 판. */
const FLAG = { post: 12, w: 46, h: 22 };

export const MASK_SIZE: Vec3 = [BASE[2], BASE[3], COVER.z1 + FLAG.post + FLAG.h + 2];

/** 블록 글자 크기 (좁은 화면에서는 키운다). 블록 폭은 기본 크기의 글자에 맞춘다. */
const PIECE_SIZE = 6;
export const pieceSize = (scale = labelScale()) => PIECE_SIZE * Math.min(1.3, scale);
export const smallSize = (scale = labelScale()) => 4.4 * Math.min(1.3, scale);

export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

/** 블록마다 왼쪽·오른쪽 끝 y. 가장 큰 글자(좁은 화면)도 들어가도록 폭을 잡는다. */
export const BLOCKS = (() => {
  let y = Y0;
  return PIECES.map((p) => {
    const w = Math.max(16, textWidth(p, PIECE_SIZE * 1.3) + 5);
    const b = { yL: y, yR: y - w };
    y -= w + BLOCK.gap;
    return b;
  });
})();

/** 상자가 덮기 시작하는 왼쪽 끝 y (shown 이 소수면 두 블록 사이를 잇는다). */
export function coverLeft(shown: number): number {
  const i = Math.floor(shown);
  const t = shown - i;
  const at = (k: number) => (k >= BLOCKS.length ? BLOCKS[BLOCKS.length - 1].yR : BLOCKS[k].yL) + COVER.pad;
  return at(i) + (at(Math.min(i + 1, BLOCKS.length)) - at(i)) * t;
}

/** 블록 i 가 상자에 덮였는가 (상자 왼쪽 끝이 블록 오른쪽 끝을 넘어서면 조금이라도 덮인 것으로 본다). */
export const isCovered = (i: number, shown: number) => coverLeft(shown) > BLOCKS[i].yR + 1;

/** 장면 전체. */
export function maskScene(s: MaskState): string {
  const size = pieceSize();
  const small = smallSize();
  const cl = coverLeft(s.shown);

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [RAIL.x0, RAIL.x1].flatMap((x) => [RAIL.y0, RAIL.y1].flatMap((y) => [BASE_H, COVER.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));
  out += box(RAIL.x0, RAIL.y0, BASE_H, RAIL.x1, RAIL.y1, RAIL.z1, WOOD, tone, 1.2);

  let text = '';
  BLOCKS.forEach((b, i) => {
    out += box(BLOCK.x0, b.yR, RAIL.z1, BLOCK.x1, b.yL, RAIL.z1 + BLOCK.h, CERAMIC, tone, 1);
    if (!isCovered(i, s.shown)) text += tx(BLOCK.x1 + 0.05, (b.yL + b.yR) / 2, RAIL.z1 + BLOCK.h / 2 - size * 0.35, PIECES[i], size, INK);
  });

  // 레일 앞면: 입력(상자 밖 블록) 아래의 괄호와 이름.
  const visible = BLOCKS.filter((_, i) => !isCovered(i, s.shown));
  if (visible.length) {
    const yL = visible[0].yL;
    const yR = visible[visible.length - 1].yR;
    const z = RAIL.z1 - 2.5;
    out += line([[RAIL.x1 + 0.05, yL, z + 1.5], [RAIL.x1 + 0.05, yL, z], [RAIL.x1 + 0.05, yR, z], [RAIL.x1 + 0.05, yR, z + 1.5]], 1);
    text += tx(RAIL.x1 + 0.1, (yL + yR) / 2, z - 2.2 - small * 0.85, `입력 ${visible.length}개`, small, INK);
  }

  // 가림 상자: 정답 자리부터 레일 끝까지.
  out += box(COVER.x0, COVER.yEnd, RAIL.z1, COVER.x1, cl, COVER.z1, PALS.cobalt, tone, 1.3);
  // 깃발: 상자 왼쪽 위. 비교할 정답(덮인 첫 블록)을 적는다.
  const target = PIECES[Math.round(s.shown)];
  const fy = cl - FLAG.w / 2 - 1;
  const fx = COVER.x1 - 1;
  out += line([[fx, cl - 3, COVER.z1], [fx, cl - 3, COVER.z1 + FLAG.post + FLAG.h]], 1.6);
  out += shape(on(PX(fx + 0.2), rectUV(fy - FLAG.w / 2, COVER.z1 + FLAG.post, fy + FLAG.w / 2, COVER.z1 + FLAG.post + FLAG.h)), PALS.mustard.l, 1.1);
  if (s.shown === Math.round(s.shown)) {
    text += tx(fx + 0.3, fy, COVER.z1 + FLAG.post + FLAG.h - 3 - small * 0.85, '비교할 정답', small, INK, 400);
    text += tx(fx + 0.3, fy, COVER.z1 + FLAG.post + 3.5, target, size, INK);
  }

  return koreanLabels(out + text);
}
