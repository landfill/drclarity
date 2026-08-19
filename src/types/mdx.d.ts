/**
 * `.mdx` 파일의 named export 타입 (#40, #42).
 *
 * `@types/mdx` 는 default export(본문 컴포넌트)만 선언한다. 파일별 named export
 * 는 자동으로 타입이 붙지 않으므로 여기서 ambient module 선언을 병합해 보충한다.
 *
 * 아래 이름은 **선언만** 한다. 실제로 export 하지 않은 파일에서 import 하면
 * 번들러가 잡아내므로, 타입이 느슨해도 없는 값을 읽는 사고로는 이어지지 않는다.
 */
declare module '*.mdx' {
  import type { ReactNode } from 'react';

  /**
   * 단계별 힌트. `SolutionStepper` 가 '직접 확인:' 줄로 렌더한다.
   * 평문이면 문자열로, 강조가 필요하면 JSX 로 export 한다.
   */
  export const hint: ReactNode;
  /** 수식 강조 줄. `SolutionStepper` 가 .math-formula 스타일로 렌더한다. */
  export const formula: ReactNode;
  /**
   * 클래스가 붙은 제목의 텍스트. 제목 요소 자체는 CSS 모듈 클래스를 알아야 하므로
   * `*Client.tsx` 에 남기고, 문구만 여기서 넘긴다.
   */
  export const title: string;
  /**
   * 문자열이어야 하는 본문. 타이핑 애니메이션처럼 컴포넌트가 `string` 을 요구해
   * 마크다운으로 컴파일할 수 없는 자리에 쓴다. 강조·링크는 넣지 않는다.
   */
  export const explanation: string;
  /** `QuizGate` 의 선택지. 본문(문제 지문)과 같은 파일에 둔다. */
  export const choices: { id: string; label: ReactNode }[];
}
