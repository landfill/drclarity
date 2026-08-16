import { describe, expect, it } from 'vitest';
import {
  logPositionToValue,
  snapValueToStep,
  valueToLogPosition,
  valueToPercentage,
} from './scale';

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
    expect(valueToPercentage(0, -Number.MAX_VALUE, Number.MAX_VALUE)).toBeCloseTo(50);
    expect(
      valueToPercentage(Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE),
    ).toBe(100);
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

  it('rejects non-finite logarithmic scale resolutions', () => {
    expect(() => logPositionToValue(10, 1, 100, Number.NaN)).toThrow();
    expect(() => logPositionToValue(10, 1, 100, Number.POSITIVE_INFINITY)).toThrow();
    expect(() => valueToLogPosition(10, 1, 100, Number.NaN)).toThrow();
    expect(() => valueToLogPosition(10, 1, 100, Number.POSITIVE_INFINITY)).toThrow();
  });

  it('snaps values to a step while preserving range endpoints', () => {
    expect(snapValueToStep(0.26, 0.001, 1, 0.1)).toBeCloseTo(0.301);
    expect(snapValueToStep(1, 0.001, 1, 0.1)).toBe(1);
    expect(snapValueToStep(-1, 0.001, 1, 0.1)).toBe(0.001);
    expect(
      snapValueToStep(1_000_000_000_000_001, 1_000_000_000_000_000, 1_000_000_000_000_010, 1),
    ).toBe(1_000_000_000_000_001);
    expect(snapValueToStep(10.051, 1, 10.06, 0.1)).toBe(10.06);
    expect(snapValueToStep(0.3, 0, 1, 0.2)).toBe(0.4);
    expect(snapValueToStep(1.005, 0, 2, 0.01)).toBe(1.01);
    expect(snapValueToStep(0.4995, 0, 2, 1)).toBe(0);
    expect(snapValueToStep(0.14996, 0, 1, 0.1)).toBe(0.1);
    expect(snapValueToStep(0.92, 0, 0.95, 0.1)).toBe(0.9);
    expect(snapValueToStep(0.94, 0, 0.95, 0.1)).toBe(0.95);
    expect(snapValueToStep(1, 0, 2, Number.MIN_VALUE)).toBe(1);
    expect(
      snapValueToStep(
        Number.MAX_VALUE / 2,
        -Number.MAX_VALUE,
        Number.MAX_VALUE,
        Number.MAX_VALUE / 2,
      ),
    ).toBe(Number.MAX_VALUE / 2);
    expect(
      snapValueToStep(1_000_000_000_000_000, 0, 2_000_000_000_000_000, 1),
    ).toBe(1_000_000_000_000_000);
  });

  it('rejects invalid step values', () => {
    expect(() => snapValueToStep(1, 0, 10, 0)).toThrow();
    expect(() => snapValueToStep(1, 0, 10, Number.NaN)).toThrow();
    expect(() => snapValueToStep(1, 0, 10, Number.POSITIVE_INFINITY)).toThrow();
  });
});
