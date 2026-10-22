/*
 * 점 찍는 기계 figure 의 상태. 그리기는 plotterScene.ts 가 맡는다.
 *
 * 실제 순서 (버튼 하나가 한 묶음을 던진다):
 *   1. 기계가 가로 자리 x 와 세로 자리 y 를 따로 무작위로 고른다 (throwDart 와 같다).
 *   2. 세로 막대가 x 로, 펜이 막대를 따라 y 로 가서 종이에 점을 찍는다.
 *   3. 점이 원 안이면 주황, 밖이면 파랑으로 센다. 옆의 막대 두 개가 지금까지의 비율만큼 찬다.
 *   4. 원 안 / 전체 에 4 를 곱한 값이 π 추정값이다.
 *
 * 난수는 상태에 든 씨앗에서 만든다. 같은 상태에서 같은 버튼을 누르면 같은 점이 찍혀 테스트할 수 있다.
 * 화면 숫자(추정값, 비율)는 정수 셈으로 반올림한다.
 */
import { formatCount } from '@/components/topic/trialAggregate';
import { throwDart, type Dart } from './pi';

/** 버튼이 던지는 묶음 크기. 지금 인터랙션(TrialRunner)의 프리셋과 같다. */
export const BATCHES = [10, 100, 1000, 5000] as const;
export type Batch = (typeof BATCHES)[number];
/** 판에 찍을 수 있는 점의 수. 그 뒤로는 판을 비워야 한다. */
export const MAX_DARTS = 10000;

/** 묶음 하나를 다 찍는 데 걸리는 시간(초). 10개는 펜이 한 점씩 옮겨 가는 것이 보이게 천천히. */
const BATCH_SECONDS: Record<Batch, number> = { 10: 2, 100: 2, 1000: 2.2, 5000: 2.6 };

export interface PlotterState {
  darts: Dart[];
  /** 이번 묶음에서 아직 찍지 않은 점 수. */
  queue: number;
  /** 지금 던지는 묶음 크기. 멈춰 있으면 0. */
  batch: number;
  /** 다음에 찍을 점. 펜이 이 자리로 가는 중이다. */
  next: Dart | null;
  /** 펜이 직전 점에서 다음 점까지 간 정도 0..1. */
  travel: number;
  /** 난수 씨앗 (32비트 부호 없는 정수). */
  seed: number;
  note: string;
}

/** mulberry32: 씨앗 하나로 [0, 1) 난수 하나와 다음 씨앗을 만든다. */
export function nextRandom(seed: number): [number, number] {
  const s = (seed + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** 씨앗에서 점 하나를 던진다. 던진 점과 다음 씨앗. */
export function dartFromSeed(seed: number): [Dart, number] {
  let s = seed;
  const rand = () => {
    const [v, n] = nextRandom(s);
    s = n;
    return v;
  };
  return [throwDart(rand), s];
}

export const initialPlotter = (seed = 20260422): PlotterState => ({
  darts: [],
  queue: 0,
  batch: 0,
  next: null,
  travel: 0,
  seed: seed >>> 0,
  note: '버튼을 누르면 기계가 정사각형 안의 아무 자리에나 점을 찍습니다.',
});

export const insideCount = (s: PlotterState): number => s.darts.reduce((n, d) => n + (d.inside ? 1 : 0), 0);

export const isSettled = (s: PlotterState): boolean => s.queue === 0;

/** 펜이 지금 있는 자리 (정사각형 좌표 [-1, 1]). 처음에는 가운데. */
export function penAt(s: PlotterState): { x: number; y: number } {
  const last = s.darts[s.darts.length - 1] ?? { x: 0, y: 0 };
  if (!s.next) return { x: last.x, y: last.y };
  const t = s.travel;
  return { x: last.x + (s.next.x - last.x) * t, y: last.y + (s.next.y - last.y) * t };
}

/** 정수 n/d 를 소수 places 자리로 반올림해 적는다 (d > 0, n ≥ 0). */
export function ratioText(n: number, d: number, places: number): string {
  const scale = 10 ** places;
  const q = Math.floor((2 * n * scale + d) / (2 * d));
  const int = Math.floor(q / scale);
  const frac = String(q % scale).padStart(places, '0');
  return places ? `${int}.${frac}` : String(int);
}

/** π 추정값 4 × 원 안 / 전체 를 소수 넷째 자리까지. 던진 점이 없으면 null. */
export const piText = (inside: number, total: number): string | null =>
  total > 0 ? ratioText(4 * inside, total, 4) : null;

/** 원 안 비율 (%) 을 소수 첫째 자리까지. */
export const percentText = (part: number, total: number): string | null =>
  total > 0 ? ratioText(100 * part, total, 1) : null;

/** 시간이 dt 초 흐른 뒤. 바뀐 것이 없으면 s 를 그대로 돌려준다. */
export function advancePlotter(s: PlotterState, dt: number): PlotterState {
  if (isSettled(s) || dt <= 0) return s;
  const rate = s.batch / BATCH_SECONDS[s.batch as Batch];
  let travel = s.travel + rate * dt;
  let { queue, seed, next } = s;
  const landed: Dart[] = [];
  while (travel >= 1 && queue > 0 && next) {
    landed.push(next);
    queue -= 1;
    travel -= 1;
    if (queue > 0) [next, seed] = dartFromSeed(seed);
    else next = null;
  }
  const darts = landed.length ? [...s.darts, ...landed] : s.darts;
  if (queue === 0) {
    return { ...s, darts, queue, next: null, travel: 0, seed, batch: 0, note: summary(darts) };
  }
  return { ...s, darts, queue, next, travel, seed };
}

/** 묶음을 다 찍은 뒤의 문구. */
function summary(darts: Dart[]): string {
  const total = darts.length;
  const inside = darts.reduce((n, d) => n + (d.inside ? 1 : 0), 0);
  return `${formatCount(total)}개 중 ${formatCount(inside)}개(${percentText(inside, total)}%)가 원 안입니다. 4 × ${formatCount(inside)} / ${formatCount(total)} = ${piText(inside, total)}`;
}

/** 버튼 "n개 던지기". 찍는 중이거나 판이 넘치면 상태는 그대로 두고 이유를 알린다. */
export function throwBatch(s: PlotterState, n: Batch): PlotterState {
  if (s.queue > 0) return { ...s, note: `점을 찍는 중입니다. 남은 ${formatCount(s.queue)}개를 다 찍은 뒤에 더 던질 수 있습니다.` };
  if (s.darts.length + n > MAX_DARTS) {
    return {
      ...s,
      note: `판에는 점을 ${formatCount(MAX_DARTS)}개까지 찍습니다. 지금 ${formatCount(s.darts.length)}개라 ${formatCount(n)}개를 더 찍을 수 없습니다. 판을 비우고 다시 던져 보세요.`,
    };
  }
  const [next, seed] = dartFromSeed(s.seed);
  return { ...s, queue: n, batch: n, next, travel: 0, seed, note: `${formatCount(n)}개를 던집니다. 자리는 가로와 세로를 따로 무작위로 고릅니다.` };
}

/** 버튼 "판 비우기". 찍는 중이면 멈추고 비운다. 씨앗은 이어 쓴다. */
export function clearBoard(s: PlotterState): PlotterState {
  if (s.darts.length === 0 && s.queue === 0) return { ...s, note: '판이 이미 비어 있습니다.' };
  return { ...s, darts: [], queue: 0, batch: 0, next: null, travel: 0, note: '판을 비웠습니다. 다시 던지면 다른 자리에 점이 찍힙니다.' };
}

/**
 * 지금 누를 차례인 버튼. 점을 찍는 동안에는 던지기가 거절되므로 강조하지 않는다.
 * 점이 열 배쯤 늘어나는 묶음을 권하고, 판이 넘치면 비우기를 권한다.
 */
export function nextAction(s: PlotterState): Batch | 'clear' | null {
  if (s.queue > 0) return null;
  const total = s.darts.length;
  const fits = (b: Batch) => total + b <= MAX_DARTS;
  return BATCHES.find((b) => b > total && fits(b)) ?? [...BATCHES].reverse().find(fits) ?? 'clear';
}
