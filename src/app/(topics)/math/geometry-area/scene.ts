/** 문제의 도형. 길이는 사분원의 반지름 6 을 기준으로 한 값이고, 넓이는 π 의 배수다. */
export const GEOMETRY = {
  quarter:  { center: [0, 0], radius: 6 },
  bottom:   { center: [3, 0], radius: 3 },
  hanging:  { center: [0, 4], radius: 2 },   // x=2 해를 대입한 값
  triangle: [[0, 0], [3, 0], [0, 4]],
  areas: { quarter: 9, bottom: 4.5, hanging: 2, red: 2.5 }, // 단위: π
} as const;
