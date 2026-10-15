import { describe, expect, it } from 'vitest';
import { makeNextTokenPair, PIECES } from './pairs';

describe('next-token training pairs', () => {
  it('uses each original token as the target with only its preceding prefix', () => {
    for (let i = 1; i < PIECES.length; i++) {
      const pair = makeNextTokenPair(PIECES, i);
      expect(pair.input).toEqual(PIECES.slice(0, i));
      expect(pair.target).toBe(PIECES[i]);
      // The demonstration has unique pieces, so this catches target/future leakage.
      for (const future of PIECES.slice(i)) expect(pair.input).not.toContain(future);
    }
  });
  it('does not mutate the original document and preserves repeated-token positions', () => {
    const source = Object.freeze(['가', '가', '나']);
    expect(makeNextTokenPair(source, 1)).toEqual({ input: ['가'], target: '가' });
    expect(makeNextTokenPair(source, 2)).toEqual({ input: ['가', '가'], target: '나' });
    expect(source).toEqual(['가', '가', '나']);
  });
  it.each([-1, 0, 5, 1.5, NaN, Infinity])('rejects an invalid target index %s', i => {
    expect(() => makeNextTokenPair(PIECES, i)).toThrow(RangeError);
  });
});
