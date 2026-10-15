import { describe, expect, it } from 'vitest';
import { TRAIN, HELD_OUT, fitMemory, fitRule, score } from './evaluation';
describe('training and held-out demonstration', () => {
  it('holds out both IDs and complete inputs', () => {
    expect(new Set([...TRAIN, ...HELD_OUT].map(e => e.id)).size).toBe(10);
    expect(new Set([...TRAIN, ...HELD_OUT].map(e => e.text)).size).toBe(10);
  });
  it('reproduces the displayed memorization/generalization comparison', () => {
    const memory = fitMemory(TRAIN), rule = fitRule(TRAIN);
    expect(score(memory, TRAIN)).toBe(6);
    expect(score(memory, HELD_OUT)).toBe(2);
    expect(score(rule, TRAIN)).toBe(5);
    expect(score(rule, HELD_OUT)).toBe(4);
  });
  it('learns majority from supplied training labels instead of hardcoding rain', () => {
    const reversed = TRAIN.map(e => ({ ...e, label: (1 - e.label) as 0 | 1 }));
    expect(fitRule(reversed)(HELD_OUT[0])).toBe(0);
    expect(fitRule(reversed)(HELD_OUT[2])).toBe(1);
  });
  it('does not look at held-out labels when predicting', () => {
    for (const fit of [fitMemory, fitRule]) {
      const predict = fit(TRAIN);
      for (const e of HELD_OUT) expect(predict({...e, label: (1-e.label) as 0 | 1})).toBe(predict(e));
    }
  });
});
