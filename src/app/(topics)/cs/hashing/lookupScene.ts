/*
 * 유출된 저장소와 미리 만든 표 figure 의 장면. 받침판 위 왼쪽에 유출된 저장소 사본(종이 한 장), 오른쪽에 공격자의 표(세운 장부)가 있다.
 *   - 저장소: 사용자 · (소금을 켜면) 소금 · 저장된 값(앞 12자). 비밀번호 칸은 없다. 소금은 비밀이 아니라 그대로 적혀 있다.
 *   - 표: 흔한 비밀번호 10개와, 소금 없이 미리 계산한 해시(앞 8자).
 *   - 금속 자가 표를 한 줄씩 내려간다. 자가 지난 줄의 해시가 저장소의 값과 같으면 그 줄을 칠하고, 저장소의 그 사람 줄과 실로 잇는다.
 *     표에서 "찾는" 것이지 저장된 값을 되돌리는 것이 아니다. 자물쇠 · 열쇠 · 분쇄기 · 섞는 기계는 그리지 않는다
 *     (본문: 해시는 암호화가 아니다).
 *
 * 그리는 순서: 받침판 → 그림자 → 받침대 → 종이 · 장부 → 칠한 줄 → 자 → 실 → 글자.
 */
import {
  BOARD,
  CERAMIC,
  INK,
  METAL,
  PALS,
  WOOD,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
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
import { MONO_FONT, palette } from '@/styles/palette';
import { TABLE, isDone, matchesAt, storedRows, type LookupState } from './lookup';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 46, 212];
/** 앞면 x. 종이와 장부가 같은 면에 선다. */
const FACE_X = 30;
/** 유출된 저장소 종이 (u = y, v = z). */
export const SHEET = { u0: 124, u1: 206, v0: BASE_H + 12, v1: BASE_H + 62 };
/** 공격자의 장부. */
export const BOOK = { u0: 8, u1: 116, v0: BASE_H + 6, v1: BASE_H + 104 };
const BOOK_HEAD = 15;
/** 표 한 줄의 높이. */
export const ROW_H = (BOOK.v1 - BOOK.v0 - BOOK_HEAD - 4) / TABLE.length;
/** 저장소 줄. */
const SHEET_HEAD = 18;
export const SHEET_ROW_H = 10;

export const LOOKUP_SIZE: Vec3 = [BASE[2], BASE[3], BOOK.v1 + 4];

export const labelSize = (scale = labelScale()) => 3.6 * Math.min(1.3, scale);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);
const face = (uv: [number, number][], dx = 0): Vec3[] => on(PX(FACE_X + dx), uv);

/** 장부의 줄 i 의 가운데 높이. */
export const bookRowMid = (i: number) => BOOK.v1 - BOOK_HEAD - (i + 0.5) * ROW_H;
/** 줄 i 를 대조할 때 자가 놓이는 높이: 그 줄의 아래 경계. */
export const rulerV = (i: number) => bookRowMid(i) - ROW_H / 2;
/** 저장소 줄 j 의 가운데 높이. */
export const sheetRowMid = (j: number) => SHEET.v1 - SHEET_HEAD - (j + 0.5) * SHEET_ROW_H;

/** 저장소 종이의 칸 (u 의 가운데). 소금을 켜면 소금 칸이 생긴다. */
export function sheetColumns(salted: boolean) {
  return salted ? { name: SHEET.u1 - 9, salt: SHEET.u1 - 24, hash: SHEET.u0 + 23 } : { name: SHEET.u1 - 12, salt: null, hash: SHEET.u0 + 28 };
}
/** 장부의 칸. */
/** 장부의 칸: 해시를 저장소 쪽(왼쪽)에 두어, 같은 값을 잇는 실이 짧고 곧게 걸린다. */
export const BOOK_COLS = { hash: BOOK.u1 - 26, password: BOOK.u0 + 26 } as const;

/** 실의 두 끝: 저장소 줄의 저장된 값 오른쪽 끝 → 장부 줄의 해시 왼쪽 끝. 같은 값끼리 잇는다. */
export function threadEnds(salted: boolean, i: number, j: number, size = labelSize()): [[number, number], [number, number]] {
  const hashW = textWidth('0123456789ab…', size);
  const bookW = textWidth('0123abcd…', size);
  return [
    [sheetColumns(salted).hash - hashW / 2 - 1, sheetRowMid(j)],
    [BOOK_COLS.hash + bookW / 2 + 1, bookRowMid(i)],
  ];
}

/** 장면 전체. */
export function lookupScene(s: LookupState): string {
  const size = labelSize();
  const small = size * 0.85;
  const rows = storedRows(s.salted);

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [FACE_X - 6, FACE_X + 1].flatMap((x) =>
    [BOOK.u0, SHEET.u1].flatMap((y) => [BASE_H, BOOK.v1].map((z) => [x, y, z] as Vec3)),
  );
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));

  // 받침대: 종이와 장부를 세우는 나무 틀.
  out += box(FACE_X - 6, SHEET.u0 + 6, BASE_H, FACE_X - 1, SHEET.u1 - 6, SHEET.v0, WOOD, tone, 1);
  out += box(FACE_X - 6, BOOK.u0 + 4, BASE_H, FACE_X - 1, BOOK.u1 - 4, BOOK.v0 + 2, WOOD, tone, 1);
  // 종이와 장부.
  out += box(FACE_X - 1, SHEET.u0, SHEET.v0, FACE_X, SHEET.u1, SHEET.v1, CERAMIC, tone, 1.1);
  out += box(FACE_X - 3, BOOK.u0, BOOK.v0, FACE_X, BOOK.u1, BOOK.v1, WOOD, tone, 1.2);
  out += shape(face(rectUV(BOOK.u0 + 2, BOOK.v0 + 2, BOOK.u1 - 2, BOOK.v1 - 2), 0.02), CERAMIC.l, 0.8);

  // 걸린 줄: 칠한다.
  const hitRows = TABLE.map((_, i) => matchesAt(s, i)).map((m) => (m?.length ?? 0) > 0);
  hitRows.forEach((hit, i) => {
    if (!hit) return;
    const mid = bookRowMid(i);
    out += shape(face(rectUV(BOOK.u0 + 3, mid - ROW_H / 2 + 0.4, BOOK.u1 - 3, mid + ROW_H / 2 - 0.4), 0.05), PALS.mustard.l, 0.5);
  });
  // 줄 사이의 가는 선.
  for (let i = 1; i < TABLE.length; i++) {
    const v = bookRowMid(i) + ROW_H / 2;
    out += `<path d="${pd(face([[BOOK.u0 + 4, v], [BOOK.u1 - 4, v]], 0.06), false)}" fill="none" stroke="${CERAMIC.d}" stroke-width=".5"/>`;
  }

  // 자: 지금 대조하는 줄 바로 아래 줄 경계에 댄다 (줄의 글자를 가리지 않게 줄 사이로만 옮긴다).
  if (s.started && !isDone(s)) {
    const v = rulerV(s.scanned);
    out += box(FACE_X + 0.2, BOOK.u0 + 1, v - 1.2, FACE_X + 1.6, BOOK.u1 - 1, v + 0.6, METAL, tone, 0.9);
  }

  // 실: 걸린 줄 → 저장소의 그 사람 줄.
  hitRows.forEach((hit, i) => {
    if (!hit) return;
    for (const id of matchesAt(s, i)!) {
      const j = rows.findIndex((r) => r.id === id);
      const [a, b] = threadEnds(s.salted, i, j);
      out += `<path d="${pd(face([a, b], 0.3), false)}" fill="none" stroke="${PALS.tomato.m}" stroke-width="1.3" stroke-dasharray="2.2 1.4"/>`;
    }
  });

  let text = '';
  const put = (u: number, v: number, str: string, sz: number, color: string = INK, weight = 700, isMono = false, dx = 0.1) => {
    const t = tx(FACE_X + dx, u, v - sz * 0.35, str, sz, color, weight);
    text += isMono ? mono(t) : t;
  };

  // 저장소 종이.
  put((SHEET.u0 + SHEET.u1) / 2, SHEET.v1 - 6, '유출된 저장소', size);
  const cols = sheetColumns(s.salted);
  const headV = SHEET.v1 - SHEET_HEAD + 3;
  put(cols.name, headV, '사용자', small, palette.muted, 400);
  if (cols.salt !== null) put(cols.salt, headV, '소금', small, palette.muted, 400);
  put(cols.hash, headV, '저장된 값', small, palette.muted, 400);
  rows.forEach((r, j) => {
    const v = sheetRowMid(j);
    put(cols.name, v, r.name, size, INK, 700, true);
    if (cols.salt !== null) put(cols.salt, v, r.salt, size, INK, 400, true);
    put(cols.hash, v, `${r.hash.slice(0, 12)}…`, size, INK, 400, true);
  });
  put((SHEET.u0 + SHEET.u1) / 2, SHEET.v0 + 5, '비밀번호 칸은 없습니다', small, palette.muted, 400);

  // 장부.
  put((BOOK.u0 + BOOK.u1) / 2, BOOK.v1 - 6, '미리 만든 표 · 흔한 비밀번호 10개', size);
  put(BOOK_COLS.password, BOOK.v1 - BOOK_HEAD + 2, '비밀번호', small, palette.muted, 400);
  put(BOOK_COLS.hash, BOOK.v1 - BOOK_HEAD + 2, '해시 앞 8자', small, palette.muted, 400);
  TABLE.forEach((row, i) => {
    const v = bookRowMid(i);
    put(BOOK_COLS.password, v, row.password, size, INK, hitRows[i] ? 700 : 400, true, 0.12);
    put(BOOK_COLS.hash, v, `${row.hash.slice(0, 8)}…`, size, INK, 400, true, 0.12);
  });

  return koreanLabels(out + text);
}
