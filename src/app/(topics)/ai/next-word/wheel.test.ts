import * as ENGINE from '@/lib/colorfigures/core';
import { palette } from '@/styles/palette';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { PROMPTS, applyTemperature, sampleFrom } from './softmax';
import {
  BATCH_SIZE,
  FOCUS_T,
  SPREAD_T,
  advanceWheel,
  clearTally,
  draw,
  initialWheel,
  isSettled,
  nextAction,
  pointerAt,
  shownRot,
  statusText,
  stopAngle,
  total,
  type WheelState,
} from './wheel';
import { TABLE, WHEEL_SIZE, labelSize, sectorRange, textWidth, wheelScene } from './wheelScene';

const run = (s: WheelState) => settle(s, advanceWheel, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(WHEEL_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const probsOf = (i: number, t: number) => applyTemperature(PROMPTS[i].candidates.map((c) => c.logit), t);
const words = (i: number) => PROMPTS[i].candidates.map((c) => c.word);
const render = (s: WheelState, i: number, labelScale = 1) => withFrame(frame(labelScale), () => wheelScene(s, words(i), PROMPTS[i].text));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));
const RS = Array.from({ length: BATCH_SIZE }, (_, i) => (i * 0.37 + 0.011) % 1);

describe('돌림판과 sampleFrom', () => {
  it('멈춘 판에서 바늘이 가리키는 칸이 sampleFrom 이 고른 후보다', () => {
    for (const [pi, t] of [[0, 1], [1, 1], [2, 2], [0, FOCUS_T]] as const) {
      const probs = probsOf(pi, t);
      let s = initialWheel(probs);
      for (const r of RS) {
        s = run(draw(s, [r]));
        const at = pointerAt(s.rot);
        const [a0, a1] = sectorRange(probs, s.last!);
        expect(s.last).toBe(sampleFrom(probs, r));
        expect(at).toBeGreaterThanOrEqual(a0 - 1e-6);
        expect(at).toBeLessThan(a1 + 1e-6);
      }
    }
  });

  it('판은 시계 방향으로만 돌고, 한 번 뽑기는 세 바퀴 넘게 돈다', () => {
    for (const r of [0, 0.25, 0.5, 0.999]) {
      for (const rot of [0, 45, 359, 1000]) {
        const to = stopAngle(rot, r, 3);
        expect(to).toBeGreaterThan(rot + 3 * 360);
        expect(pointerAt(to)).toBeCloseTo((r * 360) % 360, 6);
      }
    }
    let s = draw(initialWheel(probsOf(0, 1)), [0.3]);
    let prev = shownRot(s);
    while (!isSettled(s)) {
      s = advanceWheel(s, 1 / 60);
      expect(shownRot(s)).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = shownRot(s);
    }
  });

  it('20번 뽑기는 멈출 때마다 하나씩 세어 모두 20회가 된다', () => {
    let s = draw(initialWheel(probsOf(0, 1)), RS);
    let prev = 0;
    while (!isSettled(s)) {
      s = advanceWheel(s, 1 / 60);
      expect(total(s) - prev).toBeLessThanOrEqual(1);
      prev = total(s);
    }
    expect(total(s)).toBe(BATCH_SIZE);
    const expected = probsOf(0, 1).map((_, i) => RS.filter((r) => sampleFrom(probsOf(0, 1), r) === i).length);
    expect(s.tally).toEqual(expected);
  });

  // 퀴즈: 같은 확률이어도 다른 말이 나올 수 있다.
  it('같은 확률표에서도 난수에 따라 다른 후보가 뽑힌다', () => {
    const s = run(draw(initialWheel(probsOf(0, 1)), RS));
    expect(s.tally.filter((n) => n > 0).length).toBeGreaterThan(1);
  });
});

describe('순서', () => {
  it('도는 동안의 뽑기·지우기, 뽑은 것이 없을 때의 지우기는 상태를 바꾸지 않고 이유를 알린다', () => {
    const check = (t: WheelState, s: WheelState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t, words(0))).toContain(word);
    };
    const s0 = initialWheel(probsOf(0, 1));
    check(clearTally(s0), s0, '아직 뽑은');
    const spinning = advanceWheel(draw(s0, [0.4]), 0.1);
    check(draw(spinning, [0.2]), spinning, '도는 중');
    check(clearTally(spinning), spinning, '도는 중');
    const done = run(draw(spinning, [0.2]));
    expect(statusText(done, words(0))).not.toContain('도는 중');
    expect(total(clearTally(done))).toBe(0);
  });

  it('본문 순서: 몰기 → 20번 뽑기 → 나누기 → 20번 뽑기. nextAction 은 받아들여지는 버튼만 돌려준다', () => {
    const s0 = initialWheel(probsOf(0, 1));
    expect(nextAction(s0, 1)).toBe('focus');
    expect(nextAction(initialWheel(probsOf(0, FOCUS_T)), FOCUS_T)).toBe('draw20');
    const drawn = run(draw(initialWheel(probsOf(0, FOCUS_T)), RS));
    expect(nextAction(drawn, FOCUS_T)).toBe('spread');
    expect(nextAction(initialWheel(probsOf(0, SPREAD_T)), SPREAD_T)).toBe('draw20');
    expect(nextAction(run(draw(initialWheel(probsOf(0, SPREAD_T)), RS)), SPREAD_T)).toBeNull();
    expect(nextAction(draw(s0, [0.1]), 1)).toBeNull();
    for (const [s, t] of [[s0, 1], [initialWheel(probsOf(0, FOCUS_T)), FOCUS_T]] as const) {
      if (nextAction(s, t) === 'draw20') expect(draw(s, RS).note).toBe('');
    }
  });

  it('상태 문구는 예전 관찰 문구와 방금 뽑힌 단어를 적는다', () => {
    const s0 = initialWheel(probsOf(0, 1));
    expect(statusText(s0, words(0))).toBe('가장 유력한 “좋다”의 확률은 37.0%입니다. 20번 뽑고, 다른 후보도 나오는지 보세요.');
    const one = run(draw(s0, [0.99]));
    expect(statusText(one, words(0))).toContain(`방금 뽑힌 단어: ${words(0)[one.last!]}`);
  });
});

describe('wheelScene', () => {
  it('모든 문맥·온도·단계를 숫자 오류 없이 그린다', () => {
    for (let pi = 0; pi < PROMPTS.length; pi++) {
      for (const t of [0.1, FOCUS_T, 1, SPREAD_T]) {
        const s0 = initialWheel(probsOf(pi, t));
        for (const s of [s0, advanceWheel(draw(s0, [0.6]), 0.3), run(draw(s0, RS))]) for (const scale of [1, 2.2]) expect(render(s, pi, scale)).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  // 본문 note-logit: "막대 길이는 뽑힐 확률, 오른쪽 횟수는 실제로 뽑힌 결과입니다."
  it('표는 확률과, 뽑은 뒤에는 횟수를 적는다', () => {
    const s0 = initialWheel(probsOf(0, 1));
    expect(readFileSync(new URL('./content/note-logit.mdx', import.meta.url), 'utf8')).toContain('막대 길이는 뽑힐 확률');
    const before = texts(render(s0, 0)).map((t) => t.body);
    expect(before).toContain('37.0%');
    expect(before.some((b) => b.endsWith('회'))).toBe(false);
    const after = texts(render(run(draw(s0, RS)), 0)).map((t) => t.body);
    expect(after.filter((b) => /^\d+회$/.test(b))).toHaveLength(words(0).length);
  });

  it('표의 글자는 좁은 화면에서도 칸을 넘지 않는다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      const size = labelSize(scale);
      for (const p of PROMPTS) for (const c of p.candidates) expect(TABLE.word - textWidth(c.word, size), c.word).toBeGreaterThan(TABLE.barL + 1);
      expect(TABLE.pct - textWidth('100.0%', size * 0.85)).toBeGreaterThan(TABLE.count + 1);
      expect(TABLE.count - textWidth('20회', size * 0.9)).toBeGreaterThanOrEqual(8);
      for (const p of PROMPTS) expect(textWidth(`${p.text} ▮`, size * 1.1)).toBeLessThan(170);
    }
  });

  it('한글이 든 글자는 일반 글꼴로 쓴다', () => {
    for (const t of texts(render(run(draw(initialWheel(probsOf(2, 1)), RS)), 2))) if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
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
    for (const s of [initialWheel(probsOf(0, 1)), run(draw(initialWheel(probsOf(0, 1)), RS))]) {
      const svg = withFrame({ ...frameFor(WHEEL_SIZE, 'c', { view: FRONT_VIEW }), labelScale: 1 }, () => wheelScene(s, words(0), PROMPTS[0].text));
      for (const [, c] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
    }
  });
});
