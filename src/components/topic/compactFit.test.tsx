import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, type Vec3 } from '@/lib/colorfigures/core';
import { ColorFigure } from './ColorFigure';

const SIZE: Vec3 = [50, 188, 115];
const viewBoxOf = (html: string) => html.match(/viewBox="([^"]+)"/)?.[1];
const render = (compactFit: boolean) =>
  renderToStaticMarkup(
    <ColorFigure size={SIZE} view={FRONT_VIEW} title="t" label="l" scene={() => ''} compactFit={compactFit} actions={[{ label: 'a', onClick: () => {} }]} />,
  );

describe('ColorFigure compactFit', () => {
  it('칸 폭을 재기 전(첫 렌더)과 넓은 칸에서는 지금 4:3 틀 그대로다', () => {
    // 좁은 칸 판정은 effect 에서 칸 폭을 잰 뒤에야 켜진다. 그 전에는 compactFit 이 틀을 바꾸지 않는다.
    expect(viewBoxOf(render(true))).toBe(viewBoxOf(render(false)));
    const base = frameFor(SIZE, 'x', { view: FRONT_VIEW, shiftX: 0.08 });
    expect(viewBoxOf(render(true))).toBe(`0 0 ${base.vbW.toFixed(1)} ${base.vbH.toFixed(1)}`);
  });
});
