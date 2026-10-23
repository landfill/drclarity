/*
 * 숫자 카드 탁자 figure 의 장면. 받침판 위에 세운 판이 하나 있고, 앞면이 세 칸이다: 왼쪽 앨리스, 가운데 통로 위 도청자, 오른쪽 밥.
 *   - 맨 위 띠: 공개 값 p · g. 모두가 본다.
 *   - 빨간 카드: 비밀 a · b. 자기 칸에만 있고 어디로도 가지 않는다.
 *   - 파란 카드: 보낼 수 g^a mod p · g^b mod p. 주고받을 때 아래 통로 두 줄을 따라 건너가고, 도청자 칸에 그 수가 적힌다.
 *   - 겨자색 카드: 받은 수로 마무리한 공유 비밀. 두 칸에 같은 수가 적히고, 도청자 칸에는 "못 들음" 만 남는다.
 *   - 도청자 칸 아래: x 를 1 부터 넣어 본 테이프 (마지막 몇 줄). 맞은 줄은 비밀과 같은 빨강으로 칠한다 (도청자가 되찾은 것이 a 다).
 * 색은 예전 화면의 뜻 그대로다: 비밀 = 빨강(danger), 보낸 수 = 파랑(blue), 공유 비밀 = 겨자(accent).
 * 물감 · 자물쇠 · 열쇠는 그리지 않는다 (본문: 색 비유는 되돌릴 수 있고, 이것은 자물쇠를 주는 방식이 아니다).
 *
 * 그리는 순서: 받침판 → 그림자 → 판 → 칸 · 통로 → 카드 → 테이프 → 글자.
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
import { tapeRows, triedCount, values, type TrialState } from './trial';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 40, 240];
/** 판: 앞면 x = STAND.x1. 앞면 좌표는 (y, z) 이고 y 가 클수록 화면 왼쪽이다. */
const STAND = { x0: 14, x1: 18, y0: 4, y1: 236, z1: 142 };
const FACE = STAND.x1 + 0.05;
/** 세 칸의 가운데 (u) 와 폭. */
export const COL = { alice: 196, eaves: 120, bob: 44, w: 72 } as const;
/** 줄 (v 의 아래 · 위). */
export const ROWS = {
  secret: [104, 116],
  sent: [88, 100],
  received: [72, 84],
  shared: [56, 68],
  laneAtoB: [18, 27],
  laneBtoA: [8, 17],
} as const;
const HEADER_V = STAND.z1 - 9;
const TITLE_V = STAND.z1 - 19;
/** 도청자 테이프의 줄 수와 자리. */
export const TAPE = { rows: 3, top: 49, rowH: 6 };

export const TRIAL_SIZE: Vec3 = [BASE[2], BASE[3], STAND.z1];

export const labelSize = (scale = labelScale()) => 4 * Math.min(1.15, scale);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);
const face = (uv: [number, number][], dx = 0): Vec3[] => on(PX(FACE + dx), uv);

/** 카드 색 (예전 화면의 뜻 그대로). */
export const CARD_COLOR = { secret: PALS.tomato.l, sent: PALS.cobalt.l, shared: PALS.mustard.m } as const;

/** 카드의 글자들 (계산식). 글자 폭 테스트가 같은 문자열을 쓴다. */
export function cardTexts(s: TrialState) {
  const { p, g, A, B, shared } = values(s);
  return {
    aliceSecret: `비밀 a = ${s.a}`,
    bobSecret: `비밀 b = ${s.b}`,
    aliceSent: `${g}^${s.a} mod ${p} = ${A}`,
    bobSent: `${g}^${s.b} mod ${p} = ${B}`,
    aliceReceived: `받음 ${B}`,
    bobReceived: `받음 ${A}`,
    aliceShared: `${B}^${s.a} mod ${p} = ${shared}`,
    bobShared: `${A}^${s.b} mod ${p} = ${shared}`,
    heard: `들음 ${A} · ${B}`,
  };
}

/** 건너가는 카드의 가운데 (u). travel 0 이면 보낸 칸, 1 이면 받는 칸. */
export const laneU = (from: number, to: number, travel: number) => from + (to - from) * ease(travel);

/** 장면 전체. */
export function trialScene(s: TrialState): string {
  const size = labelSize();
  const small = size * 0.85;
  const { p, g } = values(s);
  const t = cardTexts(s);

  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners: Vec3[] = [STAND.x0, STAND.x1].flatMap((x) => [STAND.y0, STAND.y1].flatMap((y) => [BASE_H, STAND.z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));
  out += box(STAND.x0, STAND.y0, BASE_H, STAND.x1, STAND.y1, STAND.z1, WOOD, tone, 1.3);
  out += shape(face(rectUV(STAND.y0 + 3, BASE_H + 3, STAND.y1 - 3, STAND.z1 - 3)), CERAMIC.l, 1);
  // 칸 사이 세로선과 통로 띠.
  for (const u of [(COL.alice + COL.eaves) / 2, (COL.eaves + COL.bob) / 2]) {
    out += `<path d="${pd(face([[u, ROWS.laneAtoB[1] + 3], [u, TITLE_V + 5]], 0.05), false)}" fill="none" stroke="${CERAMIC.d}" stroke-width=".7"/>`;
  }
  out += shape(face(rectUV(STAND.y0 + 6, ROWS.laneBtoA[0] - 1, STAND.y1 - 6, ROWS.laneAtoB[1] + 1), 0.03), BOARD.l, 0.6);

  let text = '';
  const put = (u: number, v: number, str: string, sz: number, color: string = INK, weight = 700, isMono = false) => {
    const tt = tx(FACE + 0.2, u, v - sz * 0.35, str, sz, color, weight);
    text += isMono ? mono(tt) : tt;
  };
  const card = (u: number, [v0, v1]: readonly [number, number], color: string, str: string, isMono: boolean) => {
    out += shape(face(rectUV(u - COL.w / 2 + 2, v0, u + COL.w / 2 - 2, v1), 0.1), color, 0.8);
    put(u, (v0 + v1) / 2, str, size, INK, 700, isMono);
  };

  // 머리: 공개 값과 칸 이름.
  put((STAND.y0 + STAND.y1) / 2, HEADER_V, `공개 값 p = ${p} · g = ${g} — 모두가 봅니다`, size);
  put(COL.alice, TITLE_V, '앨리스', size);
  put(COL.eaves, TITLE_V, '통로 위 도청자', size);
  put(COL.bob, TITLE_V, '밥', size);

  // 비밀: 자기 칸에만.
  card(COL.alice, ROWS.secret, CARD_COLOR.secret, t.aliceSecret, false);
  card(COL.bob, ROWS.secret, CARD_COLOR.secret, t.bobSecret, false);
  put(COL.eaves, (ROWS.secret[0] + ROWS.secret[1]) / 2, '비밀은 못 들음', small, palette.muted, 400);

  // 보낼 수.
  if (s.step >= 1) {
    card(COL.alice, ROWS.sent, CARD_COLOR.sent, t.aliceSent, true);
    card(COL.bob, ROWS.sent, CARD_COLOR.sent, t.bobSent, true);
  }
  // 주고받기: 건너가는 중이면 통로 위, 다 건넜으면 받은 칸과 도청자 칸.
  const { A, B } = values(s);
  if (s.step >= 2 && s.travel < 1) {
    const ua = laneU(COL.alice, COL.bob, s.travel);
    const ub = laneU(COL.bob, COL.alice, s.travel);
    card(ua, ROWS.laneAtoB, CARD_COLOR.sent, String(A), true);
    card(ub, ROWS.laneBtoA, CARD_COLOR.sent, String(B), true);
  }
  const arrived = s.step >= 2 && s.travel >= 1;
  if (arrived) {
    card(COL.alice, ROWS.received, CARD_COLOR.sent, t.aliceReceived, false);
    card(COL.bob, ROWS.received, CARD_COLOR.sent, t.bobReceived, false);
  }
  // 도청자는 카드가 가운데를 지나는 순간 두 수를 받아 적는다.
  if (s.step >= 2 && (arrived || s.travel >= 0.5)) put(COL.eaves, (ROWS.sent[0] + ROWS.sent[1]) / 2, t.heard, size, INK, 700);

  // 마무리: 두 사람만.
  if (s.step >= 3) {
    card(COL.alice, ROWS.shared, CARD_COLOR.shared, t.aliceShared, true);
    card(COL.bob, ROWS.shared, CARD_COLOR.shared, t.bobShared, true);
    put(COL.eaves, (ROWS.shared[0] + ROWS.shared[1]) / 2, '두 사람의 수는 못 들음', small, palette.muted, 400);
  }

  // 도청자의 테이프: x 를 1 부터.
  if (s.tried !== null) {
    put(COL.eaves, TAPE.top + 2.5, `${g}^x mod ${p} 를 1 부터`, small, palette.muted, 400);
    const rows = tapeRows(s, TAPE.rows);
    rows.forEach((r, k) => {
      const v = TAPE.top - (k + 0.5) * TAPE.rowH;
      if (r.hit) out += shape(face(rectUV(COL.eaves - COL.w / 2 + 4, v - TAPE.rowH / 2 + 0.3, COL.eaves + COL.w / 2 - 4, v + TAPE.rowH / 2 - 0.3), 0.1), CARD_COLOR.secret, 0.6);
      put(COL.eaves, v, `x = ${r.x} → ${r.value}${r.hit ? ' ✓' : ''}`, small, INK, r.hit ? 700 : 400, true);
    });
    if (triedCount(s) === 0) put(COL.eaves, TAPE.top - TAPE.rowH / 2, '…', small, palette.muted, 400);
  }

  return koreanLabels(out + text);
}
