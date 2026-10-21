import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { palette, type PaletteKey } from './palette';

const css = readFileSync(resolve(__dirname, '../app/globals.css'), 'utf8');

/** globals.css 첫 `:root` 블록의 `--color-*` 선언을 이름 → 값으로 읽는다. */
function cssColorTokens(): Record<string, string> {
  const root = css.match(/:root\s*\{([^}]*)\}/);
  if (!root) throw new Error('globals.css 에 :root 블록이 없다');
  const tokens: Record<string, string> = {};
  for (const m of root[1].matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  return tokens;
}

/** WCAG 2.x 상대 휘도. 6자리 hex 만 받는다. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 두 색의 WCAG 대비비. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('palette', () => {
  it('globals.css 의 --color-* 토큰과 이름·값이 같다', () => {
    const tokens = cssColorTokens();
    expect(Object.keys(tokens).sort()).toEqual(Object.keys(palette).sort());
    for (const [key, value] of Object.entries(palette)) {
      expect(tokens[key].toLowerCase(), key).toBe(value.toLowerCase());
    }
  });

  it('rgba 가 아닌 값은 모두 6자리 hex 다', () => {
    for (const [key, value] of Object.entries(palette)) {
      if (value.startsWith('rgba(')) continue;
      expect(value, key).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  // 글자색 × 그 글자가 놓이는 바탕. 바탕에 글자를 얹는 조합을 새로 쓰면 여기에 더한다.
  const TEXT_PAIRS: [PaletteKey, PaletteKey[]][] = [
    ['text', ['bg', 'surface', 'subtle', 'note-bg', 'formula-bg']],
    ['ink', ['bg', 'surface', 'subtle', 'note-bg', 'formula-bg', 'accent-fill', 'selection']],
    ['muted', ['bg', 'surface', 'subtle', 'note-bg']],
    ['accent', ['bg', 'surface', 'subtle', 'note-bg']],
    ['on-accent', ['accent-fill']],
    ['danger', ['bg', 'surface', 'subtle', 'note-bg', 'formula-bg']],
    ['success', ['bg', 'surface', 'subtle']],
    ['warm', ['bg', 'surface', 'subtle']],
    ['blue', ['bg', 'surface', 'subtle']],
    ['terminal-fg', ['terminal-bg']],
    // 진한 바탕 위 밝은 글자(버튼)
    ['surface', ['accent', 'blue', 'secondary', 'success', 'danger', 'ink', 'muted']],
  ];

  it.each(TEXT_PAIRS)('%s 글자는 바탕 위에서 WCAG AA(4.5:1) 이상이다', (fg, bgs) => {
    for (const bg of bgs) {
      expect(contrast(palette[fg], palette[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
