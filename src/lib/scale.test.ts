import { describe, expect, it } from 'vitest';
import { logPositionToValue, valueToLogPosition, valueToPercentage } from './scale';

describe('scale utilities', () => {
  it('maps logarithmic slider positions to real values', () => {
    expect(logPositionToValue(0, 1, 100)).toBeCloseTo(1);
    expect(logPositionToValue(500, 1, 100)).toBeCloseTo(10);
    expect(logPositionToValue(1000, 1, 100)).toBeCloseTo(100);
  });

  it('maps logarithmic values back to slider positions', () => {
    expect(valueToLogPosition(1, 1, 100)).toBeCloseTo(0);
    expect(valueToLogPosition(10, 1, 100)).toBeCloseTo(500);
    expect(valueToLogPosition(100, 1, 100)).toBeCloseTo(1000);
  });

  it('positions linear and logarithmic marks correctly', () => {
    expect(valueToPercentage(25, 0, 100, 'linear')).toBeCloseTo(25);
    expect(valueToPercentage(10, 1, 100, 'log')).toBeCloseTo(50);
  });

  it('clamps values outside the configured range', () => {
    expect(logPositionToValue(1200, 1, 100)).toBeCloseTo(100);
    expect(valueToLogPosition(0.5, 1, 100)).toBeCloseTo(0);
    expect(valueToPercentage(120, 0, 100)).toBeCloseTo(100);
  });

  it('rejects invalid bounds and logarithmic values', () => {
    expect(() => valueToPercentage(1, 1, 1)).toThrow();
    expect(() => logPositionToValue(10, 0, 100)).toThrow();
    expect(() => valueToLogPosition(0, 1, 100)).toThrow();
  });
});
