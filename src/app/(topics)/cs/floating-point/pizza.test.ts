import { describe, expect, it } from 'vitest';
import { settle } from '@/lib/colorfigures/core';
import { binaryFractions } from './binaryFractions';
import {
  MAX_TRIES,
  UNITS,
  advancePizza,
  binaryCuts,
  binaryTries,
  cutDecimal,
  formatScaled,
  gapText,
  initialPizza,
  isSettled,
  keptUnits,
  nextAction,
  takeTenth,
  tryAll,
  tryNext,
  unitsText,
  type PizzaState,
} from './pizza';
import { pizzaScene } from './pizzaScene';

const run = (s: PizzaState) => settle(s, advancePizza, isSettled);

describe('2진 조각 대 보기', () => {
  it('담는 조각이 binaryFractions 와 같다', () => {
    const tries = binaryTries(MAX_TRIES);
    expect(tries.map((t) => t.denominator)).toEqual(binaryFractions.map((f) => f.denominator));
    expect(tries.map((t) => t.keep)).toEqual(binaryFractions.map((f) => f.keep));
  });

  it('담은 조각은 칼자국이 더 들어가지 않고 한 조각으로 남는다', () => {
    const cuts = binaryCuts(MAX_TRIES);
    for (const t of binaryTries(MAX_TRIES).filter((t) => t.keep)) {
      expect(cuts).toContain(t.start);
      expect(cuts).toContain((t.start + t.size) % UNITS);
      expect(cuts.some((c) => c > t.start && c < t.start + t.size)).toBe(false);
    }
  });

  it('1/4096 까지 담은 양과 모자란 양을 정확히 적는다', () => {
    const kept = keptUnits(MAX_TRIES);
    expect(kept).toBe(409);
    expect(unitsText(kept)).toBe('0.099853515625');
    expect(gapText(kept)).toBe('0.000146484375');
    expect(gapText(0)).toBe('0.1');
  });

  // 본문 "몇 번을 더 잘라 담아도 0.1에 딱 맞지는 않습니다" 의 근거:
  // k 번 자른 뒤 담은 양이 n/2^k 이면 0.1 과 같으려면 10n = 2^k 이어야 하는데, 2^k 는 5 로 나누어지지 않는다.
  it('반으로 자르는 횟수를 늘려도 담은 양이 0.1 과 같아지지 않는다', () => {
    let kept = BigInt(0);
    for (let k = 1; k <= 200; k++) {
      const whole = BigInt(2) ** BigInt(k);
      kept *= BigInt(2);
      if (BigInt(10) * (kept + BigInt(1)) <= whole) kept += BigInt(1);
      expect(BigInt(10) * kept).toBeLessThan(whole);
    }
  });
});

describe('formatScaled', () => {
  it.each([
    [1, 1, '0.1'],
    [15, 1, '1.5'],
    [100, 2, '1'],
    [5, 3, '0.005'],
    [0, 4, '0'],
  ])('%i / 10^%i = %s', (n, d, text) => {
    expect(formatScaled(n, d)).toBe(text);
  });
});

describe('버튼 순서', () => {
  it('순서를 건너뛰면 상태는 그대로 두고 이유를 알려 준다', () => {
    const s = initialPizza();
    const early = tryNext(s);
    expect(early.binSteps).toBe(0);
    expect(early.note).toContain('0.1 조각을 꺼내');
    const take = takeTenth(s);
    expect(take.decPullTarget).toBe(0);
    expect(take.note).toContain('10조각으로 잘라야');
  });

  it('0.1 조각이 아직 움직이는 중이면 2진 조각을 대 보지 않는다', () => {
    const pulling = takeTenth(run(cutDecimal(initialPizza())));
    expect(pulling.decPull).toBeLessThan(1);
    for (const action of [tryNext, tryAll]) {
      const s = action(pulling);
      expect(s.binSteps).toBe(0);
      expect(s.auto).toBe(false);
      expect(s.note).toContain('꺼내는 중');
    }
    expect(tryNext(run(pulling)).binSteps).toBe(1);
  });

  it('끝까지 대 보기는 1/4096 조각까지 대 보고 멈춘다', () => {
    let s = run(cutDecimal(initialPizza()));
    s = run(takeTenth(s));
    expect(nextAction(s)).toBe('try');
    s = run(tryAll(s));
    expect(s.binSteps).toBe(MAX_TRIES);
    expect(s.auto).toBe(false);
    expect(nextAction(s)).toBe('reset');
    expect(s.note).toContain(gapText(keptUnits(MAX_TRIES)));
  });

  it('0.1 조각이 나오는 동안에는 대 보기를 강조하지 않는다', () => {
    const pulling = takeTenth(run(cutDecimal(initialPizza())));
    expect(nextAction(pulling)).toBeNull();
    expect(tryNext(pulling).note).toContain('꺼내는 중');
    expect(nextAction(run(pulling))).toBe('try');
  });

  it('멈춘 상태에서는 시간이 흘러도 같은 객체를 돌려준다', () => {
    const s = initialPizza();
    expect(advancePizza(s, 0.1)).toBe(s);
  });
});

describe('pizzaScene', () => {
  it('모든 단계를 숫자 오류 없이 그린다', () => {
    let s = initialPizza();
    const stages: PizzaState[] = [s];
    s = cutDecimal(s);
    for (let i = 0; i < 4; i++) stages.push((s = advancePizza(s, 0.3)));
    s = takeTenth(run(s));
    for (let i = 0; i < 3; i++) stages.push((s = advancePizza(s, 0.25)));
    s = run(s);
    for (let k = 0; k < MAX_TRIES; k++) {
      s = tryNext(s);
      stages.push((s = advancePizza(s, 0.4)));
      stages.push((s = run(s)));
    }
    for (const stage of stages) {
      const svg = pizzaScene(stage);
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});
