import * as ENGINE from '@/lib/colorfigures/core';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { palette } from '@/styles/palette';
import { DH_PRESETS, secretRange } from './dh';
import {
  ACTION_ORDER,
  act,
  advanceTrial,
  initialTrial,
  isSettled,
  nextAction,
  setPreset,
  setSecret,
  statusText,
  tapeRows,
  triedCount,
  values,
  type TrialState,
} from './trial';
import { COL, ROWS, TAPE, TRIAL_SIZE, cardTexts, labelSize, textWidth, trialScene } from './trialScene';

const run = (s: TrialState) => settle(s, advanceTrial, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(TRIAL_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: TrialState, labelScale = 1) => withFrame(frame(labelScale), () => trialScene(s));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));
const through = (s: TrialState, n: number) => ACTION_ORDER.slice(0, n).reduce((acc, a) => run(act(acc, a)), s);

describe('순서', () => {
  it('본문 순서: 만들기 → 주고받기 → 마무리 → 도청자가 풀어보기', () => {
    let s = initialTrial();
    for (const a of ACTION_ORDER) {
      expect(nextAction(s)).toBe(a);
      s = run(act(s, a));
      expect(s.note).toBe('');
    }
    expect(s.step).toBe(3);
    expect(triedCount(s)).toBe(values(s).attack.attempts);
    expect(nextAction(s)).toBeNull();
  });

  it('순서를 건너뛴 입력, 움직이는 중의 입력, 이미 한 일은 상태를 바꾸지 않고 이유를 알린다', () => {
    const check = (t: TrialState, s: TrialState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t)).toContain(word);
    };
    const s0 = initialTrial();
    check(act(s0, 'send'), s0, '아직 보낼 수가');
    check(act(s0, 'finish'), s0, '아직 받은 수가');
    check(act(s0, 'attack'), s0, '아직 아무 수도');
    const made = through(s0, 1);
    check(act(made, 'make'), made, '이미');
    const sending = advanceTrial(act(made, 'send'), 0.2);
    expect(isSettled(sending)).toBe(false);
    for (const a of ACTION_ORDER) check(act(sending, a), sending, '건너는 중');
    const attacking = advanceTrial(act(through(s0, 3), 'attack'), 0.05);
    expect(isSettled(attacking)).toBe(false);
    check(act(attacking, 'attack'), attacking, '넣어 보는 중');
    const done = through(s0, 4);
    check(act(done, 'attack'), done, '이미');
    check(act(done, 'finish'), done, '이미');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    const sending = advanceTrial(act(through(initialTrial(), 1), 'send'), 0.2);
    expect(nextAction(sending)).toBeNull();
    for (let n = 0; n < 4; n++) {
      const s = through(initialTrial(), n);
      const a = nextAction(s)!;
      expect(act(s, a).note).toBe('');
    }
  });

  it('세밀 조절은 수를 새로 계산하고 도청자의 시도를 비운다. 비밀은 새 p 의 범위로 당긴다', () => {
    const done = through(initialTrial(), 4);
    const s = setSecret(done, 'a', 9);
    expect(s).toMatchObject({ a: 9, tried: null, step: 3, note: '' });
    expect(nextAction(s)).toBe('attack');
    const big = setSecret(setPreset(initialTrial(), 'p227'), 'a', 200);
    const small = setPreset(big, 'p23');
    expect(small.a).toBe(secretRange(23).max);
  });
});

describe('본문과 같은 수', () => {
  // math-punchline: "두 사람이 같은 수에 도달했습니다."
  it('두 사람의 마무리 카드는 같은 수다', () => {
    for (const preset of DH_PRESETS) {
      const { min, max } = secretRange(preset.p);
      for (const a of [min, Math.floor((min + max) / 2), max])
        for (const b of [min, max]) {
          const t = cardTexts({ ...initialTrial(), presetId: preset.id, a, b });
          expect(t.aliceShared.split(' = ').at(-1)).toBe(t.bobShared.split(' = ').at(-1));
        }
    }
  });

  // math-punchline: "이 수는 한 번도 통로를 지나지 않았습니다." 도청자 칸과 통로에는 공유 비밀이 없다.
  it('도청자는 공개 값과 보낸 두 수만 적고, 비밀과 공유 비밀은 그림의 어느 도청자 자리에도 없다', () => {
    const s = through(initialTrial(), 3);
    const { A, B, shared } = values(s);
    // 보낸 수와 공유 비밀이 우연히 같으면 이 검사가 뜻을 잃는다.
    expect(new Set([A, B, shared]).size).toBe(3);
    const t = cardTexts(s);
    expect(t.heard).toBe(`들음 ${A} · ${B}`);
    const bodies = texts(draw(s)).map((x) => x.body);
    // 공유 비밀은 두 사람의 마무리 카드 둘에만 나온다.
    expect(bodies.filter((b) => b.endsWith(`= ${shared}`))).toEqual([t.aliceShared, t.bobShared]);
    expect(bodies).toContain('두 사람의 수는 못 들음');
    expect(bodies).toContain('비밀은 못 들음');
  });

  // eaves-explain: "x 를 1 부터 하나씩 넣어 보는 수밖에 없습니다."
  it('도청자 테이프는 x 를 1 부터 차례로 넣고, 맞은 줄에서 멈춘다', () => {
    const s = through(initialTrial(), 4);
    const { attack, A } = values(s);
    const rows = tapeRows(s, 1000);
    expect(rows.map((r) => r.x)).toEqual(Array.from({ length: attack.attempts }, (_, i) => i + 1));
    expect(rows.at(-1)).toMatchObject({ x: attack.exponent, value: A, hit: true });
    expect(rows.slice(0, -1).every((r) => !r.hit)).toBe(true);
  });

  it('도청자는 시도가 많아도 몇 초 안에 끝나고, 넣어 본 수는 정수로 센다', () => {
    const s = act(through(setSecret(setPreset(initialTrial(), 'p227'), 'a', 200), 3), 'attack');
    let t = s;
    let elapsed = 0;
    while (!isSettled(t)) {
      t = advanceTrial(t, 1 / 30);
      elapsed += 1 / 30;
      expect(Number.isInteger(triedCount(t))).toBe(true);
    }
    expect(elapsed).toBeLessThan(5);
  });
});

describe('trialScene', () => {
  it('모든 단계와 움직임을 숫자 오류 없이 그린다', () => {
    for (const preset of DH_PRESETS)
      for (let n = 0; n <= 4; n++) {
        const s = through(setPreset(initialTrial(), preset.id), n);
        for (const scale of [1, 2.2]) expect(draw(s, scale)).not.toMatch(/NaN|undefined|Infinity/);
        if (n >= 2) for (const travel of [0, 0.5]) expect(draw({ ...s, travel })).not.toMatch(/NaN|undefined|Infinity/);
      }
  });

  it('카드 글자는 좁은 화면에서도 카드 폭 안에 든다', () => {
    for (const preset of DH_PRESETS) {
      const { max } = secretRange(preset.p);
      const s = { ...initialTrial(), presetId: preset.id, a: max, b: max };
      for (const scale of [1, 1.6, 2.2]) {
        const size = labelSize(scale);
        for (const str of Object.values(cardTexts(s))) expect(textWidth(str, size), str).toBeLessThan(COL.w - 6);
      }
    }
  });

  it('도청자 테이프는 통로 위, 마무리 줄 아래에 든다', () => {
    expect(TAPE.top + 2.5 + labelSize(2.2)).toBeLessThan(ROWS.shared[0] + 0.1 + 6);
    expect(TAPE.top - TAPE.rows * TAPE.rowH).toBeGreaterThan(ROWS.laneAtoB[1]);
  });

  it('한글이 든 글자는 일반 글꼴로 쓴다', () => {
    const s = through(initialTrial(), 4);
    for (const t of texts(draw(s))) if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
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
    for (let n = 0; n <= 4; n++)
      for (const [, c] of draw(through(initialTrial(), n)).matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
  });
});
