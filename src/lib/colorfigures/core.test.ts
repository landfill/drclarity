import { describe, expect, it } from 'vitest';
import { P, clipTo, frameFor, inkScale, settle, tag, withFrame, type Vec3 } from './core';

const corners = (size: Vec3): Vec3[] => {
  const out: Vec3[] = [];
  for (const x of [0, size[0]]) for (const y of [0, size[1]]) for (const z of [0, size[2]]) out.push([x, y, z]);
  return out;
};

describe('frameFor', () => {
  it('키가 큰 물체는 원본처럼 4:3 틀을 쓴다', () => {
    const frame = frameFor([62, 65, 88], 'a');
    expect(frame.vbH / frame.vbW).toBeCloseTo(0.75);
  });

  it('납작한 장면은 4:3 보다 낮은 틀을 쓴다', () => {
    const frame = frameFor([84, 156, 10], 'a');
    expect(frame.vbH / frame.vbW).toBeLessThan(0.75);
  });

  it.each([
    [[62, 65, 88]],
    [[90, 130, 232]],
    [[84, 156, 10]],
  ] as [Vec3][])('경계 상자 %j 가 틀 안에 들어온다', (size) => {
    const frame = frameFor(size, 'a');
    withFrame(frame, () => {
      for (const c of corners(size)) {
        const [x, y] = P(...c);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(frame.vbW);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(frame.vbH);
      }
    });
  });
});

describe('withFrame', () => {
  it('figure 마다 clipPath id 접두사가 달라 한 페이지에서 겹치지 않는다', () => {
    const pts: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
    ];
    const a = withFrame(frameFor([10, 10, 10], 'one'), () => clipTo(pts, ''));
    const b = withFrame(frameFor([10, 10, 10], 'two'), () => clipTo(pts, ''));
    expect(a).toContain('id="one-k1"');
    expect(b).toContain('id="two-k1"');
  });

  it('다시 그릴 때마다 clipPath 번호가 1 부터 시작한다', () => {
    const frame = frameFor([10, 10, 10], 'x');
    const draw = () => clipTo([[0, 0, 0], [1, 0, 0], [1, 1, 0]], '') + clipTo([[0, 0, 0], [1, 0, 0], [1, 1, 0]], '');
    expect(withFrame(frame, draw)).toBe(withFrame(frame, draw));
  });

  it('끝나면 앞의 frame 으로 돌아간다', () => {
    const outer = frameFor([10, 10, 10], 'outer');
    withFrame(outer, () => {
      const before = P(1, 2, 3);
      withFrame(frameFor([500, 500, 500], 'inner'), () => P(1, 2, 3));
      expect(P(1, 2, 3)).toEqual(before);
    });
  });
});

describe('inkScale', () => {
  it('stroke-width 를 배율만큼 바꾼다', () => {
    expect(inkScale('<path stroke-width="2"/>', 0.5)).toBe('<path stroke-width="1.00"/>');
  });
});

describe('tag', () => {
  const pillWidth = (svg: string) => Number(/<rect [^>]*? width="([\d.]+)"/.exec(svg)?.[1]);

  it('한글 이름표는 같은 글자 수의 라틴 이름표보다 넓다', () => {
    const frame = frameFor([10, 10, 10], 't');
    const ko = withFrame(frame, () => tag([0, 0, 0], 0, 0, '피자'));
    const en = withFrame(frame, () => tag([0, 0, 0], 0, 0, 'ab'));
    expect(pillWidth(ko)).toBeGreaterThan(pillWidth(en));
  });

  it('글자를 이스케이프한다', () => {
    const svg = withFrame(frameFor([10, 10, 10], 't'), () => tag([0, 0, 0], 0, 0, 'a<b'));
    expect(svg).toContain('a&lt;b');
  });
});

describe('settle', () => {
  it('멈출 때까지 advance 를 반복한다', () => {
    const end = settle(0, (s, dt) => Math.min(1, s + dt), (s) => s >= 1);
    expect(end).toBe(1);
  });
});
