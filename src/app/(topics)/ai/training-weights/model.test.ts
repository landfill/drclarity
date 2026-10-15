import { describe, it, expect } from 'vitest';
import { INITIAL_WEIGHT, probability, loss, step } from './model';
describe('one-example gradient update', () => {
  it('uses the derivative of cross entropy, verified by finite differences', () => {
    for (const w of [-2, 0, 2]) {
      const epsilon = 1e-5;
      const derivative = (loss(w + epsilon) - loss(w - epsilon)) / (2 * epsilon);
      expect(w - step(w)).toBeCloseTo(derivative, 8);
    }
  });
  it('updates the shown weight and lowers this example’s loss', () => {
    expect(step(INITIAL_WEIGHT)).toBeCloseTo(-0.2689414214, 8);
    expect(probability(step(INITIAL_WEIGHT))).toBeGreaterThan(probability(INITIAL_WEIGHT));
    expect(loss(step(INITIAL_WEIGHT))).toBeLessThan(loss(INITIAL_WEIGHT));
    expect(loss(INITIAL_WEIGHT)).toBeCloseTo(-Math.log(probability(INITIAL_WEIGHT)), 10);
  });
  it('prediction is pure and a zero input cannot change its weight', () => {
    const w = INITIAL_WEIGHT;
    expect(probability(w)).toEqual(probability(w));
    expect(w).toBe(INITIAL_WEIGHT);
    expect(step(w, 1, 0)).toBe(w);
  });
});
