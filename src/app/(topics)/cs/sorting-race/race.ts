/*
 * 정렬 선반 figure 의 상태. 그리기는 raceScene.ts 가 맡는다.
 *
 * 실제 순서:
 *   1. 같은 배열을 세 칸의 선반에 똑같이 늘어놓는다 (막대 하나가 값 하나).
 *   2. "출발" 을 누르면 세 줄이 같은 빠르기로 한 스텝씩 일한다. 스텝은 비교 한 번, 교환 한 번, 덮어쓰기 한 번이다.
 *      지금 비교하거나 옮기는 막대는 주황, 정렬이 끝난 줄은 초록이다.
 *   3. 먼저 끝난 줄은 해야 할 일이 적었던 줄이다. 각 줄의 앞 모서리에 비교·이동 횟수가 적힌다.
 *
 * 세 정렬은 sorting.ts 의 제너레이터 그대로다. 출발 전에 한 번 끝까지 돌려 스텝 목록(trace)을 적어 두고,
 * 화면은 그 목록을 같은 빠르기로 따라간다. 그래서 상태는 불변 값이고 advance 는 순수 함수다.
 */
import { ALGORITHMS, makeInput, type AlgorithmId, type InputPattern } from './sorting';

/** 기록한 스텝 하나. 덮어쓰기는 쓴 값을 함께 적는다. */
export type TraceStep =
  | { kind: 'compare'; i: number; j: number }
  | { kind: 'swap'; i: number; j: number }
  | { kind: 'overwrite'; i: number; value: number };

export interface Lane {
  id: AlgorithmId;
  label: string;
  complexity: string;
  trace: TraceStep[];
  /** 지금까지 한 스텝 수. */
  pos: number;
  values: number[];
  compares: number;
  writes: number;
  /** 직전 스텝이 건드린 자리. */
  active: number[];
}

export interface RaceState {
  n: number;
  pattern: InputPattern;
  /** 처음 배열. 세 줄이 같은 것을 받는다. */
  input: number[];
  seed: number;
  lanes: Lane[];
  running: boolean;
  /** 아직 쓰지 않은 스텝의 소수 부분. */
  carry: number;
  note: string;
}

/**
 * 1초에 진행하는 스텝 수. **세 줄이 같은 값을 쓴다.** 원소 수마다 다르게 두어 10개짜리도 움직임이 보이고,
 * 200개짜리는 예전 화면(한 프레임 60스텝)과 같은 빠르기로 간다.
 */
export const STEPS_PER_SECOND: Record<number, number> = { 10: 40, 50: 600, 200: 3600 };
export const SIZES = [10, 50, 200] as const;

/** mulberry32: 씨앗 하나로 [0, 1) 난수 하나와 다음 씨앗. */
function nextRandom(seed: number): [number, number] {
  const s = (seed + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** 씨앗으로 배열을 만든다. 같은 씨앗이면 같은 배열이다. */
export function inputFromSeed(n: number, pattern: InputPattern, seed: number): number[] {
  let s = seed >>> 0;
  return makeInput(n, pattern, () => {
    const [v, next] = nextRandom(s);
    s = next;
    return v;
  });
}

/** 정렬을 끝까지 돌려 스텝 목록을 적는다. */
export function traceOf(id: AlgorithmId, input: number[]): TraceStep[] {
  const spec = ALGORITHMS.find((a) => a.id === id)!;
  const arr = [...input];
  const out: TraceStep[] = [];
  for (const step of spec.sort(arr)) {
    const [i, j] = step.indices;
    if (step.kind === 'overwrite') out.push({ kind: 'overwrite', i, value: arr[i] });
    else out.push({ kind: step.kind, i, j });
  }
  return out;
}

const laneFor = (id: AlgorithmId, input: number[]): Lane => {
  const spec = ALGORITHMS.find((a) => a.id === id)!;
  return {
    id,
    label: spec.label,
    complexity: spec.complexity,
    trace: traceOf(id, input),
    pos: 0,
    values: [...input],
    compares: 0,
    writes: 0,
    active: [],
  };
};

const READY_NOTE = '세 줄에 같은 배열을 놓았습니다. 출발을 누르면 세 줄이 같은 빠르기로 일합니다.';

export function initialRace(n: number, pattern: InputPattern, seed = 20261022): RaceState {
  const input = inputFromSeed(n, pattern, seed);
  return {
    n,
    pattern,
    input,
    seed: seed >>> 0,
    lanes: ALGORITHMS.map((a) => laneFor(a.id, input)),
    running: false,
    carry: 0,
    note: READY_NOTE,
  };
}

export const laneDone = (l: Lane): boolean => l.pos >= l.trace.length;
export const allDone = (s: RaceState): boolean => s.lanes.every(laneDone);
export const isSettled = (s: RaceState): boolean => !s.running || allDone(s);
/** 세 줄이 함께 한 스텝 수 (가장 오래 일한 줄). */
export const stepsTaken = (s: RaceState): number => Math.max(...s.lanes.map((l) => l.pos));

/** 줄 하나를 k 스텝 진행한다. 끝난 줄은 그대로. */
function stepLane(l: Lane, k: number): Lane {
  if (k <= 0 || laneDone(l)) return l;
  const end = Math.min(l.trace.length, l.pos + k);
  const values = [...l.values];
  let { compares, writes } = l;
  let active: number[] = l.active;
  for (let p = l.pos; p < end; p++) {
    const st = l.trace[p];
    if (st.kind === 'compare') {
      compares += 1;
      active = [st.i, st.j];
    } else if (st.kind === 'swap') {
      const t = values[st.i];
      values[st.i] = values[st.j];
      values[st.j] = t;
      writes += 2;
      active = [st.i, st.j];
    } else {
      values[st.i] = st.value;
      writes += 1;
      active = [st.i];
    }
  }
  return { ...l, pos: end, values, compares, writes, active: end >= l.trace.length ? [] : active };
}

/** 세 줄을 같은 k 스텝씩 진행한다. */
function stepAll(s: RaceState, k: number): RaceState {
  const lanes = s.lanes.map((l) => stepLane(l, k));
  const next = { ...s, lanes };
  if (allDone(next)) return { ...next, running: false, carry: 0, note: finishNote(next) };
  return next;
}

/** 끝난 순서와 비교 횟수. */
function finishNote(s: RaceState): string {
  const order = [...s.lanes].sort((a, b) => a.trace.length - b.trace.length);
  const parts = order.map((l) => `${l.label} ${l.trace.length.toLocaleString('ko-KR')}스텝`);
  return `세 줄 모두 정렬을 마쳤습니다. 끝낸 순서: ${parts.join(', ')}.`;
}

/** 시간이 dt 초 흐른 뒤. 바뀐 것이 없으면 s 를 그대로 돌려준다. */
export function advanceRace(s: RaceState, dt: number): RaceState {
  if (isSettled(s) || dt <= 0) return s;
  const total = s.carry + STEPS_PER_SECOND[s.n] * dt;
  const k = Math.floor(total);
  const moved = stepAll({ ...s, carry: total - k }, k);
  return moved;
}

/* ---------- 버튼 ---------- */

/** 버튼 "출발" / "멈춤". 다 끝났으면 상태는 그대로 두고 새 배열을 받으라고 알린다. */
export function toggleRun(s: RaceState): RaceState {
  if (allDone(s)) return { ...s, note: '세 줄 모두 정렬이 끝났습니다. 새 배열을 받아 다시 출발해 보세요.' };
  if (s.running) return { ...s, running: false, note: `멈췄습니다. 지금까지 ${stepsTaken(s).toLocaleString('ko-KR')}스텝을 했습니다.` };
  return { ...s, running: true, note: '세 줄이 같은 빠르기로 출발했습니다. 먼저 끝나는 줄이 할 일이 적은 줄입니다.' };
}

/** 버튼 "한 스텝": 멈추고 세 줄을 한 스텝씩 진행한다. */
export function stepOnce(s: RaceState): RaceState {
  if (allDone(s)) return { ...s, note: '세 줄 모두 정렬이 끝났습니다. 새 배열을 받아 다시 해 보세요.' };
  const next = stepAll({ ...s, running: false, carry: 0 }, 1);
  if (allDone(next)) return next;
  const parts = next.lanes.map((l) => `${l.label} ${laneDone(l) ? '끝' : stepWord(l.trace[l.pos - 1])}`);
  return { ...next, note: `한 스텝: ${parts.join(' · ')}` };
}

const stepWord = (st: TraceStep | undefined) =>
  !st ? '대기' : st.kind === 'compare' ? '비교' : st.kind === 'swap' ? '교환' : '덮어쓰기';

/** 버튼 "새 배열": 같은 원소 수·패턴으로 새 배열을 세 줄에 놓는다. */
export const newArray = (s: RaceState, seed: number): RaceState => ({
  ...initialRace(s.n, s.pattern, seed),
  note: '새 배열을 세 줄에 똑같이 놓았습니다.',
});

/** 지금 누를 차례인 버튼. 달리는 동안은 강조하지 않는다. */
export function nextAction(s: RaceState): 'start' | 'reset' | null {
  if (allDone(s)) return 'reset';
  return s.running ? null : 'start';
}
