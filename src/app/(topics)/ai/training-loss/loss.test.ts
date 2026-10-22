import { describe, expect, it } from 'vitest';
import { BOARD, CERAMIC, CLEAR, DARK, FRONT_VIEW, INK, METAL, PALS, SHADOW, WOOD, frameFor, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { MONO_FONT, palette } from '@/styles/palette';
import { nextTokenLoss } from './loss';
import {
  CUP,
  LOSS_SIZE,
  OVERFLOW,
  REFERENCE_PERCENTS,
  TUBE,
  columnHeight,
  cupLines,
  figureLabel,
  labelSize,
  lossScene,
  refLabelSize,
  statusText,
  textWidth,
} from './lossScene';

describe('next-token negative log likelihood', () => {
  it('matches the numerical examples displayed in the lesson', () => {
    expect(nextTokenLoss(0.1)).toBeCloseTo(2.302585093);
    expect(nextTokenLoss(0.5)).toBeCloseTo(0.693147181);
    expect(nextTokenLoss(0.9)).toBeCloseTo(0.105360516);
  });
  it('strictly decreases throughout the slider as the correct probability grows', () => {
    let previous = nextTokenLoss(0);
    for (let percent = 1; percent <= 100; percent++) {
      const current = nextTokenLoss(percent / 100);
      expect(current).toBeLessThan(previous);
      expect(current).toBeGreaterThanOrEqual(0);
      previous = current;
    }
  });
  it('represents exact boundaries without clipping zero to a made-up epsilon', () => {
    expect(nextTokenLoss(0)).toBe(Infinity);
    expect(nextTokenLoss(1)).toBe(0);
  });
  it.each([-0.01, 1.01, NaN, Infinity, -Infinity])('rejects non-probability %s', p => {
    expect(() => nextTokenLoss(p)).toThrow(RangeError);
  });
});

describe('확률 컵과 벌점 눈금 figure', () => {
  const frame = (labelScale = 1) => ({ ...frameFor(LOSS_SIZE, 't', { view: FRONT_VIEW }), labelScale });
  const draw = (percent: number, labelScale = 1) => withFrame(frame(labelScale), () => lossScene(percent));
  const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));

  it('모든 확률과 화면 폭에서 숫자 오류 없이 그린다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      for (let percent = 0; percent <= 100; percent++) expect(draw(percent, scale), `${percent}%`).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('기둥 높이는 정답 확률이 커질수록 줄고, 1% 이상이면 관 안에 든다', () => {
    let previous = columnHeight(nextTokenLoss(0));
    for (let percent = 1; percent <= 100; percent++) {
      const h = columnHeight(nextTokenLoss(percent / 100));
      expect(h).toBeLessThan(previous);
      expect(h).toBeLessThan(TUBE.h);
      previous = h;
    }
    expect(columnHeight(0)).toBe(0);
  });

  // 본문: "0%를 작은 양수로 몰래 바꿔 유한한 값처럼 표시하지 않았습니다."
  it('0% 의 무한대는 관 꼭대기를 넘어 빠져나가고 ∞ 로 적는다 (유한한 값의 높이로 줄이지 않는다)', () => {
    expect(columnHeight(Infinity)).toBe(TUBE.h + OVERFLOW);
    const bodies = texts(draw(0)).map((t) => t.body);
    expect(bodies).toContain('손실 ∞');
    expect(bodies.some((b) => /손실 \d/.test(b))).toBe(false);
    expect(statusText(0)).toContain('∞ (무한대)');
    // 슬라이더의 어떤 유한한 값도 꼭대기를 넘지 않는다.
    expect(columnHeight(nextTokenLoss(0.01))).toBeLessThan(TUBE.h);
  });

  it('컵은 늘 가득 차 있고, 두 몫의 합은 100% 다', () => {
    for (let percent = 0; percent <= 100; percent++) {
      const [answer, others] = cupLines(percent);
      expect(Number(answer.match(/(\d+)%/)![1]) + Number(others.match(/(\d+)%/)![1])).toBe(100);
    }
  });

  it('기준 확률은 비교 카드와 같은 10 · 50 · 90 % 이고, 눈금관에 이름표가 붙는다', () => {
    expect([...REFERENCE_PERCENTS]).toEqual([10, 50, 90]);
    const bodies = texts(draw(50)).map((t) => t.body);
    for (const ref of REFERENCE_PERCENTS) expect(bodies).toContain(`정답 ${ref}%`);
  });

  it('상태 문구는 예전 관찰 칸의 문구 그대로다', () => {
    expect(statusText(50)).toBe('정답 한 조각의 손실: 0.693. 정답 확률이 커질수록 이 조각의 손실은 작아집니다. 낮은 확률에서 더 낮아질 때 손실이 가파르게 커지는지도 보세요.');
    expect(statusText(100)).toContain('정답에 100%를 주면 이 한 조각의 손실은 0입니다. 다른 문장에서도 잘한다는 뜻은 아닙니다.');
    expect(statusText(0)).toContain('실제 계산은 보통 로그 확률을 안정적으로 계산하며');
  });

  it('이름표는 좁은 화면에서도 서로 겹치지 않는다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      const ref = refLabelSize(scale);
      const zs = REFERENCE_PERCENTS.map((p) => columnHeight(nextTokenLoss(p / 100))).sort((a, b) => a - b);
      for (let i = 1; i < zs.length; i++) expect(zs[i] - zs[i - 1], `scale ${scale}`).toBeGreaterThan(ref * 1.3);
      // 컵 위 두 줄의 오른쪽 끝은 눈금 숫자(관 왼쪽)에 닿지 않는다.
      const size = labelSize(scale);
      const widest = Math.max(...cupLines(100).map((l) => textWidth(l, size)), ...cupLines(0).map((l) => textWidth(l, size)));
      expect(CUP.cy - widest / 2).toBeGreaterThan(TUBE.y1 + 4 + size * 1.2);
    }
  });

  it('대체 글에 두 몫과 손실을 적는다', () => {
    expect(figureLabel(10)).toContain('10%');
    expect(figureLabel(10)).toContain('90%');
    expect(figureLabel(10)).toContain('2.303');
    expect(figureLabel(0)).toContain('∞');
  });

  // AGENTS.md: 한글이 섞인 라벨은 일반 글꼴로, 숫자만 있는 눈금은 고정폭으로 쓴다.
  it('한글이 든 글자는 일반 글꼴, 숫자 눈금은 고정폭으로 쓴다', () => {
    for (const t of texts(draw(30))) {
      if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
      if (/^\d$/.test(t.body)) expect(t.tag, t.body).toContain(MONO_FONT);
    }
  });
});

// AGENTS.md "색과 글자": 그림 색은 엔진의 PALS 와 재질에서 고른다 (Codex 지적: 다른 후보 층의 임시 색).
describe('확률 컵 figure 의 색', () => {
  it('그림에 쓰인 색은 모두 엔진의 PALS · 재질 · 잉크 색이다', () => {
    const allowed = new Set<string>(
      [...Object.values(PALS), METAL, CLEAR, CERAMIC, DARK, BOARD, WOOD].flatMap((m) => [m.l, m.m, m.d]).concat([INK, SHADOW, palette.muted]).map((c) => c.toLowerCase()),
    );
    for (const percent of [0, 1, 37, 100]) {
      const svg = withFrame({ ...frameFor(LOSS_SIZE, 't', { view: FRONT_VIEW }), labelScale: 1 }, () => lossScene(percent));
      for (const [, c] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, `${percent}% ${c}`).toContain(c.toLowerCase());
    }
  });
});
