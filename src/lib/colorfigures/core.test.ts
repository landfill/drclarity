import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, Dv, FRONT_VIEW, ISO_VIEW, P, PALS, castShadow, clipTo, depthOf, frameFor, inkScale, settle, tag, tone, vis, withFrame, type Vec2, type Vec3, type View } from './core';

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

describe('보는 방향', () => {
  it('ISO_VIEW 는 원본 스킬의 정아이소메트릭 투영과 같다', () => {
    const C = Math.cos(Math.PI / 6);
    const S = Math.sin(Math.PI / 6);
    withFrame(frameFor([10, 10, 10], 'iso', { view: ISO_VIEW }), () => {
      for (const [x, y, z] of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [3, -2, 5]] as Vec3[]) {
        const [u, v] = Dv(x, y, z);
        expect(u).toBeCloseTo((x - y) * C, 9);
        expect(v).toBeCloseTo((x + y) * S - z, 9);
      }
      expect(depthOf([1, 2, 3]) / depthOf([1, 1, 1])).toBeCloseTo(2, 9);
    });
  });

  it('기본 시점은 앞면을 옆면보다 더 정면으로 본다', () => {
    expect(DEFAULT_VIEW.az).toBeLessThan(ISO_VIEW.az);
    withFrame(frameFor([10, 10, 10], 'd'), () => {
      const front = Math.abs(Dv(0, 1, 0)[0]); // 앞면의 가로 길이
      const side = Math.abs(Dv(1, 0, 0)[0]); // 옆면의 가로 길이
      expect(front).toBeGreaterThan(side);
      expect(vis([1, 0, 0]) && vis([0, 1, 0]) && vis([0, 0, 1])).toBe(true);
      expect(vis([-1, 0, 0]) || vis([0, -1, 0]) || vis([0, 0, -1])).toBe(false);
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

/** 화면에 투영한 평행사변형(원점, a, a+b, b)의 넓이. */
const projArea = (a: Vec3, b: Vec3): number => {
  const u: Vec2 = Dv(...a);
  const v: Vec2 = Dv(...b);
  return Math.abs(u[0] * v[1] - u[1] * v[0]);
};

/** 단위 상자의 앞면(+x)·왼쪽 옆면(+y)·윗면(+z)이 화면에서 차지하는 넓이. */
const faceAreas = (view: View) =>
  withFrame(frameFor([1, 1, 1], 'area', { view }), () => ({
    front: projArea([0, 1, 0], [0, 0, 1]),
    side: projArea([1, 0, 0], [0, 0, 1]),
    top: projArea([1, 0, 0], [0, 1, 0]),
  }));

describe('FRONT_VIEW (새 figure 의 시점)', () => {
  it('기존 figure 의 시점 DEFAULT_VIEW 는 { az: 25, el: 30 } 그대로다', () => {
    expect(DEFAULT_VIEW).toEqual({ az: 25, el: 30 });
  });

  it('단위 상자의 앞면·왼쪽 옆면·윗면이 모두 보이고, 뒤쪽 세 면은 보이지 않는다', () => {
    withFrame(frameFor([1, 1, 1], 'f', { view: FRONT_VIEW }), () => {
      expect(vis([1, 0, 0]) && vis([0, 1, 0]) && vis([0, 0, 1])).toBe(true);
      expect(vis([-1, 0, 0]) || vis([0, -1, 0]) || vis([0, 0, -1])).toBe(false);
    });
  });

  // 3배: 방위 18° 의 앞면/옆면 넓이 비는 cot 18° ≈ 3.08 이다. 기본 시점(cot 25° ≈ 2.14)보다 앞면이 넓다.
  it('화면에서 앞면 넓이가 왼쪽 옆면 넓이의 3배 이상이고 기본 시점보다 넓다', () => {
    const a = faceAreas(FRONT_VIEW);
    const d = faceAreas(DEFAULT_VIEW);
    expect(a.front).toBeGreaterThanOrEqual(3 * a.side);
    expect(a.front / a.side).toBeGreaterThan(d.front / d.side);
  });

  it('바닥에 누운 판의 윗면이 앞면 넓이의 0.4배 이상으로 읽힌다', () => {
    const a = faceAreas(FRONT_VIEW);
    expect(a.top).toBeGreaterThanOrEqual(0.4 * a.front);
  });

  it('원본처럼 앞면과 윗면은 밝은 면, 왼쪽 옆면은 그늘이다', () => {
    withFrame(frameFor([1, 1, 1], 'f', { view: FRONT_VIEW }), () => {
      for (const m of Object.values(PALS)) {
        expect(tone([1, 0, 0], m)).toBe(m.l);
        expect(tone([0, 0, 1], m)).toBe(m.l);
        expect(tone([0, 1, 0], m)).toBe(m.d);
      }
    });
  });

  it.each([['FRONT_VIEW', FRONT_VIEW], ['DEFAULT_VIEW', DEFAULT_VIEW]] as [string, View][])(
    '%s 에서 세운 막대의 그림자는 화면 왼쪽(+y 쪽)으로 떨어진다',
    (_, view) => {
      withFrame(frameFor([10, 10, 10], 's', { view }), () => {
        const svg = castShadow([[5, 5, 0], [5, 5, 10]], 0);
        const xs = [...svg.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));
        expect(Math.min(...xs)).toBeLessThan(P(5, 5, 0)[0] - 1);
      });
    },
  );
});
