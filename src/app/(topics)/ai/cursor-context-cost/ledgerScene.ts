/*
 * 문맥 병과 사용량 영수증 figure 의 장면. 받침판 위 왼쪽에 계량 병, 오른쪽에 영수증 기계가 있다.
 *   - 계량 병: 병 하나가 창 200K 다. 아래층(민트)이 설정·도구 설명, 위층(분홍)이 대화이고, 위의 빈 자리가 남은 창이다.
 *     요청 전 문맥(채팅창의 링)이라 호출 수를 바꿔도 그대로다.
 *   - 병 앞의 작은 쪽지가 이번 메시지다. 첫 호출의 새 입력이 된다.
 *   - 받침판의 화살표: 병 → 기계. 호출마다 병의 문맥을 다시 읽는다 (병을 비우거나 옮겨 붓지 않는다).
 *   - 영수증 기계는 호출마다 한 줄씩 찍는다. 한 줄의 막대는 병과 같은 창 200K 자이고, 왼쪽부터
 *     재사용(회색) · 캐시 저장(옅은 겨자) · 새 입력(겨자) · 출력(파랑) 이다. 막대 끝의 점선이 창 한도다.
 *     다 찍으면 맨 아래에 합계가 찍힌다. 합계에는 막대를 그리지 않는다 (창 한도와 견줄 값이 아니다).
 * 색은 kv-cache 와 같은 뜻으로 쓴다: 새로 계산 = 겨자, 다시 씀 = 회색. 출력은 prefill-decode 의 쓰기와 같은 파랑.
 *
 * 그리는 순서: 받침판 → 그림자 → 화살표 → 쪽지 → 병 → 기계 → 영수증 → 글자.
 */
import {
  BOARD,
  CERAMIC,
  CLEAR,
  DARK,
  INK,
  METAL,
  PALS,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  cyl,
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
import { NEW_MESSAGE, WINDOW_LIMIT } from './usage';
import { derive, formatTokens, isSettled, type LedgerState } from './ledger';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 56, 230];
/** 계량 병: 가운데, 반지름, 바닥, 창 200K 의 높이. */
export const JAR = { cx: 28, cy: 186, r: 24, z0: BASE_H + 2, h: 60 };
/** 병 위 제목의 높이: 병 윗면의 뒤쪽 테두리보다 위에 둔다 (윗면은 위에서 비스듬히 보인다). */
export const JAR_TITLE_Z = JAR.z0 + JAR.h + JAR.r * 0.9 + 4;
/** 이번 메시지 쪽지: 병과 기계 사이, 기계 쪽에 선 카드. */
export const NOTE = { x0: 30, x1: 36, y0: 132, y1: 155, z1: BASE_H + 13 };
/** 영수증 기계. */
export const PRINTER = { x0: 16, x1: 48, y0: 8, y1: 124, z1: BASE_H + 20 };
/** 영수증 종이: 앞면 x, 좌우(u), 종이가 나오는 틈의 높이. */
export const PAPER = { x: 33, u0: 14, u1: 118, slot: PRINTER.z1 + 0.6 };
/** 줄 안의 자리 (u). 막대는 barL 에서 barR 까지가 창 200K 다. */
export const ROW = { labelR: 100, barL: 97, barR: 42 };
/** 줄 높이: 호출이 많으면 정해 둔 자리 안에 들도록 줄인다. */
const ROW_MAX = 11;
const ROWS_SPACE = 5 * ROW_MAX;
export const rowHeight = (calls: number) => Math.min(ROW_MAX, ROWS_SPACE / Math.max(1, calls));
const HEAD_H = 15;
const TOTAL_H = 16;
const BOTTOM = 3;

/** 영수증이 가장 길 때. 장면 높이를 정한다. */
const MAX_PAPER = HEAD_H + ROWS_SPACE + TOTAL_H + BOTTOM;
export const LEDGER_SIZE: Vec3 = [BASE[2], BASE[3], Math.max(PAPER.slot + MAX_PAPER, JAR_TITLE_Z + 12) + 2];

export const labelSize = (scale = labelScale()) => 4.4 * Math.min(1.4, scale);
/** 영수증 글자: 줄 높이 안에 들도록 묶는다. */
export const paperSize = (scale = labelScale(), calls = 1) => Math.min(4.6 * Math.min(1.5, scale), rowHeight(calls) * 0.62);
export const textWidth = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);
const paper = (uv: [number, number][], dx = 0): Vec3[] => on(PX(PAPER.x + dx), uv);

/** 줄 막대의 색 (왼쪽부터). */
export const SEG_COLOR = { cacheRead: CERAMIC.d, cacheWrite: PALS.mustard.l, input: PALS.mustard.m, output: PALS.cobalt.l } as const;
/** 병의 두 층. */
export const LAYER_COLOR = { overhead: PALS.mint, conversation: PALS.blush } as const;

/** 토큰 수 → 병 높이, 막대 길이. 둘 다 창 200K 가 한 자다. */
export const jarHeight = (tokens: number) => (Math.min(tokens, WINDOW_LIMIT) / WINDOW_LIMIT) * JAR.h;
export const barLength = (tokens: number) => (tokens / WINDOW_LIMIT) * (ROW.barL - ROW.barR);

/** 병 위의 두 줄: 요청 전 문맥과, 병 하나가 창 200K 라는 것. */
export const jarTitle = (context: number, pct: number): [string, string] => [`요청 전 문맥 ${formatTokens(context)}`, `${pct}% · 병 하나 = 창 ${WINDOW_LIMIT / 1000}K`];

/** 영수증 머리 두 줄과 합계 아래 줄. */
export const PAPER_HEAD = ['사용량 영수증', '막대 끝 = 창 200K'] as const;
export const PAPER_TOTAL_NOTE = '창보다 클 수 있는 합';

/** 쪽지의 두 줄과 글자 크기 (카드 앞면 안에 든다). */
export const noteLines = (): [string, string] => ['새 메시지', formatTokens(NEW_MESSAGE)];
export const noteSize = (scale = labelScale()) => 3.6 * Math.min(1.15, scale);

/** 영수증 길이: 머리 + 찍힌 줄 + 나오는 중인 줄 + (다 찍었으면) 합계. */
export function paperLength(s: LedgerState): number {
  return HEAD_H + (s.printed + (isSettled(s) ? 0 : s.feed)) * rowHeight(s.calls) + (isSettled(s) ? TOTAL_H : 0) + BOTTOM;
}

/** 줄 i 의 위·아래 (v). 줄은 종이 꼭대기에서부터 차례로 놓이고, 종이가 나올수록 함께 올라간다. */
export function rowBox(s: LedgerState, i: number) {
  const h = rowHeight(s.calls);
  const top = PAPER.slot + paperLength(s) - HEAD_H - i * h;
  return { vT: top, vB: top - h, mid: top - h / 2 };
}

/** 장면 전체. */
export function ledgerScene(s: LedgerState): string {
  const d = derive(s);
  const size = labelSize();
  const ps = paperSize(labelScale(), s.calls);
  const head = paperSize(labelScale(), 1);

  let out = board(...BASE, BASE_H, 5, BOARD);
  const len = paperLength(s);
  const corners: Vec3[] = [
    ...[JAR.cx - JAR.r, JAR.cx + JAR.r].flatMap((x) => [JAR.cy - JAR.r, JAR.cy + JAR.r].flatMap((y) => [BASE_H, JAR.z0 + JAR.h].map((z) => [x, y, z] as Vec3))),
    ...[PRINTER.x0, PRINTER.x1].flatMap((x) => [PRINTER.y0, PRINTER.y1].flatMap((y) => [BASE_H, PAPER.slot + len].map((z) => [x, y, z] as Vec3))),
  ];
  out += clipTo(boardTop(...BASE, BASE_H, 5), castShadow(corners, BASE_H));

  // 받침판의 화살표: 병 → 기계 ("호출마다 다시 읽음").
  const ax = BASE[2] - 6;
  const ay0 = JAR.cy - JAR.r - 3;
  const ay1 = PRINTER.y1 + 4;
  out += line([[ax, ay0, BASE_H + 0.05], [ax, ay1, BASE_H + 0.05]], 1.4);
  out += line([[ax - 2.5, ay1 + 4, BASE_H + 0.05], [ax, ay1, BASE_H + 0.05], [ax + 2.5, ay1 + 4, BASE_H + 0.05]], 1.4);

  // 이번 메시지 쪽지.
  out += box(NOTE.x0, NOTE.y0, BASE_H, NOTE.x1, NOTE.y1, NOTE.z1, CERAMIC, tone, 1);

  // 계량 병: 두 층과 남은 자리. 병 하나가 창 200K.
  const hOver = jarHeight(d.overhead);
  const hAll = jarHeight(d.context);
  out += cyl(JAR.cx, JAR.cy, BASE_H, JAR.z0, JAR.r + 1, CLEAR, tone, 1);
  if (hOver > 0.05) out += cyl(JAR.cx, JAR.cy, JAR.z0, JAR.z0 + hOver, JAR.r, LAYER_COLOR.overhead, tone, 0.9, 40);
  if (hAll - hOver > 0.05) out += cyl(JAR.cx, JAR.cy, JAR.z0 + hOver, JAR.z0 + hAll, JAR.r, LAYER_COLOR.conversation, tone, 0.9, 40);
  if (JAR.h - hAll > 0.05) out += cyl(JAR.cx, JAR.cy, JAR.z0 + hAll, JAR.z0 + JAR.h, JAR.r, CLEAR, tone, 0.9, 40);

  // 영수증 기계와 종이.
  out += box(PRINTER.x0, PRINTER.y0, BASE_H, PRINTER.x1, PRINTER.y1, PRINTER.z1, METAL, tone, 1.3);
  out += box(PAPER.x - 2, PAPER.u0 - 2, PRINTER.z1, PAPER.x + 1, PAPER.u1 + 2, PAPER.slot, DARK, tone, 0.8);
  const top = PAPER.slot + len;
  out += shape(paper([[PAPER.u0, PAPER.slot], [PAPER.u1, PAPER.slot], [PAPER.u1, top], [PAPER.u0, top]]), CERAMIC.l, 1);

  let text = '';
  const putPaper = (u: number, v: number, str: string, sz: number, color: string = INK, weight = 700) => {
    text += tx(PAPER.x + 0.1, u, v - sz * 0.35, str, sz, color, weight);
  };

  // 머리: 제목과 자.
  putPaper((PAPER.u0 + PAPER.u1) / 2, top - 5, PAPER_HEAD[0], head);
  putPaper((ROW.barL + ROW.barR) / 2, top - 11, PAPER_HEAD[1], head * 0.85, palette.muted, 400);

  // 다 찍힌 줄.
  const rows = d.scenario.slice(0, s.printed);
  rows.forEach((call, i) => {
    const b = rowBox(s, i);
    const label = `${i + 1}회`;
    putPaper(ROW.labelR + 1 + textWidth(label, ps) / 2, b.mid, label, ps);
    let u = ROW.barL;
    for (const key of ['cacheRead', 'cacheWrite', 'input', 'output'] as const) {
      const len2 = barLength(call[key] ?? 0);
      if (len2 <= 0.01) continue;
      const bh = Math.min(1.8, rowHeight(s.calls) * 0.22);
      out += shape(paper(rectUV(u - len2, b.mid - bh, u, b.mid + bh), 0.1), SEG_COLOR[key], 0.5);
      u -= len2;
    }
    if (call.summarized) putPaper(u - 1.5 - textWidth('요약', ps * 0.85) / 2, b.mid, '요약', ps * 0.85, INK, 700);
    text += mono(tx(PAPER.x + 0.1, (ROW.barR + PAPER.u0) / 2, b.mid - ps * 0.35, formatTokens(call.activeContext), ps, INK, 400));
  });

  // 창 한도: 막대 끝의 점선 (머리부터 마지막 줄까지).
  if (rows.length > 0) {
    const last = rowBox(s, rows.length - 1);
    out += `<path d="${pd(paper([[ROW.barR, top - HEAD_H + 1], [ROW.barR, last.vB + 1]], 0.15), false)}" fill="none" stroke="${INK}" stroke-width=".7" stroke-dasharray="1.6 1.2"/>`;
  }

  // 합계: 다 찍은 뒤에만. 막대를 그리지 않는다.
  if (isSettled(s)) {
    const tv = rowBox(s, s.printed - 1).vB;
    out += `<path d="${pd(paper([[PAPER.u0 + 3, tv - 1.5], [PAPER.u1 - 3, tv - 1.5]], 0.15), false)}" fill="none" stroke="${INK}" stroke-width=".7" stroke-dasharray="1.6 1.2"/>`;
    putPaper((PAPER.u0 + PAPER.u1) / 2, tv - 7, `합계 ${d.grandTotal.toLocaleString('ko-KR')}`, head * 1.15);
    putPaper((PAPER.u0 + PAPER.u1) / 2, tv - 13, PAPER_TOTAL_NOTE, head * 0.85, palette.muted, 400);
  }

  // 병의 글자: 위에 제목 두 줄, 층마다 이름과 크기 (병 앞면에).
  const jx = JAR.cx + JAR.r + 0.2;
  const [t1, t2] = jarTitle(d.context, d.percentFull);
  text += tx(jx, JAR.cy, JAR_TITLE_Z + size * 1.25, t1, size);
  text += tx(jx, JAR.cy, JAR_TITLE_Z, t2, size * 0.85, palette.muted, 400);
  const small = size * 0.85;
  if (hOver >= small * 1.3) text += tx(jx, JAR.cy, JAR.z0 + hOver / 2 - small * 0.35, `설정·도구 ${formatTokens(d.overhead)}`, small);
  if (hAll - hOver >= small * 1.3) text += tx(jx, JAR.cy, JAR.z0 + (hOver + hAll) / 2 - small * 0.35, `대화 ${formatTokens(d.breakdown.conversation)}`, small);

  // 쪽지와 화살표의 글자.
  const [n1, n2] = noteLines();
  const ns = noteSize();
  text += tx(NOTE.x1 + 0.1, (NOTE.y0 + NOTE.y1) / 2, NOTE.z1 - 3 - ns * 0.35, n1, ns, INK, 700);
  text += tx(NOTE.x1 + 0.1, (NOTE.y0 + NOTE.y1) / 2, NOTE.z1 - 4 - ns * 1.6, n2, ns, INK, 400);

  return koreanLabels(out + text);
}
