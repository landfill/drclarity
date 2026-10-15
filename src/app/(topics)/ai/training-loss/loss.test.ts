import { describe, expect, it } from 'vitest';
import { nextTokenLoss } from './loss';

describe('next-token negative log likelihood', () => {
  it('matches the numerical examples displayed in the lesson', () => {
    expect(nextTokenLoss(0.1)).toBeCloseTo(2.302585093);
    expect(nextTokenLoss(0.5)).toBeCloseTo(0.693147181);
    expect(nextTokenLoss(0.9)).toBeCloseTo(0.105360516);
  });
  it('strictly decreases throughout the slider as the correct probability grows', () => {
    let previous = nextTokenLoss(0);
    for (let percent = 1; percent <= 100; percent++) {
      const current = nextTokenLoss(percent / 100);
      expect(current).toBeLessThan(previous);
      expect(current).toBeGreaterThanOrEqual(0);
      previous = current;
    }
  });
  it('represents exact boundaries without clipping zero to a made-up epsilon', () => {
    expect(nextTokenLoss(0)).toBe(Infinity);
    expect(nextTokenLoss(1)).toBe(0);
  });
  it.each([-0.01, 1.01, NaN, Infinity, -Infinity])('rejects non-probability %s', p => {
    expect(() => nextTokenLoss(p)).toThrow(RangeError);
  });
});
