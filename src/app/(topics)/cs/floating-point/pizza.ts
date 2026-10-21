/*
 * 피자 figure 의 상태와 계산. 그리기는 pizzaScene.ts 가 맡는다.
 *
 * 실제 순서:
 *   1. 10진법 피자를 똑같이 10조각으로 자른다 → 한 조각이 0.1.
 *   2. 그 한 조각을 꺼낸다.
 *   3. 2진법 피자에서는 반으로 자르는 칼질만 쓴다. 남은 자리에 대 볼 조각은 매번 앞 조각의
 *      절반이다 (1/2 → 1/4 → 1/8 …). 남은 자리보다 크면 그대로 두고, 들어가면 꺼내 담는다.
 *      그대로 둔 조각은 다음 칼질에서 다시 반으로 잘린다.
 *   4. 1/4096 조각까지 대 본 뒤 담은 양과 0.1 의 차이를 본다.
 *
 * 양은 피자 한 판을 4096 칸(UNITS)으로 나눈 정수로 센다. 0.1 판은 409.6 칸이라 정수가 아니므로
 * "들어가는가" 는 10 × 칸 ≤ 4096 으로 비교한다. 부동소수점으로 계산하면 이 주제가 다루는
 * 바로 그 오차가 화면 숫자에 섞인다.
 */
import { binaryFractions } from './binaryFractions';

/** 피자 한 판 = 4096 칸 = 1/4096 조각 하나가 1칸. */
export const UNITS = 4096;
/** 대 볼 조각 수 (1/2 … 1/4096). */
export const MAX_TRIES = binaryFractions.length;
/** 10진법 피자를 자르는 조각 수. */
export const DECIMAL_PIECES = 10;

export interface BinaryTry {
  denominator: number;
  /** 대 보는 자리의 시작 (칸). 지금까지 담은 양과 같다. */
  start: number;
  /** 조각 크기 (칸). */
  size: number;
  keep: boolean;
}

/** 처음 steps 번 대 본 결과. */
export function binaryTries(steps: number): BinaryTry[] {
  const out: BinaryTry[] = [];
  let kept = 0;
  for (let k = 1; k <= Math.min(steps, MAX_TRIES); k++) {
    const size = UNITS >> k;
    const keep = 10 * (kept + size) <= UNITS;
    out.push({ denominator: 2 ** k, start: kept, size, keep });
    if (keep) kept += size;
  }
  return out;
}

/** 담은 양 (칸). */
export const keptUnits = (steps: number): number =>
  binaryTries(steps).reduce((sum, t) => (t.keep ? sum + t.size : sum), 0);

/** 2진법 피자에 지금까지 들어간 칼자국 (칸, 0 이상 UNITS 미만, 오름차순). */
export function binaryCuts(steps: number): number[] {
  const cuts = new Set<number>();
  for (const t of binaryTries(steps)) {
    cuts.add(t.start % UNITS);
    cuts.add((t.start + t.size) % UNITS);
  }
  return [...cuts].sort((a, b) => a - b);
}

/** n / 10^decimals 를 끝자리 0 없이 정확히 적는다. n 은 2^53 보다 작은 정수. */
export function formatScaled(n: number, decimals: number): string {
  const digits = String(n).padStart(decimals + 1, '0');
  const int = digits.slice(0, -decimals);
  const frac = digits.slice(-decimals).replace(/0+$/, '');
  return frac ? `${int}.${frac}` : int;
}

const FIVE_12 = 5 ** 12;
/** 칸 수를 판 단위 소수로: units / 4096 = units × 5^12 / 10^12. */
export const unitsText = (units: number): string => formatScaled(units * FIVE_12, 12);
/** 0.1 에서 모자란 양: 0.1 − units/4096 = (4096 − 10·units) × 5^12 / 10^13. */
export const gapText = (units: number): string => formatScaled((UNITS - 10 * units) * FIVE_12, 13);

/* ---------- 상태 ---------- */

export interface PizzaState {
  /** 10진법 피자에 그어진 칼자국 수. 자르는 동안은 소수. */
  decCut: number;
  decCutTarget: number;
  /** 0.1 조각을 꺼낸 정도 0..1. */
  decPull: number;
  decPullTarget: number;
  /** 지금까지 대 본 2진 조각 수. */
  binSteps: number;
  /** 마지막으로 대 본 조각의 움직임 0..1. 1 이면 멈춰 있다. */
  binT: number;
  /** "끝까지 대 보기" 로 이어서 대 보는 중. */
  auto: boolean;
  note: string;
}

/** 아무것도 자르지 않은 처음 상태. */
export const initialPizza = (): PizzaState => ({
  decCut: 0,
  decCutTarget: 0,
  decPull: 0,
  decPullTarget: 0,
  binSteps: 0,
  binT: 1,
  auto: false,
  note: '10진법 피자부터 잘라 보세요.',
});

const CUT_SECONDS = 1.2;
const PULL_SECONDS = 0.7;
const TRY_SECONDS = 0.9;
const AUTO_TRY_SECONDS = 0.6;

/** 더 움직일 것이 없는가 (모든 애니메이션이 목표에 닿았고 이어 대 보는 중도 아니다). */
export const isSettled = (s: PizzaState): boolean =>
  s.decCut === s.decCutTarget &&
  s.decPull === s.decPullTarget &&
  s.binT >= 1 &&
  !s.auto;

/** step 번째로 대 본 조각에 대한 상태 문구. 마지막 조각이면 모자란 양까지 덧붙인다. */
function tryNote(step: number): string {
  const t = binaryTries(step)[step - 1];
  const head = t.keep
    ? `1/${t.denominator} 조각은 남은 자리에 들어갑니다. 꺼내 담습니다.`
    : `1/${t.denominator} 조각은 남은 자리보다 큽니다. 그대로 두고 반으로 더 잘라 봅니다.`;
  if (step < MAX_TRIES) return head;
  return `${head} 1/${t.denominator} 조각까지 담아도 0.1에 ${gapText(keptUnits(step))}만큼 모자랍니다. 몇 번을 더 잘라 담아도 0.1에 딱 맞지는 않습니다.`;
}

/** 다음 2진 조각을 대 보기 시작한다. */
const startTry = (s: PizzaState): PizzaState => {
  const step = s.binSteps + 1;
  return { ...s, binSteps: step, binT: 0, note: tryNote(step) };
};

/** 시간이 dt 초 흐른 뒤. 바뀐 것이 없으면 s 를 그대로 돌려준다. */
export function advancePizza(s: PizzaState, dt: number): PizzaState {
  if (isSettled(s)) return s;
  let n = s;
  if (n.decCut < n.decCutTarget) {
    n = { ...n, decCut: Math.min(n.decCutTarget, n.decCut + (dt * DECIMAL_PIECES) / CUT_SECONDS) };
  } else if (n.decPull < n.decPullTarget) {
    n = { ...n, decPull: Math.min(n.decPullTarget, n.decPull + dt / PULL_SECONDS) };
  }
  if (n.binT < 1) {
    n = { ...n, binT: Math.min(1, n.binT + dt / (n.auto ? AUTO_TRY_SECONDS : TRY_SECONDS)) };
  } else if (n.auto) {
    n = n.binSteps < MAX_TRIES ? startTry(n) : { ...n, auto: false };
  }
  return n;
}

/* ---------- 버튼 ---------- */

/** 버튼 "10조각으로 자르기". */
export function cutDecimal(s: PizzaState): PizzaState {
  if (s.decCutTarget === DECIMAL_PIECES) {
    return {
      ...s,
      note: s.decCut < DECIMAL_PIECES ? '자르는 중입니다.' : '10진법 피자는 이미 10조각으로 잘려 있습니다.',
    };
  }
  return {
    ...s,
    decCutTarget: DECIMAL_PIECES,
    note: '10진법 피자를 똑같이 10조각으로 자릅니다. 한 조각이 정확히 0.1입니다.',
  };
}

/** 버튼 "0.1 조각 꺼내기". 자르기 전이면 이유만 알려 준다. */
export function takeTenth(s: PizzaState): PizzaState {
  if (s.decCutTarget !== DECIMAL_PIECES) {
    return { ...s, note: '먼저 10진법 피자를 10조각으로 잘라야 한 조각을 꺼낼 수 있습니다.' };
  }
  if (s.decPullTarget === 1) return { ...s, note: '0.1 조각은 이미 꺼내 두었습니다.' };
  return {
    ...s,
    decPullTarget: 1,
    note: '0.1 조각을 꺼냈습니다. 이제 2진법 피자에서 반으로 자른 조각만으로 같은 양을 모아 봅니다.',
  };
}

/** 2진 조각을 지금 대 볼 수 없으면 그 이유, 대 볼 수 있으면 null. */
function binaryBlocked(s: PizzaState): string | null {
  if (s.decPullTarget !== 1) return '먼저 10진법 피자에서 0.1 조각을 꺼내 보세요. 그만큼을 2진법 피자로 모아 봅니다.';
  // 버튼을 빠르게 이어 누르면 0.1 조각이 아직 움직이는 중일 수 있다. 다 꺼낸 뒤에 대 본다.
  if (s.decPull < 1) return '0.1 조각을 꺼내는 중입니다. 다 꺼낸 뒤에 2진법 조각을 대 볼 수 있습니다.';
  if (s.binSteps >= MAX_TRIES) return `1/${UNITS} 조각까지 모두 대 봤습니다. 처음부터 다시 해 볼 수 있습니다.`;
  return null;
}

/** 버튼 "반 조각 대 보기": 조각 하나를 대 본다. */
export function tryNext(s: PizzaState): PizzaState {
  const blocked = binaryBlocked(s);
  if (blocked) return { ...s, note: blocked };
  return startTry({ ...s, auto: false });
}

/** 버튼 "끝까지 대 보기": 1/4096 조각까지 이어서 대 본다. */
export function tryAll(s: PizzaState): PizzaState {
  const blocked = binaryBlocked(s);
  if (blocked) return { ...s, note: blocked };
  const n = { ...s, auto: true };
  return n.binT >= 1 ? startTry(n) : n;
}

/** 버튼 "처음부터". */
export const resetPizza = (): PizzaState => initialPizza();

/** 지금 누를 차례인 버튼. 0.1 조각이 아직 나오는 중이면 대 보기가 거절되므로 강조하지 않는다. */
export function nextAction(s: PizzaState): 'cut' | 'take' | 'try' | 'reset' | null {
  if (s.decCutTarget !== DECIMAL_PIECES) return 'cut';
  if (s.decPullTarget !== 1) return 'take';
  if (s.decPull < 1) return null;
  if (s.binSteps < MAX_TRIES) return 'try';
  return 'reset';
}
