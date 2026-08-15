import { describe, it, expect } from 'vitest';
import { toCanvasX, toCanvasY, GEOMETRY, CANVAS } from './scene';

describe('geometry-area scene', () => {
  it('toCanvasX and toCanvasY calculate correctly', () => {
    expect(toCanvasX(0)).toBe(70);
    expect(toCanvasX(6)).toBe(370);
    expect(toCanvasY(0)).toBe(340);
    expect(toCanvasY(6)).toBe(40);
  });

  it('all shapes fit inside 400x400 canvas with sufficient label clearance', () => {
    // Origin is at (70, 340)
    // Leftmost label at x=-0.8 ("6-x", center at 30px) has ample clearance to prevent clipping
    const LABEL_HALF_WIDTH = 20; // 18px bold text half-width allowance
    expect(toCanvasX(-0.8)).toBe(30);
    expect(toCanvasX(-0.8) - LABEL_HALF_WIDTH).toBeGreaterThan(0);
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
