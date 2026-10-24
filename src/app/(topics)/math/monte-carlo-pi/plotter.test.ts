import { describe, expect, it } from 'vitest';
import { formatCount } from '@/components/topic/trialAggregate';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { estimatePi, isInsideCircle } from './pi';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import {
  BATCHES,
  MAX_DARTS,
  advancePlotter,
  clearBoard,
  dartFromSeed,
  initialPlotter,
  insideCount,
  isSettled,
  nextAction,
  nextRandom,
  penAt,
  piText,
  ratioText,
  throwBatch,
  type Batch,
  type PlotterState,
} from './plotter';
import { PLOTTER_SIZE, plotterScene } from './plotterScene';

const run = (s: PlotterState) => settle(s, advancePlotter, isSettled);
/** labelScale: 좁은 화면에서는 이름표 글자가 최대 2.2배까지 커진다 (ColorFigure). */
const draw = (s: PlotterState, labelScale = 1) =>
  withFrame({ ...frameFor(PLOTTER_SIZE, 't', { view: FRONT_VIEW }), labelScale }, () => plotterScene(s));

describe('난수와 점 던지기', () => {
  it('씨앗이 같으면 같은 점이 나온다', () => {
    expect(dartFromSeed(7)).toEqual(dartFromSeed(7));
    expect(dartFromSeed(7)[0]).not.toEqual(dartFromSeed(8)[0]);
  });

  it('난수는 [0, 1) 이고, 점은 [-1, 1) 정사각형 안이며 원 안 판정이 pi.ts 와 같다', () => {
    let seed = 1;
    for (let i = 0; i < 2000; i++) {
      const [v] = nextRandom(seed);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const [d, next] = dartFromSeed(seed);
      expect(Math.abs(d.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(d.y)).toBeLessThanOrEqual(1);
      expect(d.inside).toBe(isInsideCircle(d.x, d.y));
      seed = next;
    }
  });

  // "점을 완전히 무작위로 던질 때" 의 기계: 가로와 세로가 고르게 퍼져야 사분면마다 1/4 씩 떨어진다.
  it('1만 개를 던지면 네 사분면에 고르게 떨어진다 (각 22~28%)', () => {
    let s = initialPlotter(12345);
    s = run(throwBatch(s, 5000));
    s = run(throwBatch(s, 5000));
    const q = [0, 0, 0, 0];
    for (const d of s.darts) q[(d.x < 0 ? 0 : 1) + (d.y < 0 ? 0 : 2)] += 1;
    for (const n of q) {
      expect(n / s.darts.length).toBeGreaterThan(0.22);
      expect(n / s.darts.length).toBeLessThan(0.28);
    }
  });
});

describe('화면 숫자', () => {
  it.each([
    [28, 10, 4, '2.8000'],
    [2, 3, 4, '0.6667'],
    [1, 8, 2, '0.13'],
    [314159, 100000, 4, '3.1416'],
    [0, 7, 1, '0.0'],
    [5, 5, 0, '1'],
  ])('%i / %i 을 소수 %i 자리로 = %s', (n, d, places, text) => {
    expect(ratioText(n, d, places)).toBe(text);
  });

  it('π 추정값 글자가 estimatePi 를 반올림한 값과 같다', () => {
    for (let total = 1; total <= 400; total += 7) {
      for (let inside = 0; inside <= total; inside += 3) {
        const shown = Number(piText(inside, total));
        expect(Math.abs(shown - estimatePi(inside, total))).toBeLessThanOrEqual(0.00005 + 1e-12);
      }
    }
    expect(piText(0, 0)).toBeNull();
  });
});

describe('버튼 순서', () => {
  it('n개 던지기는 n개를 찍고 멈춘다', () => {
    let s = initialPlotter(3);
    for (const n of [10, 100, 1000] as Batch[]) {
      const before = s.darts.length;
      s = run(throwBatch(s, n));
      expect(s.darts.length).toBe(before + n);
      expect(s.queue).toBe(0);
    }
    expect(s.note).toContain(`${formatCount(s.darts.length)}개 중 ${formatCount(insideCount(s))}개`);
  });

  it('찍는 동안 더 던지면 상태는 그대로 두고 이유를 알린다', () => {
    const busy = advancePlotter(throwBatch(initialPlotter(3), 100), 0.5);
    expect(busy.queue).toBeGreaterThan(0);
    for (const n of BATCHES) {
      const s = throwBatch(busy, n);
      expect({ ...s, note: '' }).toEqual({ ...busy, note: '' });
      expect(s.note).toContain('찍는 중');
    }
  });

  it('판에 넘치게 던지면 상태는 그대로 두고 판을 비우라고 알린다', () => {
    let s = initialPlotter(5);
    s = run(throwBatch(s, 5000));
    s = run(throwBatch(s, 5000));
    expect(s.darts.length).toBe(MAX_DARTS);
    const over = throwBatch(s, 10);
    expect(over.darts).toBe(s.darts);
    expect(over.queue).toBe(0);
    expect(over.note).toContain('비우');
    expect(nextAction(s)).toBe('clear');
  });

  it('판 비우기는 찍는 중에도 멈추고 비운다. 빈 판이면 이유를 알린다', () => {
    const busy = advancePlotter(throwBatch(initialPlotter(3), 1000), 0.3);
    const cleared = clearBoard(busy);
    expect(cleared.darts).toEqual([]);
    expect(cleared.queue).toBe(0);
    expect(isSettled(cleared)).toBe(true);
    expect(clearBoard(initialPlotter()).note).toContain('이미 비어');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    let s = initialPlotter(9);
    for (let i = 0; i < 12; i++) {
      const busy = s.queue > 0;
      const next = nextAction(s);
      if (busy) expect(next).toBeNull();
      if (next === null) {
        s = run(s);
        continue;
      }
      const pressed = next === 'clear' ? clearBoard(s) : throwBatch(s, next);
      if (next === 'clear') expect(pressed.darts).toEqual([]);
      else expect(pressed.queue).toBe(next);
      // 움직이는 중인 상태도 한 번씩 확인한다.
      s = i % 2 ? advancePlotter(pressed, 0.4) : run(pressed);
    }
  });

  it('nextAction 은 점이 열 배쯤 늘어나는 묶음을 차례로 권한다', () => {
    let s = initialPlotter(1);
    const seen: (Batch | 'clear' | null)[] = [];
    for (let i = 0; i < 5; i++) {
      const next = nextAction(s);
      seen.push(next);
      s = run(next === 'clear' || next === null ? clearBoard(s) : throwBatch(s, next));
    }
    expect(seen).toEqual([10, 100, 1000, 5000, 1000]);
  });

  it('멈춘 상태에서는 시간이 흘러도 같은 객체를 돌려준다', () => {
    const s = initialPlotter();
    expect(advancePlotter(s, 0.1)).toBe(s);
  });

  it('펜은 다음 점 자리로 옮겨 가다가 그 자리에 점을 찍는다', () => {
    let s = throwBatch(initialPlotter(4), 10);
    const target = s.next!;
    s = advancePlotter(s, 0.05);
    const mid = penAt(s);
    expect(mid.x).not.toBe(target.x);
    s = advancePlotter(s, 0.2);
    expect(s.darts[0]).toEqual(target);
  });
});

describe('plotterScene', () => {
  // AGENTS.md: 한글이 섞인 라벨은 일반 글꼴로 쓴다.
  it('한글이 든 글자(막대 이름, 이름표)는 일반 글꼴로 쓴다', () => {
    const svg = draw(advancePlotter(throwBatch(initialPlotter(2), 10), 0.3));
    const korean = (svg.match(/<text[^>]*>[^<]*[가-힯][^<]*<\/text>/g) ?? []);
    expect(korean.length).toBeGreaterThanOrEqual(4);
    for (const t of korean) expect(t).toContain(GENERAL_FONT);
  });

  const stages = (): PlotterState[] => {
    const out: PlotterState[] = [];
    let s = initialPlotter(11);
    out.push(s);
    for (const n of BATCHES) {
      s = throwBatch(s, n);
      for (let i = 0; i < 3; i++) out.push((s = advancePlotter(s, 0.37)));
      out.push((s = run(s)));
    }
    out.push(clearBoard(s));
    return out;
  };

  it('모든 단계를 숫자 오류 없이 그린다', () => {
    for (const s of stages()) expect(draw(s)).not.toMatch(/NaN|undefined|Infinity/);
  });

  // 본문: "주황색은 원 안, 파란색은 원 밖입니다."
  it('원 안 점은 주황 path 에, 원 밖 점은 파랑 path 에 하나씩 찍힌다', () => {
    const s = run(throwBatch(initialPlotter(21), 100));
    const svg = draw(s);
    const count = (color: string) => {
      const m = new RegExp(`<path d="([^"]*)" fill="none" stroke="${color}"`).exec(svg);
      return m ? (m[1].match(/M/g) ?? []).length : 0;
    };
    expect(count('#f2913a')).toBe(insideCount(s));
    expect(count('#76a0e2')).toBe(s.darts.length - insideCount(s));
  });

  it('이름표 두 개가 어느 단계 어느 펜 자리에서도, 이름표가 커진 좁은 화면에서도 겹치지 않는다', () => {
    const rects = (svg: string) =>
      [...svg.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => m.slice(1, 5).map(Number));
    const overlap = (a: number[], b: number[]) =>
      a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
    const check = (s: PlotterState) => {
      for (const scale of [1, 1.6, 2.2]) {
        const r = rects(draw(s, scale));
        expect(r).toHaveLength(2);
        expect(overlap(r[0], r[1]), `labelScale ${scale}, 펜 ${JSON.stringify(penAt(s))}`).toBe(false);
      }
    };
    for (const s of stages()) check(s);
    // 펜이 종이의 네 모서리와 가장자리에 있을 때
    for (const x of [-1, -0.5, 0, 0.5, 1]) {
      for (const y of [-1, -0.5, 0, 0.5, 1]) {
        check({ ...initialPlotter(), darts: [{ x, y, inside: isInsideCircle(x, y) }] });
      }
    }
  });

  it('확대된 이론값 이름표도 두 비율 막대 전체를 가리지 않는다', () => {
    for (const labelScale of [1, 1.6, 2.2]) {
      const svg = draw({ ...initialPlotter(), darts: [{ x: 1, y: 1, inside: false }] }, labelScale);
      const theoryTag = [...svg.matchAll(/<g class="tag[^"]*">([\s\S]*?)<\/g>/g)]
        .find(([, group]) => group.includes('이론값 π/4'));
      expect(theoryTag).toBeDefined();
      const rect = theoryTag![1].match(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
      expect(rect).not.toBeNull();
      const [x, y, width, height] = rect!.slice(1).map(Number);
      // 실제 그려진 유리관의 path에서 경계를 읽는다. 표본이 모두 원 밖일 때도 관 전체가 보여야 한다.
      const bars = [...svg.matchAll(/<path d="([^"]+)" fill="#e8f2f2"/g)];
      expect(bars).toHaveLength(2);
      for (const bar of bars) {
        const coordinates = [...bar[1].matchAll(/-?\d+(?:\.\d+)?/g)].map(m => Number(m[0]));
        const xs = coordinates.filter((_, i) => i % 2 === 0);
        const ys = coordinates.filter((_, i) => i % 2 === 1);
        const overlaps = x < Math.max(...xs) && x + width > Math.min(...xs)
          && y < Math.max(...ys) && y + height > Math.min(...ys);
        expect(overlaps, `labelScale ${labelScale}`).toBe(false);
      }
    }
  });

});
