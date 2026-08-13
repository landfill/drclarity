import { describe, it, expect } from 'vitest';
import { toCanvasX, toCanvasY, GEOMETRY, CANVAS } from './scene';

describe('geometry-area scene', () => {
  it('toCanvasX and toCanvasY calculate correctly', () => {
    expect(toCanvasX(0)).toBe(40);
    expect(toCanvasX(6)).toBe(340);
    expect(toCanvasY(0)).toBe(360);
    expect(toCanvasY(6)).toBe(60);
  });

  it('all shapes fit inside 400x400 canvas', () => {
    // Origin is at (40, 360)
    // Max X is 6 -> 340 <= 400
    // Max Y is 6 -> 60 >= 0
    // Label at x=-0.8 -> 40 + (-0.8)*50 = 40 - 40 = 0
    expect(toCanvasX(-0.8)).toBe(0);
    expect(toCanvasX(6)).toBeLessThanOrEqual(CANVAS.width);
    expect(toCanvasY(6)).toBeGreaterThanOrEqual(0);
  });

  it('pythagoras equation yields exactly 2', () => {
    // 3^2 + (6-x)^2 = (3+x)^2
    // 9 + 36 - 12x + x^2 = 9 + 6x + x^2
    // 36 = 18x
    // x = 2
    const checkEq = (x: number) => 9 + Math.pow(6 - x, 2) === Math.pow(3 + x, 2);
    expect(checkEq(2)).toBe(true);
  });

  it('area calculations match', () => {
    const { quarter, bottom, hanging, red } = GEOMETRY.areas;
    expect(quarter - bottom - hanging).toBe(red);
  });
});
