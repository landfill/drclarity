/** 정사각형에 던진 점 하나. 좌표는 [-1, 1] 범위다. */
export interface Dart {
  x: number;
  y: number;
  inside: boolean;
}

/**
 * 원점 중심 반지름 1인 원 안에 있는가.
 *
 * 경계(x² + y² = 1)는 안쪽으로 친다. 경계에 정확히 떨어질 확률은 0 이라
 * 추정값에는 영향이 없지만, 판정이 한쪽으로 정해져 있어야 테스트가 가능하다.
 */
export function isInsideCircle(x: number, y: number): boolean {
  return x * x + y * y <= 1;
}

/**
 * 점 하나를 던진다.
 *
 * 난수를 인자로 받는다. 내부에서 Math.random 을 부르면 테스트가 불가능해진다.
 * rand() 는 [0, 1) 을 돌려줘야 하며, 여기서 [-1, 1) 로 옮긴다.
 */
export function throwDart(rand: () => number): Dart {
  const x = rand() * 2 - 1;
  const y = rand() * 2 - 1;
  return { x, y, inside: isInsideCircle(x, y) };
}

/**
 * 원 안의 비율로 π 를 추정한다.
 *
 * 한 변이 2인 정사각형 넓이는 4, 반지름 1인 원 넓이는 π 다. 따라서
 * `원 안 / 전체 ≈ π / 4` 이고 여기에 4 를 곱하면 π 가 된다.
 *
 * 시행이 0 회면 추정값이 존재하지 않으므로 NaN 을 돌려준다. 0 을 돌려주면
 * "π 를 0 으로 추정했다"는 뜻이 되어 화면에 그대로 찍힌다.
 * 호출부는 Number.isFinite 로 걸러야 한다.
 */
export function estimatePi(inside: number, total: number): number {
  if (total <= 0) return NaN;
  return (4 * inside) / total;
}

/** 추정값과 실제 π 의 차이. 표시용. */
export function errorFromPi(estimate: number): number {
  return Math.abs(estimate - Math.PI);
}

/** 원 넓이 / 정사각형 넓이. 원 안에 떨어질 이론 확률이다. */
export const INSIDE_RATE = Math.PI / 4;
