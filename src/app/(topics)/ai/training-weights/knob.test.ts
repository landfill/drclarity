import * as ENGINE from '@/lib/colorfigures/core';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { MONO_FONT, palette } from '@/styles/palette';
import { INITIAL_WEIGHT, probability, step } from './model';
import {
  AFTER_WEIGHT,
  GRADIENT,
  advanceWeight,
  gradientLines,
  initialWeight,
  isSettled,
  nextAction,
  readings,
  reset,
  runStep,
  shownWeight,
  statusText,
  type WeightState,
} from './knob';
import { BAR, COLUMN, DIAL, STRIP, dialPoint, WEIGHT_SIZE, barSplit, dialAngle, formulaSize, labelSize, textWidth, weightScene } from './knobScene';

const run = (s: WeightState) => settle(s, advanceWeight, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(WEIGHT_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: WeightState, labelScale = 1) => withFrame(frame(labelScale), () => weightScene(s));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));

describe('순서', () => {
  it('학습 전 → 학습 한 단계 → 전후 비교 순서로 간다', () => {
    let s = initialWeight();
    expect(nextAction(s)).toBe('step');
    s = runStep(s);
    expect(nextAction(s)).toBeNull();
    s = run(s);
    expect(shownWeight(s)).toBe(AFTER_WEIGHT);
    expect(nextAction(s)).toBe('reset');
    s = reset(s);
    expect(s).toEqual(initialWeight());
  });

  // 순서를 건너뛴 입력은 상태를 바꾸지 않고 이유를 알린다 (예전의 비활성 버튼 대신).
  it('두 번째 실행과 처음 상태에서의 처음으로는 상태를 바꾸지 않고 이유를 알린다', () => {
    const check = (t: WeightState, s: WeightState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t)).toContain(word);
    };
    const s0 = initialWeight();
    check(reset(s0), s0, '이미 학습 전');
    const moving = advanceWeight(runStep(s0), 0.2);
    check(runStep(moving), moving, '이미 한 단계');
    const done = run(runStep(s0));
    check(runStep(done), done, '연속 학습이 아니라');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    const s0 = initialWeight();
    const states = [s0, runStep(s0), advanceWeight(runStep(s0), 0.3), run(runStep(s0))];
    for (const s of states) {
      const a = nextAction(s);
      if (a === 'step') expect(runStep(s).note).toBe('');
      if (a === 'reset') expect(reset(s).note).toBe('');
    }
  });

  it('다이얼은 학습 전 가중치에서 새 가중치까지 한 방향으로만 돈다', () => {
    let s = runStep(initialWeight());
    let prev = shownWeight(s);
    expect(prev).toBe(INITIAL_WEIGHT);
    while (!isSettled(s)) {
      s = advanceWeight(s, 1 / 60);
      expect(shownWeight(s)).toBeGreaterThanOrEqual(prev);
      prev = shownWeight(s);
    }
    expect(prev).toBe(AFTER_WEIGHT);
  });
});

describe('본문과 같은 숫자', () => {
  it('새 가중치는 model.ts 의 한 단계 갱신과 같고, 기울기는 맑다 확률 − 1 이다', () => {
    expect(AFTER_WEIGHT).toBe(step(INITIAL_WEIGHT));
    expect(GRADIENT).toBe(probability(INITIAL_WEIGHT) - 1);
    const [l1, l2] = gradientLines();
    expect(l1).toBe('기울기 = 맑다 확률 − 1 = 0.269 − 1 = −0.731');
    expect(l2).toBe('새 가중치 = −1.000 − 1 × (−0.731) = −0.269');
    expect(gradientLines(true)).toEqual(['기울기 = 0.269 − 1 = −0.731', '새 가중치 = −1 − 1 × (−0.731) = −0.269']);
    // 줄인 식은 그림에, 온전한 식은 움직이는 동안의 상태 문구에 있다.
    const moving = advanceWeight(runStep(initialWeight()), 0.1);
    expect(statusText(moving)).toContain(l1);
    expect(statusText(moving)).toContain(l2);
  });

  // 본문: "정답 확률은 약 27%에서 43%로 올라가고, 손실은 약 1.313에서 0.837로 내려갑니다."
  it('상태 문구의 전후 값은 본문의 숫자와 같다', () => {
    const text = statusText(run(runStep(initialWeight())));
    expect(text).toContain('가중치가 −1.000에서 −0.269로 바뀌어 이 예시의 정답 확률이 올라갔습니다.');
    expect(text).toContain('맑다 26.9%');
    expect(text).toContain('맑다 43.3%');
    expect(text).toContain('정답 손실 1.313');
    expect(text).toContain('정답 손실 0.837');
  });

  // 본문: "아직 정답이 두 후보 중 가장 높은 확률은 아닙니다."
  it('한 단계 뒤에도 맑다는 흐리다보다 확률이 낮다', () => {
    const r = readings(AFTER_WEIGHT);
    expect(r.sunny).toBeLessThan(r.cloudy);
    expect(barSplit(r.sunny)).toBeLessThan((BAR.v0 + BAR.v1) / 2);
  });
});

describe('weightScene', () => {
  const states = (): WeightState[] => {
    const out: WeightState[] = [initialWeight()];
    let s = runStep(initialWeight());
    while (!isSettled(s)) {
      out.push(s);
      s = advanceWeight(s, 0.1);
    }
    out.push(s);
    return out;
  };

  it('모든 단계를 숫자 오류 없이 그린다', () => {
    for (const scale of [1, 1.6, 2.2]) for (const s of states()) expect(draw(s, scale)).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('다이얼 눈금은 −2 를 왼쪽 아래, 1 을 오른쪽 아래에 두고, 두 가중치가 눈금 안에 든다', () => {
    expect(dialAngle(DIAL.min)).toBe(225);
    expect(dialAngle(DIAL.max)).toBe(-45);
    for (const w of [INITIAL_WEIGHT, AFTER_WEIGHT]) {
      expect(w).toBeGreaterThan(DIAL.min);
      expect(w).toBeLessThan(DIAL.max);
    }
  });

  it('기울기 식과 학습 전 표시는 실행한 뒤에만 나온다', () => {
    const before = texts(draw(initialWeight())).map((t) => t.body);
    expect(before.some((b) => b.startsWith('기울기 ='))).toBe(false);
    expect(before.some((b) => b.startsWith('전'))).toBe(false);
    const after = texts(draw(run(runStep(initialWeight())))).map((t) => t.body);
    expect(after).toContain(gradientLines(true)[0]);
    expect(after).toContain('전 1.313');
  });

  it('이름표는 좁은 화면에서도 제자리를 넘지 않는다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      const size = labelSize(scale);
      const small = size * 0.8;
      // 계산 띠의 식은 띠 안에 든다.
      for (const l of gradientLines(true)) expect(textWidth(l, formulaSize(scale)), l).toBeLessThanOrEqual(STRIP.u1 - STRIP.u0 - 4);
      // 확률 막대의 이름표는 손실 기둥에 닿지 않는다.
      for (const w of [INITIAL_WEIGHT, AFTER_WEIGHT]) {
        expect(BAR.u0 - 3 - textWidth(`흐리다 ${(readings(w).cloudy * 100).toFixed(1)}%`, small)).toBeGreaterThan(COLUMN.u1 + 2);
        expect(BAR.u0 - 3 - textWidth(`맑다 ${(readings(w).sunny * 100).toFixed(1)}%`, size)).toBeGreaterThan(COLUMN.u1 + 2);
      }
      // 손실 기둥 오른쪽의 값은 계기판 앞면 판(왼쪽 끝 y 10) 안에 든다.
      expect(COLUMN.u0 - 4 - textWidth('전 1.313', small)).toBeGreaterThanOrEqual(10);
      expect(COLUMN.u0 - 4 - textWidth('1.313', size)).toBeGreaterThanOrEqual(10);
      // 막대 왼쪽의 "전" 은 다이얼의 눈금 숫자 1 과 떨어져 있다.
      const [oneU] = dialPoint(DIAL.r + 6, dialAngle(1));
      expect(BAR.u1 + 3 + textWidth('전', small)).toBeLessThan(oneU - textWidth('1', small) / 2 - 2);
    }
  });

  // AGENTS.md: 한글이 섞인 라벨은 일반 글꼴로, 숫자만 있는 눈금은 고정폭으로 쓴다.
  it('한글이 든 글자는 일반 글꼴, 숫자만 있는 글자는 고정폭으로 쓴다', () => {
    for (const t of texts(draw(run(runStep(initialWeight()))))) {
      if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
      else if (/^[−\d.]+$/.test(t.body)) expect(t.tag, t.body).toContain(MONO_FONT);
    }
  });
});

// AGENTS.md "색과 글자": 그림 색은 엔진의 PALS 와 재질에서 고른다.
describe('그림의 색', () => {
  it('그림에 쓰인 색은 모두 엔진의 PALS · 재질 · 잉크 색이다', () => {
    const allowed = new Set<string>(
      [...Object.values(ENGINE.PALS), ENGINE.METAL, ENGINE.CLEAR, ENGINE.CERAMIC, ENGINE.DARK, ENGINE.BOARD, ENGINE.WOOD]
        .flatMap((m) => [m.l, m.m, m.d])
        .concat([ENGINE.INK, ENGINE.SHADOW, palette.muted])
        .map((c) => c.toLowerCase()),
    );
    for (const s of [initialWeight(), run(runStep(initialWeight()))]) {
      const svg = withFrame({ ...frameFor(WEIGHT_SIZE, 'c', { view: FRONT_VIEW }), labelScale: 1 }, () => weightScene(s));
      for (const [, c] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
    }
  });
});
