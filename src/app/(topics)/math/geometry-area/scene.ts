export const SCALE = 68;                          // px per unit
export const ORIGIN = { x: 88, y: 440 } as const; // 캔버스 픽셀 기준 원점
export const CANVAS = { width: 520, height: 520 } as const;

export const toCanvasX = (x: number) => ORIGIN.x + x * SCALE;
export const toCanvasY = (y: number) => ORIGIN.y - y * SCALE;

export const GEOMETRY = {
  quarter:  { center: [0, 0], radius: 6 },
  bottom:   { center: [3, 0], radius: 3 },
  hanging:  { center: [0, 4], radius: 2 },   // x=2 해를 대입한 값
  triangle: [[0, 0], [3, 0], [0, 4]],
  areas: { quarter: 9, bottom: 4.5, hanging: 2, red: 2.5 }, // 단위: π
} as const;
