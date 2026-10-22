import { describe, expect, it } from 'vitest';
import { GENERAL_FONT, koreanLabels } from './fonts';
import { frameFor, tag, tx, withFrame } from './core';

describe('koreanLabels', () => {
  const frame = frameFor([10, 10, 10], 'f');

  it('한글이 든 글자(tx·tag)는 일반 글꼴로 쓴다', () => {
    withFrame(frame, () => {
      for (const svg of [tx(1, 1, 1, '원 안', 4), tag([0, 0, 0], 10, 10, '이론값 π/4'), tx(1, 1, 1, '비교 1,234 · 이동 5', 4)]) {
        const out = koreanLabels(svg);
        expect(out).toContain(`font-family: ${GENERAL_FONT}`);
        expect((out.match(/<text/g) ?? []).length).toBe((svg.match(/<text/g) ?? []).length);
      }
    });
  });

  it('숫자만 있는 눈금과 이미 글꼴을 정한 글자는 그대로 둔다', () => {
    withFrame(frame, () => {
      const digits = tx(1, 1, 1, '-1', 3);
      expect(koreanLabels(digits)).toBe(digits);
      const mono = tx(1, 1, 1, '한글', 3).replace('<text ', '<text font-family="monospace" ');
      expect(koreanLabels(mono)).toBe(mono);
    });
  });
});
