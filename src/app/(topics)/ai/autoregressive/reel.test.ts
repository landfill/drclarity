import * as ENGINE from '@/lib/colorfigures/core';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { MONO_FONT, palette } from '@/styles/palette';
import { SAMPLES } from './loop';
import {
  STAGE_SECONDS,
  advanceReel,
  cachedCount,
  endOf,
  initialReel,
  isSettled,
  nextAction,
  rewind,
  statusText,
  stepBack,
  stepOnce,
  stepsOf,
  togglePlay,
  view,
  visibleText,
  type ReelState,
} from './reel';
import { CELL_TEXT_MAX, LAMP_U, REEL_SIZE, TAPE, cells, cellTextSize, lampLabelSize, reelScene, textWidth } from './reelScene';

const run = (s: ReelState) => settle(s, advanceReel, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(REEL_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: ReelState, labelScale = 1) => withFrame(frame(labelScale), () => reelScene(s));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));
const at = (sample: (typeof SAMPLES)[number], cursor: number): ReelState => ({ ...initialReel(sample), cursor });

describe('순서', () => {
  it('한 단계씩 끝까지 가면 마지막 바퀴의 고르기에서 멈춘다', () => {
    for (const sample of SAMPLES) {
      let s = initialReel(sample);
      while (s.cursor < endOf(s)) s = run(stepOnce(s));
      const v = view(s);
      expect(v.stage).toBe('pick');
      expect(v.isFinal).toBe(true);
      expect(nextAction(s)).toBe('rewind');
      expect(statusText(s)).toBe('모델이 “여기서 끝”을 골랐습니다. 더 붙이지 않습니다.');
    }
  });

  it('끝에서의 한 단계, 처음에서의 되감기와 처음으로는 상태를 바꾸지 않고 이유를 알린다', () => {
    const check = (t: ReelState, s: ReelState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t)).toContain(word);
    };
    const s0 = initialReel(SAMPLES[0]);
    check(stepBack(s0), s0, '이미 첫');
    check(rewind(s0), s0, '이미 처음');
    const end = at(SAMPLES[0], endOf(s0));
    check(stepOnce(end), end, '멈췄습니다');
  });

  it('재생은 단계마다 0.7초씩 넘기고 끝에서 멈춘다. 끝에서 누르면 처음부터 다시 재생한다', () => {
    let s = togglePlay(initialReel(SAMPLES[0]));
    expect(nextAction(s)).toBe('pause');
    for (let i = 0; i < Math.round(STAGE_SECONDS * 60) + 1; i++) s = advanceReel(s, 1 / 60);
    expect(s.cursor).toBe(1);
    s = run(s);
    expect(s.cursor).toBe(endOf(s));
    expect(s.playing).toBe(false);
    const again = togglePlay(s);
    expect(again).toMatchObject({ cursor: 0, playing: true });
    expect(togglePlay(again).playing).toBe(false);
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    const sample = SAMPLES[1];
    const end = endOf(initialReel(sample));
    const states = [initialReel(sample), at(sample, 3), at(sample, end), togglePlay(initialReel(sample))];
    for (const s of states) {
      const a = nextAction(s);
      if (a === 'step') expect(stepOnce(s).note).toBe('');
      if (a === 'rewind') expect(rewind(s).note).toBe('');
      if (a === 'pause') expect(togglePlay(s).playing).toBe(false);
    }
  });
});

describe('테이프와 저장된 계산', () => {
  it('④ 끝에 붙이기에서 고른 조각이 테이프 끝에 붙고, 다음 바퀴의 입력이 된다', () => {
    const sample = SAMPLES[0];
    const steps = stepsOf(initialReel(sample));
    for (let i = 0; i < steps.length - 1; i++) {
      const append = view(at(sample, i * 4 + 3));
      expect(append.stage).toBe('append');
      expect(append.context.at(-1)).toBe(steps[i].emitted);
      expect(view(at(sample, (i + 1) * 4)).context).toEqual(append.context);
    }
  });

  // about.mdx: KV 캐시를 쓰는 추론에서는 처음 입력을 처리한 뒤, 새 토큰과 저장해 둔 계산 결과를 사용한다.
  it('저장된 계산은 ② 앞말 참고에서만 늘고, 그때 테이프의 조각 수와 같아진다', () => {
    const sample = SAMPLES[1];
    const end = endOf(initialReel(sample));
    let prev = 0;
    for (let c = 0; c <= end; c++) {
      const s = at(sample, c);
      const n = cachedCount(s);
      const { stage, step } = view(s);
      if (stage === 'read') expect(n).toBe(step.context.length);
      else expect(n).toBe(prev);
      prev = n;
    }
    expect(cachedCount(at(sample, 0))).toBe(0);
    expect(cachedCount(at(sample, 1))).toBe(sample.prompt.length);
  });

  // 퀴즈의 오답 "답 전체를 미리 정한 뒤 조금씩 보여준다" 를 되살리지 않는다: 아직 고르지 않은 조각은 그리지 않는다.
  it('아직 고르지 않은 조각은 장면 어디에도 없다', () => {
    const sample = SAMPLES[0];
    const end = endOf(initialReel(sample));
    for (let c = 0; c <= end; c++) {
      const s = at(sample, c);
      const { stepIndex, stage } = view(s);
      const decided = sample.completion.slice(0, stepIndex + (stage === 'pick' || stage === 'append' ? 1 : 0));
      const future = sample.completion.slice(decided.length).map(visibleText);
      const bodies = texts(draw(s)).map((t) => t.body);
      for (const f of future) if (!decided.map(visibleText).includes(f)) expect(bodies, `cursor ${c}`).not.toContain(f);
    }
  });
});

describe('reelScene', () => {
  it('모든 단계와 움직임을 숫자 오류 없이 그린다', () => {
    for (const sample of SAMPLES) {
      const end = endOf(initialReel(sample));
      for (let c = 0; c <= end; c++) for (const t of [0, 0.5, 1]) for (const scale of [1, 2.2]) expect(draw({ ...at(sample, c), t }, scale)).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('가장 긴 테이프도 테이프 줄 안에 들고, 칸 글자는 칸 안에 든다', () => {
    for (const sample of SAMPLES) {
      const all = [...sample.prompt, ...sample.completion];
      const cs = cells(all);
      expect(cs.at(-1)!.uR).toBeGreaterThanOrEqual(TAPE.u0 + 1);
      for (const scale of [1, 1.6, 2.2]) {
        expect(cellTextSize(scale)).toBeLessThanOrEqual(CELL_TEXT_MAX);
        all.forEach((tok, i) => expect(textWidth(visibleText(tok), cellTextSize(scale))).toBeLessThanOrEqual(cs[i].uL - cs[i].uR));
      }
    }
  });

  it('단계 등의 이름은 좁은 화면에서도 서로 겹치지 않는다', () => {
    const names = ['① 입력 확인', '② 앞말 참고', '③ 하나 고르기', '④ 끝에 붙이기 ↻'];
    for (const scale of [1, 1.6, 2.2]) {
      const small = lampLabelSize(scale);
      // 동그라미 숫자와 화살표는 한 글자 폭으로 센다.
      const w = (n: string) => textWidth(n.replace(/[①②③④↻]/g, '가'), small);
      for (let i = 1; i < LAMP_U.length; i++) expect(LAMP_U[i - 1] - LAMP_U[i]).toBeGreaterThan((w(names[i - 1]) + w(names[i])) / 2 + 2);
      expect(LAMP_U.at(-1)! - w(names.at(-1)!) / 2).toBeGreaterThan(9);
    }
  });

  it('한글이 든 글자는 일반 글꼴, 테이프 칸의 글자는 고정폭으로 쓴다', () => {
    const s = at(SAMPLES[0], 7);
    const cellBodies = new Set(view(s).context.map(visibleText));
    for (const t of texts(draw(s))) {
      if (cellBodies.has(t.body)) expect(t.tag, t.body).toContain(MONO_FONT);
      else if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
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
    for (const s of [at(SAMPLES[0], 1), at(SAMPLES[0], 3), { ...at(SAMPLES[1], 7), t: 0.5 }, at(SAMPLES[1], endOf(initialReel(SAMPLES[1])))]) {
      const svg = withFrame({ ...frameFor(REEL_SIZE, 'c', { view: FRONT_VIEW }), labelScale: 1 }, () => reelScene(s));
      for (const [, c] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
    }
  });
});
