/*
 * 생일 달력판 figure 의 장면. 받침판 위 오른쪽에 한 해 달력판(12달 × 31칸), 왼쪽에 집계 막대 두 개를 단 판이 서 있다.
 * 달력판 앞 받침판 위에 스티커 첩이 놓여 있다. 모인 사람은 이 첩에서 스티커를 떼어 자기 생일 칸에 붙인다.
 *
 * 그리는 순서: 받침판 → 그림자 → 달력판(칸, 없는 날) → 스티커 → 겹친 칸의 빨간 고리 → 스티커 첩 → 집계 판 → 글자.
 * 글자는 맨 뒤에 그린다 (ColorFigure 의 crispText 가 필터 밖으로 떼어 낸다).
 */
import {
  BOARD,
  CERAMIC,
  INK,
  PALS,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  ellUV,
  fill,
  ink,
  line,
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
import { MONTH_DAYS, monthDay, sharedDays, theory, type CalendarState } from './calendar';

const BASE_H = 3;
const BASE: [number, number, number, number] = [0, 0, 28, 214];
/** 달력판: 앞면 x = FX. */
const FX = 8;
const CAL = { y0: 4, y1: 156, z1: 96 };
/** 칸: 1일 칸의 왼쪽 끝이 COL0, 한 칸 폭 CW. 1월 줄의 위 끝이 ROW0, 한 줄 높이 RH. */
const COL0 = 142;
const CW = 4;
const ROW0 = 88;
const RH = 5;
const STICKER_R = 1.45;
/** 집계 판. */
const TALLY = { y0: 162, y1: 210, z1: 72 };
const BAR_SHARED = { y0: 189, y1: 201 };
const BAR_NONE = { y0: 168, y1: 180 };
const BAR_Z0 = 16;
const BAR_H = 46;
/** 스티커 첩. */
const PAD = { x0: 15, x1: 23, y0: 112, y1: 126, h: 3 };

export const CALENDAR_SIZE: Vec3 = [BASE[2], BASE[3], CAL.z1];

const SHARED_COLOR = palette['chart-warm'];
const NONE_COLOR = palette['blue-soft'];
const STICKER = PALS.mustard;
const RING = PALS.tomato.l;
const BODY = PALS.mint;

const PCT_Z = [BAR_Z0, BAR_Z0 + BAR_H / 2, BAR_Z0 + BAR_H] as const;

/** 앞면(x = FX)에 쓴 글자 하나. (y, z) 는 가운데 밑줄, size 는 글자 크기 (세계 단위). */
export interface BoardLabel {
  y: number;
  z: number;
  text: string;
  size: number;
  /** 숫자만 있는 눈금은 고정폭으로 쓴다. */
  mono: boolean;
}

/** 앞면의 글자 전부: 달 이름, 날 눈금, 막대 이름, 백분율 눈금. 글자는 상태와 상관없이 같다. */
export function boardLabels(scale = 1): BoardLabel[] {
  const out: BoardLabel[] = [];
  for (let m = 0; m < 12; m++) out.push({ y: COL0 + 6, z: ROW0 - m * RH - RH + 1.2, text: `${m + 1}월`, size: 3.2, mono: false });
  for (const day of [1, 10, 20, 31]) out.push({ y: COL0 - (day - 0.5) * CW, z: ROW0 + 1.6, text: String(day), size: 3, mono: true });
  out.push({ y: (BAR_SHARED.y0 + BAR_SHARED.y1) / 2, z: BAR_Z0 - 6, text: '같은 생일', size: 3.2, mono: false });
  out.push({ y: (BAR_NONE.y0 + BAR_NONE.y1) / 2, z: BAR_Z0 - 6, text: '모두 다름', size: 3.2, mono: false });
  PCT_Z.forEach((z, i) => out.push({ y: BAR_SHARED.y1 + 4.4, z: z - 1, text: String([0, 50, 100][i]), size: 2.8, mono: true }));
  return out.map(label => ({
    ...label,
    // 막대 이름 둘 사이에는 눈금보다 여유가 적다.
    size: label.size * Math.min(label.text === '같은 생일' || label.text === '모두 다름' ? 1.25 : 1.4, scale),
  }));
}

/** 앞면의 영역 (y 는 왼쪽이 크다): 테스트가 글자가 칸·막대를 가리지 않는지 본다. */
export const REGIONS = {
  calendarPanel: { yL: CAL.y1, yR: CAL.y0, zT: CAL.z1, zB: BASE_H },
  tallyPanel: { yL: TALLY.y1, yR: TALLY.y0, zT: TALLY.z1, zB: BASE_H },
  grid: { yL: COL0, yR: COL0 - 31 * CW, zT: ROW0, zB: ROW0 - 12 * RH },
  barShared: { yL: BAR_SHARED.y1, yR: BAR_SHARED.y0, zT: BAR_Z0 + BAR_H, zB: BAR_Z0 },
  barNone: { yL: BAR_NONE.y1, yR: BAR_NONE.y0, zT: BAR_Z0 + BAR_H, zB: BAR_Z0 },
};

/** 칸 (달 m, 날 d) 의 네 꼭짓점 범위: y0 > y1 (왼쪽이 큰 y), z 위·아래. */
export function cellBox(m: number, d: number) {
  const yL = COL0 - (d - 1) * CW;
  const zT = ROW0 - m * RH;
  return { yL, yR: yL - CW, zT, zB: zT - RH };
}

/** 칸 가운데 (앞면 위). */
export function cellCenter(day: number, dx = 0.05): Vec3 {
  const [m, d] = monthDay(day);
  const c = cellBox(m, d);
  return [FX + dx, (c.yL + c.yR) / 2, (c.zT + c.zB) / 2];
}

const mono = (svg: string) => svg.replace('<text ', `<text font-family="${MONO_FONT}" `);

/** 달력판: 판, 칸, 없는 날(2월 29일 등) 빗금, 달 이름, 날 눈금. */
function calendarBoard(): string {
  let s = box(FX - 4, CAL.y0, BASE_H, FX, CAL.y1, CAL.z1, BODY, tone, 1.2);
  const gridTop = ROW0;
  const gridBottom = ROW0 - 12 * RH;
  const gridLeft = COL0;
  const gridRight = COL0 - 31 * CW;
  s += shape(on(PX(FX + 0.02), rectUV(gridRight, gridBottom, gridLeft, gridTop)), CERAMIC.l, 1.2);
  // 없는 날: 달마다 날 수 다음 칸부터 31일까지 칠한다.
  for (let m = 0; m < 12; m++) {
    if (MONTH_DAYS[m] === 31) continue;
    const a = cellBox(m, MONTH_DAYS[m] + 1);
    const b = cellBox(m, 31);
    s += fill(pd(on(PX(FX + 0.03), rectUV(b.yR, a.zB, a.yL, a.zT))), CERAMIC.d);
  }
  // 칸 선
  let d = '';
  for (let c = 1; c < 31; c++) d += pd([[FX + 0.04, COL0 - c * CW, gridTop], [FX + 0.04, COL0 - c * CW, gridBottom]], false);
  for (let r = 1; r < 12; r++) d += pd([[FX + 0.04, gridLeft, ROW0 - r * RH], [FX + 0.04, gridRight, ROW0 - r * RH]], false);
  s += `<path d="${d}" fill="none" stroke="${INK}" stroke-opacity=".35" stroke-width=".6"/>`;
  return s;
}

/** 스티커 한 장 (앞면 위의 동그라미). */
const sticker = (p: Vec3) => shape(on(PX(p[0]), ellUV(p[1], p[2], STICKER_R, STICKER_R, 18)), STICKER.l, 0.8);

/** 마지막 모임의 스티커. 같은 날 스티커는 비켜 붙이고 빨간 고리를 두른다. */
function stickers(days: readonly number[]): string {
  const dup = sharedDays(days);
  const placed = new Map<number, number>();
  let s = '';
  let rings = '';
  for (const day of days) {
    const k = placed.get(day) ?? 0;
    placed.set(day, k + 1);
    const c = cellCenter(day, 0.06 + 0.01 * k);
    const off = dup.has(day) ? (k - ((dup.get(day) ?? 1) - 1) / 2) * 1.1 : 0;
    s += sticker([c[0], c[1] - off, c[2] + off * 0.35]);
  }
  for (const day of dup.keys()) {
    const c = cellCenter(day, 0.1);
    rings += `<path d="${pd(on(PX(c[0]), ellUV(c[1], c[2], CW * 0.72, RH * 0.62, 24)))}" fill="none" stroke="${RING}" stroke-width="1.6"/>`;
  }
  return s + rings;
}

/** 집계 막대 하나 (monte-carlo 의 비율 막대와 같은 꼴). */
function bar(y0: number, y1: number, share: number | null, color: string, th: number): string {
  const x = FX + 0.05;
  const tube = on(PX(x), rectUV(y0, BAR_Z0, y1, BAR_Z0 + BAR_H));
  let s = shape(tube, '#e8f2f2', 0.9);
  if (share !== null && share > 0) s += clipTo(tube, fill(pd(on(PX(x + 0.01), rectUV(y0, BAR_Z0, y1, BAR_Z0 + BAR_H * share))), color));
  s += ink(pd(tube), 1.3);
  const tz = BAR_Z0 + BAR_H * th;
  s += `<path d="${pd([[x + 0.02, y0 - 1.6, tz], [x + 0.02, y1 + 1.6, tz]], false)}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="2.2 1.6"/>`;
  return s;
}

function tally(s: CalendarState): string {
  const p = theory(s.n);
  const shareShared = s.groups ? s.shared / s.groups : null;
  const shareNone = s.groups ? (s.groups - s.shared) / s.groups : null;
  let out = box(FX - 4, TALLY.y0, BASE_H, FX, TALLY.y1, TALLY.z1, BODY, tone, 1.2);
  out += bar(BAR_SHARED.y0, BAR_SHARED.y1, shareShared, SHARED_COLOR, p);
  out += bar(BAR_NONE.y0, BAR_NONE.y1, shareNone, NONE_COLOR, 1 - p);
  for (const z of PCT_Z) out += line([[FX + 0.05, BAR_SHARED.y1 + 0.5, z], [FX + 0.05, BAR_SHARED.y1 + 2, z]], 0.8);
  return out;
}

/** 스티커 첩: 받침판 위에 쌓인 노란 스티커 묶음. */
function pad(): string {
  let s = '';
  for (let i = 0; i < 3; i++) s += box(PAD.x0, PAD.y0, BASE_H + i, PAD.x1, PAD.y1, BASE_H + i + 0.9, STICKER, tone, 0.6);
  return s;
}

/** 장면 전체. 한글이 섞인 글자(달 이름, 막대 이름)는 일반 글꼴로 쓴다. */
export function calendarScene(s: CalendarState): string {
  let out = board(...BASE, BASE_H, 5, BOARD);
  const corners = (y0: number, y1: number, z1: number): Vec3[] =>
    [FX - 4, FX].flatMap((x) => [y0, y1].flatMap((y) => [BASE_H, z1].map((z) => [x, y, z] as Vec3)));
  out += clipTo(
    boardTop(...BASE, BASE_H, 5),
    castShadow(corners(CAL.y0, CAL.y1, CAL.z1), BASE_H) + castShadow(corners(TALLY.y0, TALLY.y1, TALLY.z1), BASE_H),
  );
  out += calendarBoard();
  out += stickers(s.last);
  out += pad();
  out += tally(s);
  for (const l of boardLabels(labelScale())) {
    const t = tx(FX + 0.05, l.y, l.z, l.text, l.size);
    out += l.mono ? mono(t) : t;
  }
  return koreanLabels(out);
}
