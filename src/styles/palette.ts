/**
 * globals.css `:root` 의 `--color-*` 값과 같은 색표. canvas·OG 이미지처럼 CSS 변수를 읽을 수 없는
 * 곳에서 쓴다. 두 파일이 어긋나지 않는지는 palette.test.ts 가 확인한다.
 * 값은 6자리 hex 로 둔다. `${palette.accent}40` 처럼 알파를 이어 붙이는 코드가 있다.
 */
export const palette = {
  bg: '#f2efe7',
  surface: '#fbf8f0',
  text: '#231e16',
  accent: '#7a5a00',
  'accent-fill': '#f4b829',
  'on-accent': '#231e16',
  'chart-warm': '#f2913a',
  secondary: '#4a6fb0',
  ink: '#231e16',
  muted: '#675f52',
  'muted-2': '#bdb8a6',
  subtle: '#e8e3d6',
  border: '#b9b1a0',
  danger: '#a8381f',
  'danger-soft': '#ef6a4c',
  warm: '#84562a',
  blue: '#2f55a0',
  'blue-soft': '#76a0e2',
  success: '#2a6449',
  dough: '#f3d9a0',
  'note-bg': '#fff4d6',
  'note-border': '#d49c1f',
  'formula-bg': '#f7ecd9',
  'terminal-bg': '#272421',
  'terminal-fg': '#f2efe7',
  'terminal-border': '#55504a',
  'triangle-fill': 'rgba(244, 184, 41, 1)',
  'triangle-stroke': 'rgba(28, 41, 72, 0.6)',
  selection: '#f3d488',
} as const;

export type PaletteKey = keyof typeof palette;
