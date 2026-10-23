import { describe, expect, it } from 'vitest';
import * as ENGINE from '@/lib/colorfigures/core';
import { FRONT_VIEW, frameFor, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { MONO_FONT, palette } from '@/styles/palette';
import { MAX_TURNS, MIN_TURNS, WINDOW_SIZES } from './conversation';
import { PRESETS, activePreset, alreadyNote, blockName, nextAction, observation, pressPreset, windowOf } from './rail';
import { RAIL, RAIL_SIZE, TOKEN_W, blockTextSize, blocks, frame, frameLabelU, labelSize, railScene, textWidth } from './railScene';

const draw = (turns: number, size: number, labelScale = 1) =>
  withFrame({ ...frameFor(RAIL_SIZE, 't', { view: FRONT_VIEW }), labelScale }, () => railScene(windowOf(turns, size)));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));
const ALL: [number, number][] = [];
for (let n = MIN_TURNS; n <= MAX_TURNS; n++) for (const w of WINDOW_SIZES) ALL.push([n, w]);

describe('세 버튼', () => {
  it('값은 예전 화면 그대로다: 짧은 대화 4·300, 긴 대화 12·300, 창 넓히기 12·800', () => {
    expect(PRESETS.short).toMatchObject({ turns: 4, window: 300 });
    expect(PRESETS.long).toMatchObject({ turns: 12, window: 300 });
    expect(PRESETS.wide).toMatchObject({ turns: 12, window: 800 });
  });

  it('본문 순서(짧은 대화 → 긴 대화 → 창 넓히기)대로 다음 버튼을 권하고, 권한 버튼은 지금 상태와 다르다', () => {
    expect(activePreset(4, 300)).toBe('short');
    expect(nextAction('short')).toBe('long');
    expect(nextAction('long')).toBe('wide');
    expect(nextAction('wide')).toBeNull();
    expect(nextAction(activePreset(7, 500))).toBe('short');
    for (const p of ['short', 'long', 'wide', null] as const) expect(nextAction(p)).not.toBe(p);
    expect(alreadyNote('short')).toContain('2. 긴 대화');
  });

  // 본문: 이름을 못 답하는 이유는 이름이 든 메시지가 입력에서 빠졌기 때문이다. 창을 넓히면 다시 들어온다.
  it('이미 그 상태인 버튼과 순서를 건너뛴 버튼(짧은 대화에서 바로 창 넓히기)은 값을 바꾸지 않고 이유를 알린다', () => {
    for (const p of ['short', 'long', 'wide'] as const) expect(pressPreset(p, p)).toEqual({ apply: false, note: alreadyNote(p) });
    const skip = pressPreset('short', 'wide');
    expect(skip.apply).toBe(false);
    expect(skip.note).toContain(PRESETS.long.label);
    // 본문 순서, 되돌아가기, 세밀 조절로 만든 값에서는 받는다.
    for (const [from, to] of [['short', 'long'], ['long', 'wide'], ['wide', 'short'], ['wide', 'long'], ['long', 'short'], [null, 'wide'], [null, 'short']] as const)
      expect(pressPreset(from, to)).toEqual({ apply: true, note: '' });
  });

  it('nextAction 이 권하는 버튼은 지금 누르면 받아들여진다', () => {
    for (const p of ['short', 'long', null] as const) expect(pressPreset(p, nextAction(p)!).apply).toBe(true);
  });

  it('짧은 대화는 이름이 입력 안, 긴 대화는 입력 밖, 창 넓히기는 다시 입력 안이다', () => {
    expect(windowOf(4, 300).remembersName).toBe(true);
    expect(windowOf(12, 300).remembersName).toBe(false);
    expect(windowOf(12, 800).remembersName).toBe(true);
    expect(observation(windowOf(12, 300))).toBe('이름을 알려준 첫 메시지: 입력 밖으로 빠짐 → 이름을 답할 근거가 없음. 오래된 메시지 7개가 창 밖으로 밀려나 전달되지 않습니다.');
    expect(observation(windowOf(4, 300))).toContain('대화 전체가 창 안에 들어갑니다.');
  });
});

describe('레일과 틀', () => {
  it('블록은 오래된 것부터 빈틈없이 놓이고, 폭은 토큰 수에 비례하며, 가장 최근이 오른쪽 끝에 닿는다', () => {
    for (const [n, w] of ALL) {
      const s = windowOf(n, w);
      const bs = blocks(s);
      expect(bs.at(-1)!.uR).toBe(RAIL.right);
      s.turns.forEach((t, i) => {
        expect(bs[i].uL - bs[i].uR).toBeCloseTo(t.tokens * TOKEN_W, 9);
        if (i > 0) expect(bs[i - 1].uR).toBeCloseTo(bs[i].uL, 9);
      });
    }
  });

  // fitToWindow: 메시지를 통째로, 최근 것부터 담고, 넘치면 그 앞은 모두 밖이다.
  it('실선 틀은 입력 안 블록을 정확히 감싸고, 입력 밖 블록은 모두 틀 왼쪽에 있다', () => {
    for (const [n, w] of ALL) {
      const s = windowOf(n, w);
      const bs = blocks(s);
      const f = frame(s);
      const kept = s.turns.map((t, i) => (t.inWindow ? i : -1)).filter((i) => i >= 0);
      if (kept.length) expect(f.usedL).toBeCloseTo(bs[kept[0]].uL, 9);
      s.turns.forEach((t, i) => {
        if (!t.inWindow) expect(bs[i].uR).toBeGreaterThanOrEqual(f.usedL - 1e-9);
      });
      expect(f.limitL).toBeGreaterThanOrEqual(f.usedL);
      // 가장 넓은 창도 판 안에 든다.
      expect(f.limitL).toBeLessThan(188);
    }
  });

  // 퀴즈 오답 "시간이 지나 이름이 흐려졌다" 를 되살리지 않는다: 입력 밖 블록을 흐리게(투명하게) 그리지 않는다.
  it('입력 밖 블록도 흐리게 그리지 않는다', () => {
    for (const [n, w] of [[12, 300], [12, 150]] as const) expect(draw(n, w)).not.toMatch(/opacity/);
  });
});

describe('railScene', () => {
  it('모든 대화 길이와 창 크기를 숫자 오류 없이 그린다', () => {
    for (const [n, w] of ALL) for (const scale of [1, 2.2]) expect(draw(n, w, scale)).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('블록 이름은 예전 메시지 지도 그대로이고, 좁은 블록의 이름은 블록 위에 적는다', () => {
    const s = windowOf(12, 300);
    expect(s.turns.map((t, i) => blockName(i, t.id))).toEqual(['이름', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '질문']);
    const bodies = texts(draw(12, 300)).map((t) => t.body);
    for (const name of ['이름', '질문', '12', '입력 밖 7개 · 기록에는 그대로', '이번 입력: 293 / 300토큰']) expect(bodies).toContain(name);
  });

  it('글자는 좁은 화면에서도 판을 넘지 않는다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      const size = labelSize(scale);
      for (const [n, w] of ALL) {
        const s = windowOf(n, w);
        const u = frameLabelU(s, size);
        const half = textWidth(`이번 입력: ${s.used} / ${s.limit}토큰`, size) / 2;
        expect(u - half).toBeGreaterThanOrEqual(10 - 1e-9);
        expect(u + half).toBeLessThanOrEqual(190);
      }
      // 블록 안 순번은 블록에 든다 (안에 쓰기로 한 경우).
      const bs = blocks(windowOf(12, 300));
      const narrowest = Math.min(...bs.map((b) => b.uL - b.uR));
      expect(textWidth('9', blockTextSize(scale))).toBeLessThan(narrowest);
    }
  });

  it('순번(숫자만)은 블록 안이든 위든 고정폭으로 쓴다', () => {
    for (const [turns, size] of [[4, 300], [12, 300], [12, 800], [7, 150]] as const) {
      const numbered = windowOf(turns, size).turns.map((t, i) => blockName(i, t.id)).filter((n) => /^\d+$/.test(n));
      const drawn = texts(draw(turns, size)).filter((t) => /^\d+$/.test(t.body));
      // 좁은 블록의 순번(블록 위로 올린 것)도 빠짐없이 그려지고, 모두 고정폭이다.
      expect(drawn.map((t) => t.body).sort()).toEqual([...numbered].sort());
      for (const t of drawn) expect(t.tag, t.body).toContain(MONO_FONT);
    }
  });

  it('한글이 든 글자는 일반 글꼴로 쓴다', () => {
    for (const t of texts(draw(12, 300))) if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
  });

  it('그림에 쓰인 색은 모두 엔진의 PALS · 재질 · 잉크 색이다', () => {
    const allowed = new Set<string>(
      [...Object.values(ENGINE.PALS), ENGINE.METAL, ENGINE.CLEAR, ENGINE.CERAMIC, ENGINE.DARK, ENGINE.BOARD, ENGINE.WOOD]
        .flatMap((m) => [m.l, m.m, m.d])
        .concat([ENGINE.INK, ENGINE.SHADOW, palette.muted])
        .map((c) => c.toLowerCase()),
    );
    for (const [n, w] of [[4, 300], [12, 300], [12, 800]] as const) {
      for (const [, c] of draw(n, w).matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
    }
  });
});
