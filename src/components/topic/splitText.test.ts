import { describe, expect, it } from 'vitest';
import { box, frameFor, tag, tx, withFrame, PALS } from '@/lib/colorfigures/core';
import { splitText } from '@/lib/colorfigures/fonts';

describe('splitText', () => {
  it('이름표 묶음과 낱 글자를 그림에서 떼어 내고, 그림은 그대로 둔다', () => {
    withFrame(frameFor([10, 10, 10], 's'), () => {
      const body = box(0, 0, 0, 5, 5, 5, PALS.mint);
      const label = tx(5, 2, 2, '원 안', 3);
      const pill = tag([1, 1, 1], 10, -10, '펜');
      const { art, text } = splitText(body + label + body + pill);
      expect(art).toBe(body + body);
      expect(text).toBe(label + pill);
      expect(art).not.toContain('<text');
    });
  });

  it('글자가 없으면 그림을 그대로 돌려준다', () => {
    expect(splitText('<path d="M0 0"/>')).toEqual({ art: '<path d="M0 0"/>', text: '' });
  });
});
