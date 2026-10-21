/*
 * 꿀 나누기 figure 의 상태. 그리기는 dropperScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 4단계):
 *   0. 나무판에 눕혀 둔 스포이트를 집어 꿀통 위로 든다.
 *   1. 스포이트로 고른 꿀통에서 꿀을 뜬다.
 *   2. 이름표의 자리가 1인 개미의 혼합 컵으로 옮겨 한 방울 떨어뜨린다. A 부터 E 까지 차례로.
 *      자리가 0인 개미의 컵은 건너뛴다.
 *   3. 스포이트를 꿀통 위로 가져와 나무판에 다시 눕혀 둔다.
 * 개미는 이 단계에서 아무것도 먹지 않는다. 먹이고 1시간 뒤 판독하는 일은 뒤의 단계다.
 *
 * 움직임은 시간표 한 줄(구간 목록)로 정한다. t 초에서의 스포이트 자리와 컵에 든 방울은 모두 t 에서 계산한다.
 */
import { ANT_BITS, ANT_LABELS, antsForPot, toBinary5 } from './binary';

export type Segment =
  | { kind: 'pick'; dur: number }
  | { kind: 'place'; dur: number }
  | { kind: 'dip'; dur: number }
  | { kind: 'move'; from: number | 'pot'; to: number | 'pot'; dur: number }
  | { kind: 'drop'; cup: number; dur: number };

/** 꿀통에서 뜨는 시간, 컵 사이를 옮기는 시간, 한 방울이 떨어지는 시간 (초). */
export const DIP_SECONDS = 0.5;
export const MOVE_SECONDS = 0.6;
export const DROP_SECONDS = 0.45;
export const PICK_SECONDS = 0.6;

/** 이 꿀통의 꿀을 받을 컵 (0 = A … 4 = E). */
export const targetCups = (pot: number): number[] => {
  const bits = antsForPot(pot);
  return ANT_BITS.map((bit, i) => (bits.includes(bit) ? i : -1)).filter((i) => i >= 0);
};

/** 한 꿀통을 다 나누는 시간표. */
export function timeline(pot: number): Segment[] {
  const out: Segment[] = [
    { kind: 'pick', dur: PICK_SECONDS },
    { kind: 'dip', dur: DIP_SECONDS },
  ];
  let at: number | 'pot' = 'pot';
  for (const cup of targetCups(pot)) {
    out.push({ kind: 'move', from: at, to: cup, dur: MOVE_SECONDS });
    out.push({ kind: 'drop', cup, dur: DROP_SECONDS });
    at = cup;
  }
  out.push({ kind: 'move', from: at, to: 'pot', dur: MOVE_SECONDS });
  out.push({ kind: 'place', dur: PICK_SECONDS });
  return out;
}

export const totalSeconds = (pot: number): number => timeline(pot).reduce((s, g) => s + g.dur, 0);

/** t 초에 진행 중인 구간과 그 구간 안의 진행 0..1. t 가 끝을 넘으면 마지막 구간의 끝. */
export function segmentAt(pot: number, t: number): { seg: Segment; u: number; index: number } {
  const segs = timeline(pot);
  let start = 0;
  for (let i = 0; i < segs.length; i++) {
    const end = start + segs[i].dur;
    if (t < end) return { seg: segs[i], u: (t - start) / segs[i].dur, index: i };
    start = end;
  }
  return { seg: segs[segs.length - 1], u: 1, index: segs.length - 1 };
}

/** t 초까지 방울이 다 떨어진 컵. */
export function filledCups(pot: number, t: number): number[] {
  const out: number[] = [];
  let start = 0;
  for (const seg of timeline(pot)) {
    start += seg.dur;
    if (seg.kind === 'drop' && t >= start) out.push(seg.cup);
  }
  return out;
}

/* ---------- 상태 ---------- */

export interface DropperState {
  pot: number;
  /** 나누기 시작 뒤 흐른 시간 (초). null 이면 아직 시작하지 않았다. */
  t: number | null;
  note: string;
}

const names = (cups: number[]) => cups.map((i) => ANT_LABELS[i]).join('·');
const startNote = (pot: number) =>
  `${pot}번 꿀통의 이름표는 ${toBinary5(pot)}입니다. 자리가 1인 개미의 컵에만 한 방울씩 넣습니다.`;

/** 꿀통 하나를 골라 둔, 컵이 모두 빈 상태. */
export const initialDropper = (pot: number): DropperState => ({ pot, t: null, note: startNote(pot) });

export const isSettled = (s: DropperState): boolean => s.t === null || s.t >= totalSeconds(s.pot);

/** 시간이 dt 초 흐른 뒤. 방울이 컵에 닿을 때마다 상태 문구를 바꾼다. */
export function advanceDropper(s: DropperState, dt: number): DropperState {
  if (isSettled(s) || s.t === null) return s;
  const total = totalSeconds(s.pot);
  const t = Math.min(total, s.t + dt);
  const before = filledCups(s.pot, s.t);
  const after = filledCups(s.pot, t);
  let note = s.note;
  if (after.length > before.length) note = `${ANT_LABELS[after[after.length - 1]]}의 컵에 ${s.pot}번 꿀을 한 방울 넣었습니다.`;
  if (t >= total) note = doneNote(s.pot);
  return { ...s, t, note };
}

function doneNote(pot: number): string {
  const yes = targetCups(pot);
  const no = ANT_LABELS.map((_, i) => i).filter((i) => !yes.includes(i));
  const skipped = no.length ? ` ${names(no)}의 컵에는 넣지 않았습니다.` : '';
  return `${names(yes)}의 컵에 ${pot}번 꿀이 한 방울씩 들어갔습니다.${skipped}`;
}

/* ---------- 버튼 ---------- */

/** 버튼 "한 방울씩 나누기". */
export function startDropping(s: DropperState): DropperState {
  if (s.t !== null && s.t < totalSeconds(s.pot)) return { ...s, note: '나누는 중입니다.' };
  if (s.t !== null) return { ...s, note: `${s.pot}번 꿀은 이미 나눴습니다. "컵 비우기"를 누르면 처음부터 다시 볼 수 있습니다.` };
  return { ...s, t: 0, note: `스포이트로 ${s.pot}번 꿀통에서 꿀을 뜹니다.` };
}

/** 버튼 "컵 비우기". */
export const emptyCups = (s: DropperState): DropperState => initialDropper(s.pot);

/** 지금 누를 차례인 버튼. 나누는 동안에는 없다 (다시 누르면 거절되므로 강조하지 않는다). */
export function nextAction(s: DropperState): 'drop' | 'empty' | null {
  if (s.t === null) return 'drop';
  return isSettled(s) ? 'empty' : null;
}
