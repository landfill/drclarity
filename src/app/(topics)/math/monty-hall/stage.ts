/*
 * 몬티 홀 무대 figure 의 상태. 그리기는 stageScene.ts 가 맡는다.
 *
 * 실제 순서:
 *   0. 무대 뒤에서 자동차 한 대와 염소 두 마리를 세 문 뒤에 놓는다. 문은 모두 닫혀 있다.
 *   1. 내가 문 하나를 고른다. 문은 아직 모두 닫혀 있다.
 *   2. 자동차가 어디 있는지 아는 사회자가, 내가 고르지 않은 문 중 염소가 있는 문 하나를 연다.
 *   3. 내가 바꿀지 유지할지 정한다. 그러면 남은 문이 모두 열린다.
 *   4. 새 판: 문이 모두 닫힌 뒤에 무대 뒤에서 상품을 다시 놓는다.
 *
 * 상품 자리와 사회자의 선택은 판을 시작할 때 미리 뽑아 둔다. 그래서 버튼 동작은 모두 순수 함수이고,
 * 테스트에서 난수를 주입해 결정적으로 확인할 수 있다.
 */
import {
  DOOR_COUNT,
  chooseOpenDoor,
  switchTarget,
  type DoorIndex,
  type Rng,
  type Strategy,
} from './montyHall';

/** 문 하나가 끝까지 열리거나 닫히는 시간 (초). */
export const DOOR_SECONDS = 0.9;

export interface Tally {
  rounds: number;
  switchWins: number;
  stayWins: number;
}

export interface StageState {
  /** 지금 무대 뒤에 자동차가 놓인 문. */
  carDoor: DoorIndex;
  /** 사회자가 열 문을 고를 때 쓰는 난수 (0 이상 1 미만). 후보가 둘일 때만 쓰인다. */
  hostRoll: number;
  /** 다음 판에 자동차를 놓을 문과 그 판의 hostRoll. 문이 모두 닫히면 그때 놓는다. */
  pending: { carDoor: DoorIndex; hostRoll: number } | null;
  picked: DoorIndex | null;
  /** 사회자가 연 문. */
  opened: DoorIndex | null;
  final: Strategy | null;
  /** 문마다 열린 정도 0..1 과 목표. */
  door: number[];
  doorTarget: number[];
  tally: Tally;
  note: string;
}

const closed = () => Array.from({ length: DOOR_COUNT }, () => 0);
const randomDoor = (rng: Rng): DoorIndex => Math.min(DOOR_COUNT - 1, Math.floor(rng() * DOOR_COUNT));

const PICK_NOTE = '문을 하나 고르세요. 세 문 중 하나 뒤에 자동차가, 나머지 둘 뒤에 염소가 있습니다.';

/** 첫 판. 상품 자리와 사회자의 난수를 rng 로 뽑는다. */
export function initialStage(rng: Rng = Math.random): StageState {
  return {
    carDoor: randomDoor(rng),
    hostRoll: rng(),
    pending: null,
    picked: null,
    opened: null,
    final: null,
    door: closed(),
    doorTarget: closed(),
    tally: { rounds: 0, switchWins: 0, stayWins: 0 },
    note: PICK_NOTE,
  };
}

/** 움직이는 문이 하나라도 있는가. */
const doorsMoving = (s: StageState) => s.door.some((d, i) => d !== s.doorTarget[i]);

/** 더 움직일 것이 없는가. */
export const isSettled = (s: StageState): boolean => !doorsMoving(s) && s.pending === null;

/** 시간이 dt 초 흐른 뒤. 문이 모두 닫히면 다음 판의 상품을 그때 놓는다. */
export function advanceStage(s: StageState, dt: number): StageState {
  if (isSettled(s)) return s;
  let n = s;
  if (doorsMoving(n)) {
    const step = dt / DOOR_SECONDS;
    n = {
      ...n,
      door: n.door.map((d, i) => {
        const t = n.doorTarget[i];
        return d < t ? Math.min(t, d + step) : Math.max(t, d - step);
      }),
    };
  }
  if (n.pending && n.door.every((d) => d === 0) && n.doorTarget.every((d) => d === 0)) {
    n = { ...n, carDoor: n.pending.carDoor, hostRoll: n.pending.hostRoll, pending: null };
  }
  return n;
}

/** 최종으로 고른 문. 아직 정하지 않았으면 null. */
export function finalDoor(s: StageState): DoorIndex | null {
  if (s.final === null || s.picked === null || s.opened === null) return null;
  return s.final === 'switch' ? switchTarget(s.picked, s.opened) : s.picked;
}

/* ---------- 버튼 ---------- */

/** 버튼 "N번 문". 사회자가 문을 열기 전까지는 고른 문을 바꿀 수 있다. */
export function pickDoor(s: StageState, door: DoorIndex): StageState {
  if (s.pending) return { ...s, note: '문이 닫히는 중입니다. 다 닫히면 다시 고를 수 있습니다.' };
  if (s.final !== null) return { ...s, note: '이번 판은 끝났습니다. "한 판 더"를 누르면 다시 고를 수 있습니다.' };
  if (s.opened !== null) {
    return { ...s, note: '사회자가 문을 연 뒤에는 "바꾸기"나 "유지하기"로 정합니다.' };
  }
  if (s.picked === door) return { ...s, note: `${door + 1}번 문을 이미 골랐습니다. 이제 사회자가 문을 엽니다.` };
  return { ...s, picked: door, note: `${door + 1}번 문을 골랐습니다. 문은 아직 모두 닫혀 있습니다.` };
}

/** 버튼 "사회자가 문 열기". */
export function hostOpens(s: StageState): StageState {
  if (s.pending) return { ...s, note: '문이 닫히는 중입니다. 새 판에서 문부터 고르세요.' };
  if (s.picked === null) return { ...s, note: '먼저 문을 하나 고르세요. 사회자는 내가 고르지 않은 문만 엽니다.' };
  if (s.opened !== null) return { ...s, note: `사회자는 이미 ${s.opened + 1}번 문을 열었습니다. 이제 바꿀지 유지할지 정하세요.` };
  const opened = chooseOpenDoor(s.carDoor, s.picked, () => s.hostRoll);
  return {
    ...s,
    opened,
    doorTarget: s.doorTarget.map((t, i) => (i === opened ? 1 : t)),
    note: `자동차가 어디 있는지 아는 사회자가, 내가 고르지 않은 문 중 염소가 있는 ${opened + 1}번 문을 엽니다.`,
  };
}

/** 바꾸기·유지하기를 지금 할 수 없으면 그 이유, 할 수 있으면 null. */
function decideBlocked(s: StageState): string | null {
  if (s.pending) return '문이 닫히는 중입니다. 새 판에서 문부터 고르세요.';
  if (s.picked === null) return '먼저 문을 하나 고르세요.';
  if (s.opened === null) return '사회자가 문을 하나 연 뒤에 바꿀지 유지할지 정합니다.';
  if (s.door[s.opened] < 1) return '사회자가 문을 여는 중입니다. 다 열린 뒤에 정하세요.';
  if (s.final !== null) return '이번 판은 끝났습니다. "한 판 더"를 누르면 새 판이 시작됩니다.';
  return null;
}

/** 버튼 "바꾸기" / "유지하기". 남은 문이 모두 열리고 이번 판이 기록된다. */
export function decide(s: StageState, strategy: Strategy): StageState {
  const blocked = decideBlocked(s);
  if (blocked) return { ...s, note: blocked };
  const picked = s.picked as DoorIndex;
  const opened = s.opened as DoorIndex;
  const target = strategy === 'switch' ? switchTarget(picked, opened) : picked;
  const won = target === s.carDoor;
  const how = strategy === 'switch' ? `${target + 1}번으로 바꾼` : `${target + 1}번을 유지한`;
  return {
    ...s,
    final: strategy,
    doorTarget: s.doorTarget.map(() => 1),
    tally: {
      rounds: s.tally.rounds + 1,
      switchWins: s.tally.switchWins + (strategy === 'switch' && won ? 1 : 0),
      stayWins: s.tally.stayWins + (strategy === 'stay' && won ? 1 : 0),
    },
    note: `${won ? '자동차를 얻었습니다.' : '염소였습니다.'} ${how} 결과입니다. 자동차는 ${s.carDoor + 1}번 문 뒤에 있었습니다.`,
  };
}

/** 버튼 "한 판 더". 문을 모두 닫고, 다 닫히면 상품을 새로 놓는다. 끝나지 않은 판은 기록하지 않는다. */
export function newRound(s: StageState, rng: Rng = Math.random): StageState {
  if (s.final === null && s.picked === null) return { ...s, note: PICK_NOTE };
  return {
    ...s,
    pending: { carDoor: randomDoor(rng), hostRoll: rng() },
    picked: null,
    opened: null,
    final: null,
    doorTarget: closed(),
    note: '문을 모두 닫고 무대 뒤에서 상품을 다시 놓습니다. ' + PICK_NOTE,
  };
}

/**
 * 지금 누를 차례인 버튼. 문이 움직이는 동안에는 다음 단계 버튼이 입력을 받지 않으므로 강조하지 않는다(null).
 * 결과가 나온 뒤의 "한 판 더" 는 문이 열리는 중에도 누를 수 있어 그대로 강조한다.
 */
export function nextAction(s: StageState): 'pick' | 'host' | 'decide' | 'again' | null {
  if (s.final !== null) return 'again';
  if (!isSettled(s)) return null;
  if (s.opened !== null) return 'decide';
  if (s.picked !== null) return 'host';
  return 'pick';
}

/** 문 하나가 지금 보여 주는 것. 그림의 접근성 이름에 쓴다. */
export function describeDoor(s: StageState, door: DoorIndex): string {
  const parts = [`${door + 1}번 문`];
  if (s.door[door] >= 1) parts.push(door === s.carDoor ? '열림, 자동차' : '열림, 염소');
  else if (s.door[door] > 0) parts.push(s.doorTarget[door] > 0 ? '열리는 중' : '닫히는 중');
  else parts.push('닫힘');
  const fd = finalDoor(s);
  if (fd === door) parts.push('최종 선택');
  else if (s.picked === door) parts.push(s.final === 'switch' ? '처음 고른 문' : '내가 고른 문');
  if (s.opened === door) parts.push('사회자가 연 문');
  return parts.join(' ');
}
