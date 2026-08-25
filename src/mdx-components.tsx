import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import { Highlight } from '@/components/layout/TopicLayout';

/**
 * 모든 `.mdx` 파일에서 별도 import 없이 쓸 수 있는 컴포넌트 (#40).
 *
 * 본문을 마크다운으로 쓰는 것이 목적이므로 여기에 올리는 것은
 * **문장 안에서 쓰이는 인라인 장식**으로 제한한다. 레이아웃 컴포넌트
 * (`TopicLayout`, `ExplanationBox`, `SolutionStepper`)는 구조를 결정하므로
 * `*Client.tsx` 에 남긴다.
 *
 * 마크다운 기본 요소(p, ul, li, strong …)는 매핑하지 않는다. `globals.css` 의
 * `* { margin: 0 }` 리셋과 각 CSS 모듈의 `:global(p)` 규칙이 이미 처리한다.
 *
 * `Link` 는 주제끼리 잇는 본문 링크용이다 (#51). 마크다운 링크 문법은 그냥 `<a>` 가
 * 되어 사이트 안 이동에도 페이지가 통째로 다시 뜬다. 바깥 링크는 지금처럼 `<a>` 로 쓴다
 * (§4.6 의 target·rel 규칙).
 */
const components = {
  Highlight,
  Link,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
