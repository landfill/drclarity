/**
 * figure 안 글자의 글꼴.
 *
 * `ColorFigure` 의 SVG 글자는 고정폭 글꼴 묶음(`--font-mono`)을 물려받는다. 숫자만 있는 눈금에는 맞지만,
 * 한글이 섞인 라벨은 라틴 글자가 고정폭으로 벌어져 한 줄 안에서 간격이 들쭉날쭉해진다. AGENTS.md 의 규칙대로
 * 한글이 섞인 글자는 사이트의 일반 글꼴로 쓴다.
 *
 * 엔진의 `tx`·`tag` 는 원본과 같게 글꼴을 정하지 않으므로, 장면을 다 그린 뒤 이 함수로 한 번 거른다.
 * 먼저 만든 figure 넷은 거르지 않는다(지금 모양 그대로 둔다).
 */

/** 사이트의 일반 글꼴 묶음 (globals.css 의 body 와 같다). */
export const GENERAL_FONT = 'var(--font-korean), var(--font-main), sans-serif';

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;

/** 장면 SVG 에서 한글이 든 <text> 마다 일반 글꼴을 준다. 이미 글꼴을 정한 글자는 그대로 둔다. */
export function koreanLabels(svg: string): string {
  return svg.replace(/<text((?:(?!font-family)[^>])*)>([^<]*)<\/text>/g, (whole, attrs: string, body: string) =>
    HANGUL.test(body) ? `<text style="font-family: ${GENERAL_FONT}"${attrs}>${body}</text>` : whole,
  );
}
