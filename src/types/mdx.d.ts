/**
 * `.mdx` 파일의 named export 타입 (#40).
 *
 * `@types/mdx` 는 default export(본문 컴포넌트)만 선언한다. 파일별 named export
 * 는 자동으로 타입이 붙지 않으므로 여기서 ambient module 선언을 병합해 보충한다.
 *
 * 아래 이름은 **선언만** 한다. 실제로 export 하지 않은 파일에서 import 하면
 * 번들러가 잡아내므로, 타입이 느슨해도 없는 값을 읽는 사고로는 이어지지 않는다.
 */
declare module '*.mdx' {
  /** 단계별 힌트. `SolutionStepper` 가 '직접 확인:' 줄로 렌더한다. */
  export const hint: string;
  /** 수식 강조 줄. `SolutionStepper` 가 .math-formula 스타일로 렌더한다. */
  export const formula: string;
}
