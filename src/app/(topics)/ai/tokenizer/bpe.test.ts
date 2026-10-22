import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { MERGES, encode, encodeTrace, toBytes } from './tokenizer';
import {
  MAX_FIG_BYTES,
  advanceBpe,
  byteLabel,
  initialBpe,
  isSettled,
  lastRule,
  mergeAll,
  mergeOnce,
  nextAction,
  pieceText,
  planFor,
  retarget,
  sideText,
  statusText,
  tokensAt,
  unpack,
  type BpeState,
} from './bpe';
import { BPE_SIZE, PAPER_W, TILE, bpeScene, groupLabelSize, groupLabelTop, groupSpans, paperTextBottom, ruleTextSize, tileLabelSize } from './bpeScene';

const PRESETS = ['token', '2026', ' token', '토큰', '뷁'];
const run = (s: BpeState) => settle(s, advanceBpe, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(BPE_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: BpeState, labelScale = 1) => withFrame(frame(labelScale), () => bpeScene(s));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));

describe('병합 과정 (tokenizer.ts 와 같은 규칙)', () => {
  it('과정의 마지막 모습이 encode 의 토큰과 같다', () => {
    for (const text of [...PRESETS, 'the model cost', '단어 하나가 토큰 하나는 아닙니다', '19260817', '', 'a']) {
      const steps = encodeTrace(text);
      const last = steps.length ? steps[steps.length - 1].tokens : toBytes(text).map((b) => [b]);
      expect(last, text).toEqual(encode(text));
    }
  });

  // 본문: 바이트에서 시작해 정해진 순서로 쌍을 합친다.
  it('한 단계에 이웃한 한 쌍만 합치고, 그 쌍은 규칙표에 있는 규칙이다', () => {
    for (const text of PRESETS) {
      let prev = toBytes(text).map((b) => [b]);
      for (const step of encodeTrace(text)) {
        expect(step.tokens.length).toBe(prev.length - 1);
        expect(MERGES[step.rank]).toBe(step.rule);
        expect(prev[step.at]).toEqual(step.rule.left);
        expect(prev[step.at + 1]).toEqual(step.rule.right);
        expect(step.tokens[step.at]).toEqual(step.rule.merged);
        prev = step.tokens;
      }
    }
  });

  it('그림은 짧은 글에서 바이트부터 보이고, 긴 글은 앞쪽의 온전한 토큰만 보인다', () => {
    const short = planFor('토큰');
    expect(short.clipped).toBe(false);
    expect(tokensAt(short, 0)).toEqual(toBytes('토큰').map((b) => [b]));
    const long = planFor('the model cost is not a word');
    expect(long.clipped).toBe(true);
    expect(long.final.flat().length).toBeLessThanOrEqual(MAX_FIG_BYTES);
    expect(long.final).toEqual(encode('the model cost is not a word').slice(0, long.final.length));
    for (const text of PRESETS) expect(planFor(text).clipped).toBe(false);
  });
});

describe('버튼과 시간', () => {
  it('첫 화면은 다 묶은 모습이다', () => {
    const s = initialBpe('token');
    expect(s.running).toBe(false);
    expect(tokensAt(planFor('token'), s.step)).toEqual(encode('token'));
  });

  it('입력이 바뀌면 바이트로 풀어 처음부터 묶고, 2초 안에 끝난다', () => {
    for (const text of PRESETS) {
      let s = retarget(initialBpe(''), text);
      const n = planFor(text).steps.length;
      if (n === 0) {
        expect(s.running).toBe(false);
        continue;
      }
      expect(s).toMatchObject({ step: 0, running: true });
      for (let i = 0; i < 2 * 60 + 1; i++) s = advanceBpe(s, 1 / 60);
      expect(s.running).toBe(false);
      expect(s.step).toBe(n);
    }
  });

  it('한 번 묶기는 한 쌍만 합치고, 바이트로 풀기는 처음으로 돌아간다', () => {
    let s = unpack(initialBpe('token'));
    expect(s.step).toBe(0);
    s = mergeOnce(s);
    expect(s.step).toBe(1);
    expect(tokensAt(planFor('token'), s.step).length).toBe(4);
  });

  it('받아들이지 않는 누름은 상태를 바꾸지 않고 이유를 알린다', () => {
    const done = initialBpe('token');
    const check = (t: BpeState, s: BpeState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t)).toContain(word);
    };
    check(mergeOnce(done), done, '규칙표에 없습니다');
    check(mergeAll(done), done, '규칙표에 없습니다');
    const raw = unpack(done);
    check(unpack(raw), raw, '이미 바이트');
    const moving = advanceBpe(retarget(done, '토큰'), 0.1);
    check(mergeOnce(moving), moving, '묶는 중');
    check(mergeAll(moving), moving, '묶는 중');
    const long = initialBpe('the model cost is not a word');
    check(unpack(long), long, '앞쪽 토큰만');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    for (const text of [...PRESETS, '', 'the model cost is not a word']) {
      const states = [initialBpe(text), unpack(initialBpe(text)), advanceBpe(retarget(initialBpe('x'), text), 0.05)];
      for (const s of states) {
        const a = nextAction(s);
        if (a === null) continue;
        const after = a === 'once' ? mergeOnce(s) : unpack(s);
        expect(after.note, `${text} ${a}`).toBe('');
      }
    }
    expect(nextAction(advanceBpe(retarget(initialBpe('x'), 'token'), 0.05))).toBeNull();
  });

  it('상태 문구는 묶는 동안 바뀌지 않는다 (화면 낭독이 단계마다 끼어들지 않게)', () => {
    let s = retarget(initialBpe('x'), '토큰');
    const seen = new Set<string>();
    while (s.running) {
      seen.add(statusText(s));
      s = advanceBpe(s, 1 / 60);
    }
    expect(seen.size).toBe(1);
    expect(statusText(s)).toContain('토큰 1개');
  });

  // 본문: 이 모형은 입력할 때 새로 학습하지 않는다.
  it('규칙표는 입력에 따라 바뀌지 않는다', () => {
    const before = MERGES.map((m) => m.merged.join(','));
    for (const text of PRESETS) run(retarget(initialBpe('x'), text));
    expect(MERGES.map((m) => m.merged.join(','))).toEqual(before);
  });
});

describe('글자', () => {
  it('타일에는 보이는 ASCII 는 글자로, 공백은 ·, 나머지 바이트는 16진수로 적는다', () => {
    expect(byteLabel(0x74)).toBe('t');
    expect(byteLabel(0x20)).toBe('·');
    expect(byteLabel(0xed)).toBe('ED');
  });

  // 본문: 글자의 일부인 바이트 조각은 글자로 보이지 않는다(0x… 로 적는다).
  it('묶음은 글자가 될 때만 글자로 읽는다. 글자의 일부는 읽지 않는다', () => {
    expect(pieceText(toBytes('토'))).toBe('토');
    expect(pieceText(toBytes('토').slice(0, 2))).toBeNull();
    expect(pieceText(toBytes(' token'))).toBe('·token');
    expect(sideText([...toBytes('토'), 0xed, 0x81])).toBe('토 ED 81');
  });

  it('방금 쓴 규칙은 과정의 단계와 같다', () => {
    const plan = planFor('token');
    expect(lastRule(plan, 0)).toBeNull();
    const last = plan.steps[plan.steps.length - 1];
    expect(lastRule(plan, plan.steps.length)).toEqual({ number: last.rank + 1, text: `${sideText(last.rule.left)} + ${sideText(last.rule.right)}` });
  });
});

describe('bpeScene', () => {
  it('모든 예시와 단계를 숫자 오류 없이 그린다', () => {
    for (const text of [...PRESETS, '', 'the model cost is not a word']) {
      const plan = planFor(text);
      for (let step = 0; step <= plan.steps.length; step += 0.5) {
        expect(draw({ text, step, running: step % 1 !== 0, note: '' }), `${text} ${step}`).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('타일은 바이트 수만큼, 글자 이름은 둘 이상 묶여 글자로 읽히는 묶음에만 붙는다', () => {
    const tileTexts = (svg: string) => texts(svg).filter((t) => t.tag.includes(`font-size="${tileLabelSize(1)}"`));
    const groupTexts = (svg: string) => texts(svg).filter((t) => t.tag.includes(`font-size="${groupLabelSize(1)}"`)).map((t) => t.body);
    expect(tileTexts(draw(initialBpe('토큰'))).length).toBe(6);
    expect(groupTexts(draw(initialBpe('토큰')))).toEqual(['토큰']);
    expect(groupTexts(draw(initialBpe('2026')))).toEqual(['20', '26']);
    expect(groupTexts(draw(initialBpe('뷁')))).toEqual([]);
    expect(groupTexts(draw({ ...initialBpe('토큰'), step: 0 }))).toEqual([]);
  });

  it('묶음 사이는 벌어지고 묶음 안은 붙어 있으며, 합치는 쌍만 틈이 좁아진다', () => {
    const spans = groupSpans([2, 3, 1]);
    expect(spans[0].yR - spans[1].yL).toBeGreaterThan(2);
    expect(spans[0].yL - spans[0].yR).toBeCloseTo(2 * TILE.w + 0.8, 9);
    const half = groupSpans([2, 3, 1], 0, 0.5);
    expect(half[0].yR - half[1].yL).toBeLessThan(spans[0].yR - spans[1].yL);
    expect(half[1].yR - half[2].yL).toBeCloseTo(spans[1].yR - spans[2].yL, 9);
  });

  it('글자는 좁은 화면에서도 제자리에 든다: 타일 글자는 타일 폭, 묶음 이름은 묶음 폭, 규칙은 종이 폭 안', () => {
    for (const scale of [1, 1.6, 2.2]) {
      expect(2 * 0.66 * tileLabelSize(scale)).toBeLessThan(TILE.w);
      // 규칙표는 선반 뒤에 서므로, 종이 글자는 묶음 이름보다 위에 있어야 겹치지 않는다.
      expect(paperTextBottom(scale), `${scale}`).toBeGreaterThan(groupLabelTop(scale));
      for (const text of [...PRESETS, 'the', 'ing']) {
        const plan = planFor(text);
        const final = tokensAt(plan, plan.steps.length);
        const spans = groupSpans(final.map((g) => g.length));
        final.forEach((g, i) => {
          const read = g.length > 1 ? pieceText(g) : null;
          if (!read) return;
          const width = [...read].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * groupLabelSize(scale);
          expect(width, `${read} ${scale}`).toBeLessThanOrEqual(spans[i].yL - spans[i].yR + 2 * 3.5);
        });
        for (let k = 1; k <= plan.steps.length; k++) {
          const rule = lastRule(plan, k)!;
          expect([...rule.text].length * 0.66 * ruleTextSize(rule.text, Math.min(1.5, scale))).toBeLessThanOrEqual(PAPER_W - 6 + 1e-9);
        }
      }
    }
  });

  // AGENTS.md: 한글이 섞인 라벨은 일반 글꼴로 쓴다.
  it('한글이 든 글자는 일반 글꼴로, 타일의 바이트는 고정폭으로 쓴다', () => {
    for (const t of texts(draw(initialBpe('토큰')))) {
      if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
      else if (/^[0-9A-F]{2}$/.test(t.body)) expect(t.tag, t.body).toContain('font-family=');
    }
  });
});
