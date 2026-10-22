import { describe, it, expect } from 'vitest';
import { GEOMETRY } from './scene';

describe('geometry-area scene', () => {
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

it('the fixed semicircles share a tangent point and stay attached to the original boundaries', () => {
  const { quarter, bottom, hanging } = GEOMETRY;
  const centerDistance = Math.hypot(
    hanging.center[0] - bottom.center[0],
    hanging.center[1] - bottom.center[1]
  );
  expect(centerDistance).toBe(bottom.radius + hanging.radius);
  expect(hanging.center[0]).toBe(quarter.center[0]);
  expect(hanging.center[1] + hanging.radius).toBe(quarter.radius);
  expect(bottom.center[1]).toBe(quarter.center[1]);
  expect(bottom.center[0] + bottom.radius).toBe(quarter.radius);
});
