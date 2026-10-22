import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as ENGINE from '@/lib/colorfigures/core';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { palette } from '@/styles/palette';
import { MAX_LENGTH, MIN_LENGTH, buildGrid, cachedEntries, computedCount } from './grid';
import { PLAY_SECONDS, advanceKv, compare, gridAlt, initialKv, isSettled, nextAction, observation, readouts, rewind, setLength, setStep, statusText, stepOnce, togglePlay, type KvState } from './tiles';
import { CELL_COLOR, GRID, MEMO, TILES_SIZE, cellBox, labelSize, textWidth, tilesScene } from './tilesScene';

const run = (s: KvState) => settle(s, advanceKv, isSettled);
const draw = (s: KvState, labelScale = 1) => withFrame({ ...frameFor(TILES_SIZE, 't', { view: FRONT_VIEW }), labelScale }, () => tilesScene(s));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));

describe('순서', () => {
  it('본문 순서: 캐시 없이 끝까지 → 캐시 켜고 끝까지', () => {
    let s = initialKv();
    expect(nextAction(s)).toBe('off');
    s = compare(s, false);
    expect(s).toMatchObject({ cacheOn: false, step: s.length });
    expect(nextAction(s)).toBe('on');
    s = compare(s, true);
    expect(s).toMatchObject({ cacheOn: true, step: s.length });
    expect(nextAction(s)).toBe('off');
  });

  it('이미 그 상태의 비교, 끝에서 한 토큰 더, 처음에서 처음으로는 상태를 바꾸지 않고 이유를 알린다', () => {
    const check = (t: KvState, s: KvState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t)).toContain(word);
    };
    const off = compare(initialKv(), false);
    check(compare(off, false), off, '이미');
    check(stepOnce(off), off, '모두 처리');
    const zero = rewind(off);
    check(rewind(zero), zero, '이미 처음');
  });

  it('재생은 0.45초마다 한 줄씩 늘고 끝에서 멈춘다. 끝에서 누르면 처음부터 다시 재생한다', () => {
    let s = togglePlay({ ...initialKv(), step: 0 });
    expect(nextAction(s)).toBe('pause');
    for (let i = 0; i < Math.round(PLAY_SECONDS * 60) + 1; i++) s = advanceKv(s, 1 / 60);
    expect(s.step).toBe(1);
    s = run(s);
    expect(s).toMatchObject({ step: s.length, playing: false });
    expect(togglePlay(s)).toMatchObject({ step: 0, playing: true });
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    const s0 = initialKv();
    for (const s of [s0, compare(s0, false), compare(s0, true), togglePlay(s0), setStep(s0, 2)]) {
      const a = nextAction(s);
      if (a === 'off') expect(compare(s, false).note).toBe('');
      if (a === 'on') expect(compare(s, true).note).toBe('');
      if (a === 'pause') expect(togglePlay(s).playing).toBe(false);
    }
  });

  it('세밀 조절: 길이를 줄이면 진행도 같이 당기고, 범위를 벗어나지 않는다', () => {
    const s = setLength({ ...initialKv(), length: 12, step: 10 }, 6);
    expect(s).toMatchObject({ length: 6, step: 6 });
    expect(setLength(s, 99).length).toBe(MAX_LENGTH);
    expect(setLength(s, 1).length).toBe(MIN_LENGTH);
    expect(setStep(s, 50).step).toBe(s.length);
  });
});

describe('본문과 같은 수치', () => {
  it('수치와 관찰 문구는 grid.ts 의 계산 그대로다', () => {
    const on = compare(initialKv(), true);
    expect(readouts(on)).toEqual({ computed: 8, reused: 28, memos: 8, ratio: '4.5배' });
    expect(readouts(compare(initialKv(), false))).toMatchObject({ computed: 36, reused: 0, memos: 0, ratio: '—' });
    expect(observation(on)).toBe('8토큰까지 K·V를 만드는 작업: 캐시 없이 36칸 → 캐시를 켜면 8칸. 대신 8토큰의 메모를 보관합니다.');
    expect(gridAlt({ ...initialKv(), step: 0 })).toContain('비어 있습니다');
  });

  // memo.mdx: 계산을 아끼는 대신 메모리를 쓴다. 메모 상자의 장 수가 cachedEntries 다.
  it('메모 상자는 캐시를 켰을 때만 처리한 토큰 수만큼 쌓이고, 16장까지 상자에 든다', () => {
    for (let step = 0; step <= MAX_LENGTH; step++) {
      expect(readouts({ ...initialKv(), length: MAX_LENGTH, step, cacheOn: true }).memos).toBe(cachedEntries(step, true));
      expect(readouts({ ...initialKv(), length: MAX_LENGTH, step, cacheOn: false }).memos).toBe(0);
    }
    expect(MEMO.cols * Math.ceil(MAX_LENGTH / MEMO.cols)).toBeGreaterThanOrEqual(MAX_LENGTH);
    expect(readFileSync(new URL('./content/memo.mdx', import.meta.url), 'utf8')).toContain('대신 저장 공간이 필요하고');
  });
});

describe('tilesScene', () => {
  it('모든 길이 · 진행 · 캐시에서 숫자 오류 없이 그린다', () => {
    for (let length = MIN_LENGTH; length <= MAX_LENGTH; length++) {
      for (const step of [0, 1, 2, length]) for (const cacheOn of [false, true]) expect(draw({ ...initialKv(), length, step, cacheOn })).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('타일은 판 안에 들고, 칸 색은 예전 격자의 칸 상태와 같다', () => {
    for (const length of [MIN_LENGTH, 8, MAX_LENGTH]) {
      const last = cellBox(length, length - 1, length - 1);
      expect(last.uR).toBeCloseTo(GRID.u - GRID.size, 6);
      expect(last.vB).toBeCloseTo(GRID.v - GRID.size, 6);
      expect(GRID.u - GRID.size).toBeGreaterThan(MEMO.u1 + 2);
    }
    const s = compare(initialKv(), true);
    const svg = draw(s);
    const grid = buildGrid(s.length, s.step, true);
    const counts = { computed: 0, reused: 0, empty: 0 };
    for (const row of grid) for (const c of row) counts[c] += 1;
    expect(counts.computed).toBe(computedCount(s.step, true));
    for (const st of ['computed', 'reused'] as const) expect(svg).toContain(CELL_COLOR[st]);
  });

  it('글자는 좁은 화면에서도 메모 상자와 판을 넘지 않는다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      const small = labelSize(scale) * 0.85;
      expect(textWidth(`적어둔 메모 ${MAX_LENGTH}개`, small)).toBeLessThan(MEMO.u1 - MEMO.u0 - 2);
      expect(textWidth('K·V를 가진 토큰 →', small)).toBeLessThan(GRID.size);
    }
  });

  it('한글이 든 글자는 일반 글꼴로 쓴다', () => {
    for (const t of texts(draw(compare(initialKv(), true)))) if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
  });

  // AGENTS.md "색과 글자": 그림 색은 엔진의 PALS 와 재질에서 고른다.
  it('그림에 쓰인 색은 모두 엔진의 PALS · 재질 · 잉크 색이다', () => {
    const allowed = new Set<string>(
      [...Object.values(ENGINE.PALS), ENGINE.METAL, ENGINE.CLEAR, ENGINE.CERAMIC, ENGINE.DARK, ENGINE.BOARD, ENGINE.WOOD]
        .flatMap((m) => [m.l, m.m, m.d])
        .concat([ENGINE.INK, ENGINE.SHADOW, palette.muted])
        .map((c) => c.toLowerCase()),
    );
    for (const s of [initialKv(), compare(initialKv(), true), { ...initialKv(), length: 16, step: 9, cacheOn: true }]) {
      for (const [, c] of draw(s).matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
    }
  });
});
