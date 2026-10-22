import { describe, expect, it } from 'vitest';
import { Dv, FRONT_VIEW, P, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GEOMETRY } from './scene';
import {
  AREAS,
  PIN_TARGETS,
  STEP_COUNT,
  STRING_PATH,
  TANGENT,
  advanceCork,
  corkNote,
  initialCork,
  isSettled,
  pinProgress,
  sideLabels,
  stepDuration,
  stringPoints,
  stringProgress,
  type AreaPart,
  type CorkState,
  type Pt,
} from './cork';
import { AREA_SPOT, CORK_SIZE, boardLabels, corkScene, onBoard } from './corkScene';

const PARTS: AreaPart[] = ['quarter', 'bottom', 'hanging', 'red'];
const run = (s: CorkState) => settle(s, advanceCork, isSettled);
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const frame = (labelScale = 1) => ({ ...frameFor(CORK_SIZE, 't', { view: FRONT_VIEW }), labelScale });

/** 모든 단계의 처음·중간·끝, 3단계의 대입 전후, 4단계의 네 조각. */
function allStates(): CorkState[] {
  const out: CorkState[] = [];
  for (let step = 0; step < STEP_COUNT; step++) {
    let s = initialCork(step);
    out.push(s);
    for (let i = 0; i < 6; i++) out.push((s = advanceCork(s, 0.3)));
    out.push(run(s));
  }
  out.push(initialCork(3, true));
  for (const area of PARTS) out.push(initialCork(4, false, area));
  return out;
}

describe('도형의 성질 (본문의 주장)', () => {
  // step-1: "두 원이 접할 때, 중심을 이은 선은 반드시 접점을 지납니다."
  it('실이 지나는 접점은 두 반원 위에 있고, 두 중심을 잇는 선분 위에 있다', () => {
    expect(dist(TANGENT, GEOMETRY.bottom.center)).toBeCloseTo(GEOMETRY.bottom.radius, 12);
    expect(dist(TANGENT, GEOMETRY.hanging.center)).toBeCloseTo(GEOMETRY.hanging.radius, 12);
    expect(dist(GEOMETRY.bottom.center, TANGENT) + dist(TANGENT, GEOMETRY.hanging.center)).toBeCloseTo(
      dist(GEOMETRY.bottom.center, GEOMETRY.hanging.center),
      12,
    );
    expect(TANGENT[0]).toBeCloseTo(6 / 5, 12);
    expect(TANGENT[1]).toBeCloseTo(12 / 5, 12);
  });

  // step-2: "중심을 이으면 직각삼각형이 만들어집니다."
  it('실이 두르는 삼각형은 큰 원의 중심에서 직각이고, 처음 핀으로 돌아와 닫힌다', () => {
    const [h, b, o, back] = STRING_PATH;
    expect(back).toEqual(h);
    const leg1 = [b[0] - o[0], b[1] - o[1]];
    const leg2 = [h[0] - o[0], h[1] - o[1]];
    expect(leg1[0] * leg2[0] + leg1[1] * leg2[1]).toBe(0);
    expect(PIN_TARGETS).toEqual([GEOMETRY.hanging.center, GEOMETRY.bottom.center, GEOMETRY.quarter.center]);
  });

  // step-3: 3² + (6−x)² = (3+x)², x = 2 → 높이 4, 빗변 5
  it('x = 2 를 넣은 변 이름 3, 4, 5 가 실제 변의 길이이고 피타고라스 정리를 만족한다', () => {
    expect(sideLabels(initialCork(3))).toEqual(['3', '6−x', '3+x']);
    const [a, b, c] = sideLabels(initialCork(3, true)).map(Number);
    const [h, bc, o] = STRING_PATH;
    expect([dist(o, bc), dist(o, h), dist(h, bc)]).toEqual([a, b, c]);
    expect(a * a + b * b).toBe(c * c);
    const x = GEOMETRY.hanging.radius;
    expect([6 - x, 3 + x]).toEqual([b, c]);
  });

  it('넓이를 적는 자리가 그 조각 안에 있다', () => {
    const inQuarter = ([u, v]: Pt) => u > 0 && v > 0 && Math.hypot(u, v) < GEOMETRY.quarter.radius;
    const inBottom = (p: Pt) => p[1] > 0 && dist(p, GEOMETRY.bottom.center) < GEOMETRY.bottom.radius;
    const inHanging = (p: Pt) => p[0] > 0 && dist(p, GEOMETRY.hanging.center) < GEOMETRY.hanging.radius;
    const spot = (a: AreaPart): Pt => [AREA_SPOT[a].u, AREA_SPOT[a].v];
    expect(inQuarter(spot('red')) && !inBottom(spot('red')) && !inHanging(spot('red'))).toBe(true);
    expect(inBottom(spot('bottom'))).toBe(true);
    expect(inHanging(spot('hanging'))).toBe(true);
    expect(inQuarter(spot('quarter'))).toBe(true);
  });

  it('결론의 넓이가 9π − 4.5π − 2π 다', () => {
    expect(AREAS.quarter - AREAS.bottom - AREAS.hanging).toBe(AREAS.red);
    expect(corkNote(initialCork(5))).toContain('2.5π');
  });
});

describe('움직임', () => {
  it('1단계: 핀 세 개가 차례로 꽂힌 뒤에 실이 풀린다', () => {
    let s = initialCork(1);
    let lastPins = -1;
    while (!isSettled(s)) {
      s = advanceCork(s, 0.05);
      const pins = PIN_TARGETS.map((_, i) => pinProgress(s, i));
      if (stringProgress(s) > 0) expect(pins.every((p) => p === 1)).toBe(true);
      // 앞 핀이 다 꽂히기 전에는 다음 핀이 움직이지 않는다.
      for (let i = 1; i < pins.length; i++) if (pins[i] > 0) expect(pins[i - 1]).toBe(1);
      const sum = pins.reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThanOrEqual(lastPins);
      lastPins = sum;
    }
  });

  it('다 움직인 단계는 끝 값을 정확히 준다 (시간을 나눈 셈의 반올림 오차가 없다)', () => {
    expect(stringProgress(run(initialCork(1)))).toBe(1);
    expect(stringProgress(run(initialCork(2)))).toBe(3);
    expect(stringPoints(3)).toEqual([...STRING_PATH]);
    for (let i = 0; i < 3; i++) expect(pinProgress(run(initialCork(1)), i)).toBe(1);
  });

  it('움직임이 없는 단계는 처음부터 멈춰 있고, 멈춘 상태는 같은 객체를 돌려준다', () => {
    for (const step of [0, 3, 4]) {
      expect(stepDuration(step)).toBe(0);
      const s = initialCork(step);
      expect(isSettled(s)).toBe(true);
      expect(advanceCork(s, 0.1)).toBe(s);
    }
  });

  it('넓이 비교부터는 핀과 실을 걷는다', () => {
    for (const step of [4, 5]) {
      const s = run(initialCork(step));
      expect(stringProgress(s)).toBe(0);
      expect(PIN_TARGETS.map((_, i) => pinProgress(s, i))).toEqual([0, 0, 0]);
    }
  });
});

describe('corkScene', () => {
  it('모든 단계를 숫자 오류 없이 그린다', () => {
    withFrame(frame(), () => {
      for (const s of allStates()) expect(corkScene(s)).not.toMatch(/NaN|undefined|Infinity/);
    });
  });

  /** 화면에서 글자 상자: 가운데 밑줄 기준. 한글은 1em, 나머지는 0.62em 으로 센다. */
  const textBoxes = (s: CorkState) => {
    const ux = Math.hypot(...Dv(0, 1, 0));
    const vy = Math.hypot(...Dv(0, 0, 1));
    return boardLabels(s).map((l) => {
      const [cx, cy] = P(...onBoard([l.u, l.v]));
      const em = [...l.text].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1 : 0.62), 0);
      const w = em * l.size * ux;
      const h = l.size * vy;
      return { text: l.text, x: cx - w / 2, y: cy - 0.8 * h, w, h };
    });
  };
  const tagBoxes = (svg: string) =>
    [...svg.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => {
      const [x, y, w, h] = m.slice(1, 5).map(Number);
      return { text: 'tag', x, y, w, h };
    });
  const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  it('판에 쓴 글자와 이름표가 어느 단계에서도 서로 겹치지 않고 그림 틀 안에 있다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      const fr = frame(scale);
      withFrame(fr, () => {
        for (const s of allStates()) {
          const boxes = [...textBoxes(s), ...tagBoxes(corkScene(s))];
          for (let i = 0; i < boxes.length; i++) {
            const b = boxes[i];
            expect(b.x, b.text).toBeGreaterThanOrEqual(0);
            expect(b.x + b.w, b.text).toBeLessThanOrEqual(fr.vbW);
            expect(b.y, b.text).toBeGreaterThanOrEqual(0);
            for (let j = i + 1; j < boxes.length; j++) {
              expect(overlap(b, boxes[j]), `${s.step}단계 ${b.text} / ${boxes[j].text} (labelScale ${scale})`).toBe(false);
            }
          }
        }
      });
    }
  });

  it('2단계는 실이 삼각형을 다 두른 뒤에 변 이름을 쓴다', () => {
    const mid = advanceCork(initialCork(2), 0.5);
    withFrame(frame(), () => {
      expect(boardLabels(mid).map((l) => l.text)).not.toContain('3+x');
      expect(boardLabels(run(mid)).map((l) => l.text)).toContain('3+x');
    });
  });

  it('1단계가 끝나면 접점에 이름표가 달린다', () => {
    withFrame(frame(), () => {
      expect(corkScene(advanceCork(initialCork(1), 0.5))).not.toContain('접점');
      expect(corkScene(run(initialCork(1)))).toContain('접점');
    });
  });
});
