/*
 * 양면 예시판 figure 의 장면. 받침판 위에 나무 틀이 서 있다.
 *   - 틀 위쪽 가로대에 질문판이 고정되어 있다 (질문 두 줄).
 *   - 그 아래 금속 굴대에 양면 예시판이 끼워져 있다. 한 면은 이어쓰기 예시, 다른 면은 지시를 따르는 예시다.
 *     면에는 제목, 첫 문장, 내용의 짜임(문단인지 번호 목록인지), 본문이 살펴보라고 한 두 가지를 적는다.
 *   - 버튼을 누르면 판이 굴대를 축으로 반 바퀴 돈다. 도는 동안에는 글자를 쓰지 않는다 (글자 층은 그림 위에 얹힌다).
 * 어느 면에도 점수·별점·정답 표시를 하지 않는다 (본문: 사람이 선호한 답이 곧 사실인 것은 아니다).
 *
 * 그리는 순서: 받침판 → 그림자 → 틀 → 질문판 → 굴대 → 예시판 → 글자.
 */
import {
  BOARD,
  CERAMIC,
  INK,
  METAL,
  WOOD,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  cyl,
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
import { palette } from '@/styles/palette';
import { SHEET_NOTES, SHEET_TITLE, type Mode, type SignState } from './sign';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 44, 172];
/** 틀: 기둥 둘과 가로대. 앞면 x = FRAME.x1. */
const FRAME = { x0: 14, x1: 20, y0: 6, y1: 166, post: 5, barZ0: 102, z1: 134 };
const FACE = FRAME.x1 + 0.05;
/** 질문판 (가로대 앞면). */
export const QUESTION = { u0: 16, u1: 156, v0: 105, v1: 131 };
/** 굴대: 가운데 y, 앞뒤 가운데 x. */
const AXIS = { x: (FRAME.x0 + FRAME.x1) / 2, y: 86 };
/** 예시판: 굴대에서 좌우 반폭, 높이. */
export const SIGN = { half: 60, v0: 12, v1: 94 };
/** 면 아래 두 줄(살펴볼 것)과 위 내용 사이의 가는 선 높이. */
export const NOTE_LINE = SIGN.v0 + 21;
const SIGN_X = AXIS.x + 0.8;

export const SIGN_SIZE: Vec3 = [BASE[2], BASE[3], FRAME.z1];

export const labelSize = (scale = labelScale()) => 4.6 * Math.min(1.4, scale);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

/** 질문 두 줄 (Lesson 의 질문 그대로). */
export const QUESTION_LINES: [string, string] = ['내일 발표가 있는데 너무 떨려.', '준비할 일을 세 가지로 알려줘.'];

/** 면에 적는 첫 문장과 내용의 짜임 (예시 본문에서 가져온다). */
export const SHEET_BODY: Record<Mode, { first: string; items: string[] }> = {
  continuation: { first: '지수는 친구에게 메시지를 보냈다.', items: [] },
  assistant: { first: '발표 전에는 긴장될 수 있어요.', items: ['핵심을 한 문장으로 적기', '시간을 재며 소리 내어 연습', '파일과 장비 확인'] },
};

/** 번호 목록 i 번째 줄의 높이. */
export const itemV = (i: number, small: number) => SIGN.v1 - 30 - i * (small * 1.45);

const ease = (t: number) => t * t * (3 - 2 * t);

/** 예시판이 굴대에서 돈 각도 (도). 0 이면 돌기 전 면이 앞, 180 이면 새 면이 앞. */
export const signAngle = (s: SignState) => (s.flip >= 1 ? 0 : ease(s.flip) * 180);

/** 각도 a 에서 예시판 한 점(앞면 기준 u, v)의 자리. 굴대를 축으로 돈다. */
function signPoint(u: number, v: number, a: number): Vec3 {
  const r = (a * Math.PI) / 180;
  const d = u - AXIS.y;
  return [SIGN_X + d * Math.sin(r) * 0.55, AXIS.y + d * Math.cos(r), v];
}

/** 지금 앞을 보는 면. */
export const facing = (s: SignState): Mode => (s.flip >= 1 || signAngle(s) > 90 ? s.mode : s.prev);

/** 장면 전체. */
export function signScene(s: SignState): string {
  const size = labelSize();
  const small = size * 0.85;

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [FRAME.x0, FRAME.x1].flatMap((x) => [FRAME.y0, FRAME.y1].flatMap((y) => [BASE_H, FRAME.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));

  // 틀: 받침 둘, 기둥 둘, 가로대.
  for (const y of [FRAME.y0, FRAME.y1 - FRAME.post]) {
    out += box(FRAME.x0 - 4, y, BASE_H, FRAME.x1 + 4, y + FRAME.post, BASE_H + 4, WOOD, tone, 1);
    out += box(FRAME.x0, y, BASE_H + 4, FRAME.x1, y + FRAME.post, FRAME.barZ0, WOOD, tone, 1.1);
  }
  out += box(FRAME.x0, FRAME.y0, FRAME.barZ0, FRAME.x1, FRAME.y1, FRAME.z1, WOOD, tone, 1.2);
  out += shape(on(PX(FACE), rectUV(QUESTION.u0, QUESTION.v0, QUESTION.u1, QUESTION.v1)), CERAMIC.l, 1);

  // 굴대: 받침에서 가로대까지.
  out += cyl(AXIS.x, AXIS.y, BASE_H, FRAME.barZ0, 1.3, METAL, tone, 0.9, 12);

  // 예시판: 돌기 전에는 앞면 그대로, 도는 동안에는 굴대를 축으로 좁아졌다 넓어진다.
  const a = signAngle(s);
  const quad = [signPoint(AXIS.y + SIGN.half, SIGN.v0, a), signPoint(AXIS.y - SIGN.half, SIGN.v0, a), signPoint(AXIS.y - SIGN.half, SIGN.v1, a), signPoint(AXIS.y + SIGN.half, SIGN.v1, a)];
  out += fill(pd(quad), CERAMIC.l) + `<path d="${pd(quad)}" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
  // 판 위아래의 굴대 고리.
  for (const v of [SIGN.v0 - 3, SIGN.v1 + 3]) out += box(AXIS.x - 2, AXIS.y - 2, v - 1.5, AXIS.x + 2.6, AXIS.y + 2, v + 1.5, METAL, tone, 0.8);

  let text = '';
  const put = (x: number, u: number, v: number, str: string, sz: number, color: string = INK, weight = 700) => (text += tx(x, u, v - sz * 0.35, str, sz, color, weight));
  const qMid = (QUESTION.v0 + QUESTION.v1) / 2;
  put(FACE + 0.1, (QUESTION.u0 + QUESTION.u1) / 2, qMid + size * 0.65, QUESTION_LINES[0], size);
  put(FACE + 0.1, (QUESTION.u0 + QUESTION.u1) / 2, qMid - size * 0.65, QUESTION_LINES[1], size);

  // 다 돈 뒤에만 면의 내용을 쓴다.
  if (s.flip >= 1) {
    const m = facing(s);
    const fx = SIGN_X + 0.1;
    const left = AXIS.y + SIGN.half - 6;
    const right = AXIS.y - SIGN.half + 6;
    const row = (v: number, str: string, sz: number, color: string = INK, weight = 700) => put(fx, left - textWidth(str, sz) / 2, v, str, sz, color, weight);
    const mid = (left + right) / 2;
    put(fx, mid, SIGN.v1 - 9, SHEET_TITLE[m], size * 1.05);
    row(SIGN.v1 - 21, SHEET_BODY[m].first, small);
    const items = SHEET_BODY[m].items;
    if (items.length) {
      items.forEach((it, i) => {
        const v = itemV(i, small);
        row(v, `${i + 1}. ${it}`, small);
      });
    } else {
      // 문단: 이야기가 이어지는 줄 (글자 대신 줄).
      for (let i = 0; i < 3; i++) {
        const v = SIGN.v1 - 31 - i * (small * 1.55);
        const len = [0.92, 0.8, 0.55][i] * (left - right);
        out += line(on(PX(fx), [[left, v], [left - len, v]]), 1.6);
      }
    }
    // 아래: 본문이 살펴보라고 한 두 가지. 점수나 정답 표시는 하지 않는다.
    out += line(on(PX(fx), [[left, NOTE_LINE], [right, NOTE_LINE]]), 0.7);
    const [n1, n2] = SHEET_NOTES[m];
    row(SIGN.v0 + 16, n1, small, palette.muted, 400);
    row(SIGN.v0 + 7, n2, small, palette.muted, 400);
  }

  return koreanLabels(out + text);
}
