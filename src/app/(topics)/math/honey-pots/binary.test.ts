import { describe, it, expect } from 'vitest';
import { 
  toBinary5, 
  potsForAnt, 
  antsForPot, 
  decodeDeadAnts, 
  MAX_NON_ZERO_CODE,
  OUTCOME_COUNT,
  POT_COUNT 
} from './binary';

describe('binary.ts for honey-pots', () => {
  it('round-trip validation', () => {
    for (let pot = 1; pot <= POT_COUNT; pot++) {
      expect(decodeDeadAnts(antsForPot(pot))).toBe(pot);
    }
  });

  it('uniqueness', () => {
    const sets = new Set<string>();
    for (let pot = 1; pot <= POT_COUNT; pot++) {
      const antsStr = antsForPot(pot).join(',');
      expect(sets.has(antsStr)).toBe(false);
      sets.add(antsStr);
    }
  });

  it('toBinary5 works correctly', () => {
    expect(toBinary5(18)).toBe('10010');
    expect(toBinary5(1)).toBe('00001');
    expect(toBinary5(25)).toBe('11001');
  });

  it('maps pot 21 to ants A, C, and E', () => {
    expect(antsForPot(21)).toEqual([16, 4, 1]);
    expect(decodeDeadAnts([16, 4, 1])).toBe(21);
  });

  it('potsForAnt is correct', () => {
    expect(potsForAnt(16)).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
    // Odd numbers
    expect(potsForAnt(1).length).toBe(13); // 1,3,5,7,9,11,13,15,17,19,21,23,25
  });

  it('outcome capacity', () => {
    expect(OUTCOME_COUNT).toBe(32);
    expect(MAX_NON_ZERO_CODE).toBeGreaterThanOrEqual(POT_COUNT);
    expect(MAX_NON_ZERO_CODE).toBe(31);
  });
});
