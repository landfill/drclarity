import * as ENGINE from '@/lib/colorfigures/core';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { palette } from '@/styles/palette';
import { SCOPE_CHOICES, SCOPE_TIERS, summarizeRun } from './search';
import {
  DRAWER_SECONDS,
  SCENARIOS,
  SCENARIO_LABEL,
  activeScenario,
  advanceDrawer,
  chooseScenario,
  drawerView,
  initialDrawer,
  isSettled,
  nextAction,
  progress,
  setExists,
  setScope,
  setShaped,
  setStop,
  statusText,
  summaryOf,
  type DrawerState,
} from './drawer';
import { BAR_LEN, DRAWER_SIZE, FRONT, TIER_COLOR, cardOut, drawerScene, frontTexts, labelSize, tabShown, textWidth } from './drawerScene';

const run = (s: DrawerState) => settle(s, advanceDrawer, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(DRAWER_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: DrawerState, labelScale = 1) => withFrame(frame(labelScale), () => drawerScene(s));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));
const opened = (s: DrawerState) => SCOPE_TIERS.map((_, i) => drawerView(s, i).done);

/** 모든 프롬프트 조합과 상황. */
function allStates(): DrawerState[] {
  const out: DrawerState[] = [];
  for (const scope of SCOPE_CHOICES)
    for (const stopCondition of [false, true])
      for (const outputShaped of [false, true])
        for (const exists of [false, true]) out.push(setExists(setScope(setStop(setShaped(initialDrawer(), outputShaped), stopCondition), scope), exists));
  return out;
}

describe('순서', () => {
  it('본문 순서: 범위 없음 → 폴더에서 멈추기 → 너무 좁게 찾기', () => {
    let s = initialDrawer();
    expect(activeScenario(s)).toBe('bare');
    expect(isSettled(s)).toBe(true);
    // 범위를 안 적으면 프로젝트 전체에서 시작해 위로 번진다.
    expect(opened(s)).toEqual([false, false, true, true, true]);
    expect(nextAction(s)).toBe('folderStop');

    s = chooseScenario(s, 'folderStop');
    expect(opened(s)).toEqual([false, false, false, false, false]);
    s = run(s);
    expect(opened(s)).toEqual([false, true, false, false, false]);
    expect(summaryOf(s).outcome).toBe('absent');
    expect(nextAction(s)).toBe('tooNarrow');

    s = run(chooseScenario(s, 'tooNarrow'));
    expect(opened(s)).toEqual([true, false, false, false, false]);
    expect(summaryOf(s).outcome).toBe('missed');
    expect(nextAction(s)).toBe('bare');
  });

  it('서랍은 탐색하는 순서대로 하나씩 열린다', () => {
    let s = chooseScenario(run(chooseScenario(initialDrawer(), 'folderStop')), 'bare');
    const order: number[] = [];
    let seen = opened(s);
    while (!isSettled(s)) {
      s = advanceDrawer(s, 1 / 30);
      const now = opened(s);
      now.forEach((o, i) => o && !seen[i] && order.push(i));
      seen = now;
    }
    expect(order).toEqual(summaryOf(s).steps.map((step) => step.tierIndex));
    expect(order).toEqual([2, 3, 4]);
  });

  it('여는 중의 입력과 이미 그 탐색인 버튼은 상태를 바꾸지 않고 이유를 알린다', () => {
    const check = (t: DrawerState, s: DrawerState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t)).toContain(word);
    };
    const s0 = initialDrawer();
    check(chooseScenario(s0, 'bare'), s0, '이미');
    const opening = advanceDrawer(chooseScenario(s0, 'folderStop'), DRAWER_SECONDS / 2);
    expect(isSettled(opening)).toBe(false);
    for (const sc of ['bare', 'folderStop', 'tooNarrow'] as const) check(chooseScenario(opening, sc), opening, '여는 중');
    expect(run(chooseScenario(opening, 'bare')).note).toBe('');
  });

  it('범위 없음에서 폴더에서 멈추기를 건너뛰고 너무 좁게 찾기를 누르면 상태를 바꾸지 않고 이유를 알린다', () => {
    const s = initialDrawer();
    const t = chooseScenario(s, 'tooNarrow');
    expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
    expect(t.note).toContain(SCENARIO_LABEL.folderStop);
    // 본문 순서, 되돌아가기, 세밀 조절로 만든 조건에서는 받는다.
    const folder = run(chooseScenario(s, 'folderStop'));
    expect(chooseScenario(folder, 'tooNarrow').note).toBe('');
    expect(chooseScenario(run(chooseScenario(folder, 'tooNarrow')), 'bare').note).toBe('');
    expect(chooseScenario(setExists(s, true), 'tooNarrow').note).toBe('');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    const opening = advanceDrawer(chooseScenario(initialDrawer(), 'folderStop'), 0.1);
    expect(nextAction(opening)).toBeNull();
    for (const s of [initialDrawer(), run(chooseScenario(run(chooseScenario(initialDrawer(), 'folderStop')), 'tooNarrow')), ...allStates()]) {
      const a = nextAction(s);
      expect(a).not.toBeNull();
      expect(chooseScenario(s, a!).note).toBe('');
    }
  });

  it('세밀 조절은 탐색을 바로 끝난 상태로 둔다', () => {
    const opening = advanceDrawer(chooseScenario(initialDrawer(), 'folderStop'), 0.1);
    for (const s of [setScope(opening, 'file'), setStop(opening, false), setShaped(opening, true), setExists(opening, true)]) {
      expect(isSettled(s)).toBe(true);
      expect(s.note).toBe('');
    }
  });
});

describe('본문과 같은 수치', () => {
  it('다 연 뒤의 호출 수 · 누적 사용량은 summarizeRun 과 같고, 여는 동안은 칸마다 는다', () => {
    for (const end of allStates()) {
      const sum = summarizeRun(end.prompt, end.exists);
      expect(progress(end)).toEqual({ calls: sum.callCount, tokens: sum.tokens });
    }
    let s = chooseScenario(initialDrawer(), 'folderStop');
    s = chooseScenario(run(s), 'bare');
    let last = progress(s);
    expect(last).toEqual({ calls: 0, tokens: 0 });
    while (!isSettled(s)) {
      s = advanceDrawer(s, 1 / 30);
      const p = progress(s);
      expect(p.calls).toBeGreaterThanOrEqual(last.calls);
      expect(p.tokens).toBeGreaterThanOrEqual(last.tokens);
      last = p;
    }
  });

  // panel-a-note: "밝은 칸이 실제로 살펴본 범위입니다. 막대 길이는 그 범위에서 가져온 문맥의 양입니다."
  it('뒤진 칸만 열리고 수치를 적는다. 뒤지지 않은 칸은 닫힌 채 "—" 다', () => {
    for (const s of allStates()) {
      const planned = new Set(summaryOf(s).steps.map((step) => step.tierIndex));
      SCOPE_TIERS.forEach((_, i) => {
        expect(drawerView(s, i).done).toBe(planned.has(i));
        expect(frontTexts(s, i)[1] === '—').toBe(!planned.has(i));
      });
    }
  });

  it('찾는 카드: 찾으면 찾은 칸이 열린 뒤에 나오고, 있는데 못 찾으면 그 폴더 서랍 틈으로 보이고, 없으면 없다', () => {
    for (const s of allStates()) {
      const outcome = summaryOf(s).outcome;
      expect(cardOut(s)).toBe(outcome === 'found');
      expect(tabShown(s)).toBe(outcome === 'missed');
      const bodies = texts(draw(s)).map((t) => t.body);
      expect(bodies.includes('무료배송')).toBe(outcome === 'found');
    }
    // 찾은 칸이 다 열리기 전에는 카드가 아직 없다.
    const found = setExists(setStop(setScope(initialDrawer(), 'folder'), false), true);
    expect(summaryOf(found).outcome).toBe('found');
    expect(cardOut({ ...found, opened: 0, t: 0.9 })).toBe(false);
    expect(cardOut(found)).toBe(true);
  });

  it('너무 좁게 찾기는 싸지만 답이 틀렸다고 적는다', () => {
    const narrow = run(chooseScenario(run(chooseScenario(initialDrawer(), 'folderStop')), 'tooNarrow'));
    expect(summaryOf(narrow).cost).toBeLessThan(summarizeRun(SCENARIOS.bare.prompt, true).cost);
    expect(statusText(narrow)).toContain('답이 틀렸습니다');
  });
});

describe('drawerScene', () => {
  it('모든 조합과 여는 중을 숫자 오류 없이 그린다', () => {
    for (const s of allStates()) {
      for (const scale of [1, 2.2]) expect(draw(s, scale)).not.toMatch(/NaN|undefined|Infinity/);
      const steps = summaryOf(s).steps.length;
      for (let k = 0; k < steps; k++) for (const t of [0, 0.5]) expect(draw({ ...s, opened: k, t })).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('앞판 글자는 좁은 화면에서도 막대와 겹치지 않는다', () => {
    const values = new Set<string>();
    for (const s of allStates()) SCOPE_TIERS.forEach((_, i) => values.add(frontTexts(s, i)[1]));
    for (const scale of [1, 1.6, 2.2]) {
      const size = labelSize(scale);
      for (const tier of SCOPE_TIERS) expect(FRONT.labelL - textWidth(tier.label, size)).toBeGreaterThan(FRONT.barL + 1);
      for (const v of values) expect(FRONT.valueR + textWidth(v, size)).toBeLessThan(FRONT.barL - BAR_LEN - 1);
    }
  });

  it('한글이 든 글자는 일반 글꼴로 쓴다', () => {
    for (const t of texts(draw(initialDrawer()))) if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
  });

  // 예전 search.test.ts 의 "칸마다 막대 색이 있다"(CSS 의 .rung[data-tier] 규칙)를 옮겼다. 칸 id 를 바꾸면 색을 잃는다.
  it('칸마다 막대 색이 있고, 칸끼리 다르다', () => {
    const colors = SCOPE_TIERS.map((tier) => TIER_COLOR[tier.id]);
    for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    expect(new Set(colors).size).toBe(SCOPE_TIERS.length);
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
    for (const s of allStates()) for (const [, c] of draw(s).matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
  });
});
