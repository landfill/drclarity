/*
 * 돌림판 figure 의 상태. 그리기는 wheelScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 그대로):
 *   1. 문맥과 temperature 로 후보의 확률을 정한다(softmax.ts 의 applyTemperature). 돌림판의 칸 넓이가 그 확률이다.
 *      '한 후보에 몰기'(0.2) · '여러 후보에 나누기'(2) 는 바깥 값이라, 바뀌면 figure 를 새로 마운트해 집계를 비운다.
 *   2. "한 번 뽑기" · "20번 뽑기": [0, 1) 난수 r 마다 판을 돌려, 위쪽 바늘이 누적 확률 r 의 자리를 가리키게 멈춘다.
 *      바늘이 가리킨 칸이 sampleFrom(probs, r) 이 고른 후보다. 멈출 때마다 그 후보의 횟수가 하나 는다.
 *   3. 같은 확률에서도 다른 후보가 뽑힐 수 있음을 횟수로 확인한다.
 * 난수는 버튼을 누를 때 바깥에서 만들어 넘긴다 (상태 함수는 순수하게 둔다).
 */
import { sampleFrom } from './softmax';

/** 한 번 뽑을 때 도는 시간, 20번 뽑기에서 한 번에 도는 시간 (초). */
const SINGLE_SECONDS = 1.1;
const BATCH_SECONDS = 0.16;
/** 20번 뽑기의 횟수. */
export const BATCH_SIZE = 20;
/** 두 temperature 버튼 (예전 화면 그대로). */
export const FOCUS_T = 0.2;
export const SPREAD_T = 2;

export interface Spin {
  pick: number;
  /** 멈출 판 각도 (도). */
  to: number;
}

export interface WheelState {
  probs: number[];
  /** 지금 판 각도 (도). 판이 시계 방향으로 돈다. */
  rot: number;
  /** 지금 도는 회전의 시작 각도와 진행도. */
  from: number;
  t: number;
  /** 지금 도는 회전 (없으면 null) 과 기다리는 회전들. */
  spin: Spin | null;
  queue: Spin[];
  seconds: number;
  tally: number[];
  last: number | null;
  note: string;
}

export const initialWheel = (probs: number[]): WheelState => ({
  probs,
  rot: 0,
  from: 0,
  t: 1,
  spin: null,
  queue: [],
  seconds: SINGLE_SECONDS,
  tally: probs.map(() => 0),
  last: null,
  note: '',
});

export const isSettled = (s: WheelState) => s.spin === null && s.queue.length === 0;

/** 누적 확률 r 의 자리 (판 위 각도, 위에서 시계 방향). */
export const angleOf = (r: number) => r * 360;

/** 판을 rot 만큼 돌렸을 때 위쪽 바늘이 가리키는 판 위 각도. */
export const pointerAt = (rot: number) => (((-rot) % 360) + 360) % 360;

/** r 을 바늘 아래로 가져오는 다음 멈춤 각도: 지금 각도에서 시계 방향으로 turns 바퀴 이상 더 돈다. */
export function stopAngle(rot: number, r: number, turns: number): number {
  const want = -angleOf(r);
  let to = want + Math.ceil((rot - want) / 360) * 360;
  while (to <= rot) to += 360;
  return to + turns * 360;
}

const ease = (t: number) => 1 - (1 - t) ** 3;

/** 판 각도 (도는 중이면 사이 값). */
export const shownRot = (s: WheelState) => (s.spin ? s.from + (s.spin.to - s.from) * ease(Math.min(1, s.t)) : s.rot);

export function advanceWheel(s: WheelState, dt: number): WheelState {
  if (isSettled(s) || dt <= 0) return s;
  if (!s.spin) return s;
  const t = s.t + dt / s.seconds;
  if (t < 1) return { ...s, t };
  // 멈췄다: 바늘이 가리킨 후보의 횟수를 하나 올리고, 기다리는 회전이 있으면 이어서 돈다.
  const tally = s.tally.map((n, i) => (i === s.spin!.pick ? n + 1 : n));
  const [next, ...rest] = s.queue;
  const rot = s.spin.to;
  // 다 멈추면 "도는 중" 이라는 거절 문구는 더 맞지 않으므로 지운다.
  if (!next) return { ...s, rot, from: rot, t: 1, spin: null, tally, last: s.spin.pick, note: '' };
  return { ...s, rot, from: rot, t: 0, spin: next, queue: rest, tally, last: s.spin.pick };
}

/** 뽑기: 난수 r 들마다 한 번씩 돌린다. 판이 도는 중이면 상태를 바꾸지 않고 이유를 알린다. */
export function draw(s: WheelState, rs: number[]): WheelState {
  if (!isSettled(s)) return { ...s, note: '돌림판이 아직 도는 중입니다. 멈춘 뒤 다시 뽑아 보세요.' };
  if (rs.length === 0) return s;
  const batch = rs.length > 1;
  let rot = s.rot;
  const spins = rs.map((r) => {
    const to = stopAngle(rot, r, batch ? 0 : 3);
    rot = to;
    return { pick: sampleFrom(s.probs, r), to };
  });
  const [first, ...rest] = spins;
  return { ...s, from: s.rot, t: 0, spin: first, queue: rest, seconds: batch ? BATCH_SECONDS : SINGLE_SECONDS, note: '' };
}

/** 집계 지우기. 지울 것이 없거나 도는 중이면 이유를 알린다. */
export function clearTally(s: WheelState): WheelState {
  if (!isSettled(s)) return { ...s, note: '돌림판이 아직 도는 중입니다. 멈춘 뒤 지워 보세요.' };
  if (total(s) === 0) return { ...s, note: '아직 뽑은 결과가 없습니다.' };
  return { ...s, tally: s.probs.map(() => 0), last: null, note: '' };
}

export const total = (s: WheelState) => s.tally.reduce((a, b) => a + b, 0);

/**
 * 지금 누르면 받아들여지는 버튼 (본문: 한 후보에 몰기 / 여러 후보에 나누기를 누른 뒤 20번 뽑아 보세요).
 * temperature 버튼은 바깥 값이라, 지금 temperature 를 함께 받는다.
 */
export function nextAction(s: WheelState, temperature: number): 'focus' | 'spread' | 'draw20' | null {
  if (!isSettled(s)) return null;
  if (total(s) === 0) return temperature === FOCUS_T || temperature === SPREAD_T ? 'draw20' : 'focus';
  if (temperature === FOCUS_T) return 'spread';
  return temperature === SPREAD_T ? null : 'focus';
}

/** 상태 줄의 문구 (예전 화면의 관찰 문구와 방금 뽑힌 단어). */
export function statusText(s: WheelState, words: string[]): string {
  if (s.note) return s.note;
  const top = s.probs.indexOf(Math.max(...s.probs));
  const observation = `가장 유력한 “${words[top]}”의 확률은 ${(s.probs[top] * 100).toFixed(1)}%입니다.`;
  if (!isSettled(s)) return `돌림판이 도는 중입니다. ${observation}`;
  if (s.last === null) return `${observation} 20번 뽑고, 다른 후보도 나오는지 보세요.`;
  return `방금 뽑힌 단어: ${words[s.last]} · 모두 ${total(s)}회 뽑음. ${observation}`;
}
