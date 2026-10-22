/*
 * 가림 쪽지 figure 의 장면. 받침판 위에 나무 받침대가 서 있고, 받침대에 원문 한 장이 붙어 있다.
 *
 * 종이의 위 줄은 원문이다. 앞부분이 보이고, 그다음(다음 조각과 나머지)은 노란 쪽지로 가려 두었다. 쪽지는
 * 위쪽 가장자리에 붙어 있어 들어 올리면 앞으로 젖혀진다. 가운데 줄은 "내 예상" 칸, 아래 줄은 후보 스티커 셋이다.
 *
 * 그리는 순서: 받침판 → 그림자 → 받침대 → 종이 → 칸과 빈 자리 → 스티커 → 쪽지 → 글자.
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
import { EXAMPLES, type GoalState } from './guess';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 30, 174];
/** 받침대 앞면 x 와 종이 앞면 x. */
const STAND = { x0: 6, x1: 10, y0: 4, y1: 170, z0: 8, z1: 112 };
const PAGE_X = STAND.x1 + 0.05;
const PAGE = { y0: 8, y1: 166, z0: 12, z1: 108 };

/** 줄 높이: 원문 줄, 예상 칸 줄, 스티커 줄 (가운데 z). */
const ROW = { sentence: 84, guess: 60, stickers: 30 };
const ROW_H = 15;
/** 원문 줄의 칸: 앞부분, 다음 조각, 나머지 (y 는 왼쪽이 크다). */
export const SLOT = { prefix: { yL: 162, yR: 90 }, next: { yL: 87, yR: 56 }, rest: { yL: 53, yR: 14 } };
/** 쪽지: 다음 조각과 나머지를 덮는다. 위쪽 가장자리(경첩)에 붙어 있다. */
const FLAP = { yL: SLOT.next.yL + 2, yR: SLOT.rest.yR - 2, hinge: ROW.sentence + ROW_H / 2 + 2, h: ROW_H + 4 };
/** 후보 스티커 자리 (가운데 y) 와 크기. */
export const STICKER_Y = [134, 96, 58] as const;
const STICKER = { w: 32, h: 13 };

export const GOAL_SIZE: Vec3 = [BASE[2], BASE[3], STAND.z1];

/** 원문 글자 크기 (좁은 화면에서는 키운다). */
export const sentenceSize = (scale = labelScale()) => 6.4 * Math.min(1.25, scale);
/** 작은 글자 (원문 번호, 칸 이름, 스티커). */
export const smallSize = (scale = labelScale()) => 4.6 * Math.min(1.25, scale);
/** 칸 이름의 자리 (가운데 y): "내 예상" 은 예상 칸 왼쪽, "후보" 는 첫 스티커 위. */
/** 견준 결과("원문과 같음/다름")의 가운데 y: 예상 칸 오른쪽. */
export const VERDICT_Y = SLOT.next.yR - 21;
export const LABEL_Y = { guess: 116, stickers: STICKER_Y[0] };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

/** 스티커 하나 (앞면 위의 둥근 네모). */
function sticker(y: number, z: number, color: string): string {
  return shape(on(PX(PAGE_X + 0.4), rectUV(y - STICKER.w / 2, z - STICKER.h / 2, y + STICKER.w / 2, z + STICKER.h / 2)), color, 1);
}

/** 후보 i 의 지금 자리: 고른 것은 예상 칸으로, 직전에 고른 것은 제자리로 돌아온다. */
export function stickerPos(s: GoalState, i: number): { y: number; z: number } {
  const home = { y: STICKER_Y[i], z: ROW.stickers };
  const slot = { y: (SLOT.next.yL + SLOT.next.yR) / 2, z: ROW.guess };
  const t = ease(Math.min(1, s.move));
  if (s.guess === i) return { y: lerp(home.y, slot.y, t), z: lerp(home.z, slot.z, t) };
  if (s.prevGuess === i) return { y: lerp(slot.y, home.y, t), z: lerp(slot.z, home.z, t) };
  return home;
}

/** 쪽지의 네 꼭짓점: 위쪽 경첩을 축으로 앞으로 젖혀진다 (닫히면 아래로 늘어진다). */
export function flapCorners(open: number): Vec3[] {
  const a = ease(open) * (165 * Math.PI) / 180;
  const dx = FLAP.h * Math.sin(a);
  const dz = -FLAP.h * Math.cos(a);
  const x = PAGE_X + 0.6;
  return [
    [x, FLAP.yL, FLAP.hinge],
    [x, FLAP.yR, FLAP.hinge],
    [x + dx, FLAP.yR, FLAP.hinge + dz],
    [x + dx, FLAP.yL, FLAP.hinge + dz],
  ];
}

/** 쪽지가 원문을 가리고 있는가 (가린 글자는 글자 층에 그리지 않는다 — 글자 층은 그림 위에 얹히므로). */
export const flapCovers = (open: number) => open < 0.5;

/** 장면 전체. */
export function guessScene(s: GoalState): string {
  const ex = EXAMPLES[s.example];
  const size = sentenceSize();
  const small = smallSize();

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [STAND.x0, STAND.x1].flatMap((x) => [STAND.y0, STAND.y1].flatMap((y) => [BASE_H, STAND.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));
  // 받침대: 다리 둘과 판.
  out += box(STAND.x0, STAND.y0 + 6, BASE_H, STAND.x1 + 6, STAND.y0 + 12, STAND.z0, WOOD, tone, 1);
  out += box(STAND.x0, STAND.y1 - 12, BASE_H, STAND.x1 + 6, STAND.y1 - 6, STAND.z0, WOOD, tone, 1);
  out += box(STAND.x0, STAND.y0, STAND.z0, STAND.x1, STAND.y1, STAND.z1, WOOD, tone, 1.2);
  out += shape(on(PX(PAGE_X), rectUV(PAGE.y0, PAGE.z0, PAGE.y1, PAGE.z1)), CERAMIC.l, 1.1);

  // 예상 칸과 후보의 빈 자리 (점선).
  const dashed = (yL: number, yR: number, z: number, h: number) =>
    `<path d="${pd(on(PX(PAGE_X + 0.2), rectUV(yR, z - h / 2, yL, z + h / 2)))}" fill="none" stroke="${INK}" stroke-width=".8" stroke-dasharray="2 1.6" stroke-opacity=".7"/>`;
  out += dashed(SLOT.next.yL, SLOT.next.yR, ROW.guess, STICKER.h + 2);
  STICKER_Y.forEach((y) => (out += dashed(y + STICKER.w / 2, y - STICKER.w / 2, ROW.stickers, STICKER.h)));

  let text = '';
  const page = (y: number, z: number, str: string, sz: number, color: string = INK, weight = 700) => (text += tx(PAGE_X + 0.05, y, z - sz * 0.35, str, sz, color, weight));
  page(PAGE.y1 - 16, PAGE.z1 - 7, `원문 ${s.example + 1}/${EXAMPLES.length}`, small, palette.muted, 400);
  page((SLOT.prefix.yL + SLOT.prefix.yR) / 2, ROW.sentence, ex.prefix, size);
  page(LABEL_Y.guess, ROW.guess, '내 예상', small, palette.muted, 400);
  page(LABEL_Y.stickers, ROW.stickers + STICKER.h / 2 + 4, '후보', small, palette.muted, 400);

  // 스티커: 고르지 않은 것 → 고른 것 순서로 (옮겨 가는 것이 위에).
  const order = [0, 1, 2].sort((a, b) => Number(a === s.guess || a === s.prevGuess) - Number(b === s.guess || b === s.prevGuess));
  for (const i of order) {
    const p = stickerPos(s, i);
    out += sticker(p.y, p.z, i === s.guess ? PALS.mint.l : PALS.blush.l);
    page(p.y, p.z, ex.choices[i], small * 1.15);
  }

  // 쪽지 아래의 원문: 쪽지가 걷혔을 때만 글자를 쓴다.
  if (!flapCovers(s.flap)) {
    page((SLOT.next.yL + SLOT.next.yR) / 2, ROW.sentence, ex.next, size);
    page((SLOT.rest.yL + SLOT.rest.yR) / 2, ROW.sentence, ex.rest, size);
    if (s.revealed && s.guess !== null && s.move >= 1) {
      const same = ex.choices[s.guess] === ex.next;
      // 맞고 틀림의 색을 쓰지 않는다: 원문과 다른 예상도 세상에서 틀린 말은 아니다(본문 "정답은 데이터의 다음 조각").
      page(VERDICT_Y, ROW.guess, same ? '원문과 같음' : '원문과 다름', small, INK, 700);
    }
  }
  // 쪽지: 닫혀 있으면 "다음 조각" 이라고 적혀 있다.
  const flap = flapCorners(s.flap);
  out += fill(pd(flap), PALS.mustard.l) + `<path d="${pd(flap)}" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>`;
  if (s.flap < 0.05) page((FLAP.yL + FLAP.yR) / 2, FLAP.hinge - FLAP.h / 2, '다음 조각은?', small * 1.15);

  return koreanLabels(out + text);
}
