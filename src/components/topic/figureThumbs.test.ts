import { describe, expect, it } from 'vitest';
import { frameFor, inkScale, withFrame } from '@/lib/colorfigures/core';
import { getTopics } from '@/content/registry';
import { tightBox, withoutTags } from './FigureThumb';
import { FIGURE_THUMBS } from './figureThumbs';

describe('FIGURE_THUMBS', () => {
  it('키마다 실제 주제가 있다', () => {
    const keys = new Set(getTopics().map((t) => `${t.categoryId}/${t.slug}`));
    for (const key of Object.keys(FIGURE_THUMBS)) expect(keys.has(key), key).toBe(true);
  });

  it('첫 장면을 숫자 오류 없이 그리고, 이름표는 걷어 낸다', () => {
    for (const [key, spec] of Object.entries(FIGURE_THUMBS)) {
      const frame = frameFor(spec.size, 't', { view: spec.view });
      const svg = withFrame(frame, () => withoutTags(inkScale(spec.scene())));
      expect(svg, key).not.toMatch(/NaN|undefined|Infinity/);
      expect(svg, key).not.toContain('class="tag');
      expect(svg.length, key).toBeGreaterThan(1000);
    }
  });

  it('카드용 viewBox 는 유한한 네 수다', () => {
    for (const [key, spec] of Object.entries(FIGURE_THUMBS)) {
      const box = withFrame(frameFor(spec.size, 't', { view: spec.view }), () => tightBox(spec.size)).split(' ').map(Number);
      expect(box, key).toHaveLength(4);
      for (const v of box) expect(Number.isFinite(v), key).toBe(true);
      expect(box[2], key).toBeGreaterThan(0);
      expect(box[3], key).toBeGreaterThan(0);
    }
  });
});
