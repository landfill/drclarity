import { describe, it, expect } from 'vitest';
import { binaryFractions } from './binaryFractions';

describe('binaryFractions', () => {
  it('greedy algorithm computes correctly', () => {
    let currentSum = 0;
    const target = 0.1;
    let k = 1;

    for (const fraction of binaryFractions) {
      expect(fraction.denominator).toBe(Math.pow(2, k));
      const value = 1 / fraction.denominator;
      
      let shouldKeep = false;
      if (currentSum + value <= target) {
        shouldKeep = true;
        currentSum += value;
      }
      
      expect(fraction.keep).toBe(shouldKeep);
      k++;
    }
    
    // Check if currentSum is indeed approaching 0.1
    expect(currentSum).toBeLessThan(target);
    expect(target - currentSum).toBeLessThan(1 / 4096);
  });
});
