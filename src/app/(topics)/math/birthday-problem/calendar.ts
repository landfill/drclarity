/*
 * 생일 달력판 figure 의 상태. 그리기는 calendarScene.ts 가 맡는다.
 *
 * 실제 순서 (버튼 하나가 모임 여러 번):
 *   1. n 명이 모인다. 저마다 스티커 첩에서 스티커 한 장을 떼어 달력의 자기 생일 칸에 붙인다
 *      (생일은 365일에 고르게, 윤년 없이 — birthday.ts 의 drawBirthdays 그대로).
 *   2. 한 칸에 스티커가 두 장 이상이면 생일이 같은 사람이 있는 모임이다. 그 칸에 빨간 고리를 두른다.
 *   3. 옆의 막대 두 개가 지금까지 모인 횟수 중 "같은 생일 있음" 과 "전부 다른 날" 의 비율만큼 찬다.
 *      점선은 이론값이다.
 *   4. 다음 모임 전에 스티커를 떼고 판을 비운다. 화면에는 마지막 모임의 스티커만 남는다.
 *
 * 난수는 상태 안의 씨앗(mulberry32)에서 만든다. 같은 상태에서 같은 버튼을 누르면 같은 모임이 나온다.
 */
import { DAYS_IN_YEAR, drawBirthdays, hasSharedBirthday, sharedBirthdayProbability } from './birthday';

/** 버튼이 모아 보는 횟수. 지금 인터랙션(TrialRunner)의 프리셋과 같다. */
export const BATCHES = [10, 100, 1000, 5000] as const;
export type Batch = (typeof BATCHES)[number];

/** 평년의 달마다 날 수. 1월부터. */
export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** 한 해의 몇째 날(0..364) → [달 0..11, 날 1..31]. */
export function monthDay(day: number): [number, number] {
  let d = day;
  for (let m = 0; m < 12; m++) {
    if (d < MONTH_DAYS[m]) return [m, d + 1];
    d -= MONTH_DAYS[m];
  }
  throw new RangeError(`day ${day}`);
}

const BATCH_SECONDS: Record<Batch, number> = { 10: 2, 100: 2, 1000: 2.2, 5000: 2.6 };

export interface CalendarState {
  /** 모인 사람 수. 바깥 슬라이더가 정하고, 바뀌면 figure 를 새로 마운트한다. */
  n: number;
  /** 지금까지 모인 횟수와 그중 같은 생일이 있던 횟수. */
  groups: number;
  shared: number;
  /** 마지막 모임의 생일들 (0..364). 아직 모인 적이 없으면 빈 배열. */
  last: number[];
  /** 이번 묶음에서 남은 모임 수, 묶음 크기, 소수 부분. */
  queue: number;
  batch: number;
  carry: number;
  seed: number;
  note: string;
}

/** mulberry32: 씨앗 하나로 [0, 1) 난수 하나와 다음 씨앗. */
function nextRandom(seed: number): [number, number] {
  const s = (seed + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** 씨앗으로 n 명의 생일을 뽑는다. 뽑은 생일과 다음 씨앗. */
export function groupFromSeed(n: number, seed: number): [number[], number] {
  let s = seed >>> 0;
  const days = drawBirthdays(n, () => {
    const [v, next] = nextRandom(s);
    s = next;
    return v;
  });
  return [days, s];
}

export const initialCalendar = (n: number, seed = 20261022): CalendarState => ({
  n,
  groups: 0,
  shared: 0,
  last: [],
  queue: 0,
  batch: 0,
  carry: 0,
  seed: seed >>> 0,
  note: `${n}명이 모일 때마다 저마다 자기 생일 칸에 스티커를 붙입니다. 버튼을 눌러 모아 보세요.`,
});

export const isSettled = (s: CalendarState): boolean => s.queue === 0;

/** 같은 날에 붙은 스티커 묶음: 날 → 사람 수 (2 이상만). */
export function sharedDays(days: readonly number[]): Map<number, number> {
  const count = new Map<number, number>();
  for (const d of days) count.set(d, (count.get(d) ?? 0) + 1);
  for (const [d, c] of count) if (c < 2) count.delete(d);
  return count;
}

/** 정수 n/d 를 소수 places 자리로 반올림해 적는다 (d > 0, n ≥ 0). */
export function ratioText(n: number, d: number, places: number): string {
  const scale = 10 ** places;
  const q = Math.floor((2 * n * scale + d) / (2 * d));
  const int = Math.floor(q / scale);
  return places ? `${int}.${String(q % scale).padStart(places, '0')}` : String(int);
}

/** 같은 생일이 있던 모임의 비율 (%). 모인 적이 없으면 null. */
export const sharedPercent = (s: CalendarState): string | null => (s.groups ? ratioText(100 * s.shared, s.groups, 1) : null);

const count = (v: number) => v.toLocaleString('ko-KR');

/** 마지막 모임을 문장으로. */
function lastNote(s: CalendarState): string {
  const dup = sharedDays(s.last);
  const head = dup.size
    ? `방금 모임에서는 ${[...dup.keys()]
        .slice(0, 2)
        .map((d) => {
          const [m, day] = monthDay(d);
          return `${m + 1}월 ${day}일`;
        })
        .join(', ')}${dup.size > 2 ? ` 외 ${dup.size - 2}곳` : ''}에 스티커가 겹쳤습니다.`
    : '방금 모임에서는 모두 다른 날이었습니다.';
  return `${head} 지금까지 ${count(s.groups)}번 중 ${count(s.shared)}번(${sharedPercent(s)}%) 같은 생일이 있었습니다.`;
}

/** 시간이 dt 초 흐른 뒤. 바뀐 것이 없으면 s 를 그대로 돌려준다. */
export function advanceCalendar(s: CalendarState, dt: number): CalendarState {
  if (isSettled(s) || dt <= 0) return s;
  const total = s.carry + (s.batch / BATCH_SECONDS[s.batch as Batch]) * dt;
  const k = Math.min(s.queue, Math.floor(total));
  if (k === 0) return { ...s, carry: total };
  let { seed, groups, shared } = s;
  let last = s.last;
  for (let i = 0; i < k; i++) {
    [last, seed] = groupFromSeed(s.n, seed);
    groups += 1;
    if (hasSharedBirthday(last)) shared += 1;
  }
  const queue = s.queue - k;
  const next = { ...s, seed, groups, shared, last, queue, carry: queue ? total - k : 0, batch: queue ? s.batch : 0 };
  return queue ? next : { ...next, note: lastNote(next) };
}

/** 버튼 "n번 모아보기". 모으는 중이면 상태는 그대로 두고 이유를 알린다. */
export function gather(s: CalendarState, k: Batch): CalendarState {
  if (s.queue > 0) return { ...s, note: `모으는 중입니다. 남은 ${count(s.queue)}번을 마친 뒤에 더 모을 수 있습니다.` };
  return { ...s, queue: k, batch: k, carry: 0, note: `${s.n}명씩 ${count(k)}번 모입니다.` };
}

/** 버튼 "집계 비우기". 모으는 중이면 멈추고 비운다. 씨앗은 이어 쓴다. */
export function clearTally(s: CalendarState): CalendarState {
  if (s.groups === 0 && s.queue === 0) return { ...s, note: '아직 모은 적이 없습니다.' };
  return { ...initialCalendar(s.n, s.seed), note: '집계를 비웠습니다.' };
}

/** 지금 누를 차례인 버튼. 모으는 중에는 강조하지 않는다. 모인 횟수가 열 배쯤 늘어나는 묶음을 권한다. */
export function nextAction(s: CalendarState): Batch | null {
  if (s.queue > 0) return null;
  return BATCHES.find((b) => b > s.groups) ?? 5000;
}

/** 이론값: 같은 생일이 있을 확률. */
export const theory = (n: number) => sharedBirthdayProbability(n);
export { DAYS_IN_YEAR };
