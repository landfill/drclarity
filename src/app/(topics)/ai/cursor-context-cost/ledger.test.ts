import * as ENGINE from '@/lib/colorfigures/core';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { MONO_FONT, palette } from '@/styles/palette';
import { CONVERSATION_RANGE, SAMPLE_CONTEXT, WINDOW_LIMIT } from './usage';
import {
  CALLS_RANGE,
  ROW_SECONDS,
  advanceLedger,
  choosePreset,
  derive,
  formatTokens,
  initialLedger,
  isSettled,
  nextAction,
  printedTotal,
  setCalls,
  setConversation,
  setTrimmed,
  statusText,
  type LedgerState,
} from './ledger';
import { JAR, LEDGER_SIZE, NOTE, PAPER_HEAD, PAPER_TOTAL_NOTE, jarTitle, noteLines, noteSize, rowHeight, PAPER, ROW, barLength, jarHeight, labelSize, ledgerScene, paperLength, paperSize, rowBox, textWidth } from './ledgerScene';

const run = (s: LedgerState) => settle(s, advanceLedger, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(LEDGER_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: LedgerState, labelScale = 1) => withFrame(frame(labelScale), () => ledgerScene(s));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));
const with_ = (calls: number, extra: Partial<LedgerState> = {}): LedgerState => ({ ...initialLedger(), calls, printed: calls, ...extra });

describe('순서', () => {
  it('처음에는 호출 4번 영수증이 다 찍혀 있고, 본문대로 1번 → 4번을 번갈아 권한다', () => {
    let s = initialLedger();
    expect(s).toMatchObject({ calls: 4, printed: 4 });
    expect(nextAction(s)).toBe('one');
    s = choosePreset(s, 'one');
    expect(s).toMatchObject({ calls: 1, printed: 0, note: '' });
    s = run(s);
    expect(s.printed).toBe(1);
    expect(nextAction(s)).toBe('four');
    s = choosePreset(s, 'four');
    for (let i = 0; i < Math.round(ROW_SECONDS * 60) + 1; i++) s = advanceLedger(s, 1 / 60);
    expect(s.printed).toBe(1);
    s = run(s);
    expect(s).toMatchObject({ calls: 4, printed: 4 });
  });

  it('찍는 중의 입력과 이미 그 영수증인 버튼은 상태를 바꾸지 않고 이유를 알린다', () => {
    const check = (t: LedgerState, s: LedgerState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t)).toContain(word);
    };
    const s0 = initialLedger();
    check(choosePreset(s0, 'four'), s0, '이미');
    const printing = advanceLedger(choosePreset(s0, 'one'), 0.1);
    expect(isSettled(printing)).toBe(false);
    check(choosePreset(printing, 'four'), printing, '찍는 중');
    check(choosePreset(printing, 'one'), printing, '찍는 중');
    // 다 찍으면 거절 문구는 지운다.
    expect(run(choosePreset(printing, 'four')).note).toBe('');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    const printing = advanceLedger(choosePreset(initialLedger(), 'one'), 0.1);
    expect(nextAction(printing)).toBeNull();
    for (const s of [initialLedger(), run(choosePreset(initialLedger(), 'one')), with_(7)]) {
      const a = nextAction(s);
      expect(a).not.toBeNull();
      expect(choosePreset(s, a!).note).toBe('');
    }
  });

  it('세밀 조절은 영수증을 바로 다 찍힌 상태로 두고, 호출 수는 범위를 벗어나지 않는다', () => {
    const printing = advanceLedger(choosePreset(initialLedger(), 'one'), 0.1);
    for (const s of [setConversation(printing, 60_000), setTrimmed(printing, true), setCalls(printing, 6)]) {
      expect(isSettled(s)).toBe(true);
      expect(s.note).toBe('');
    }
    expect(setCalls(initialLedger(), 0).calls).toBe(CALLS_RANGE.min);
    expect(setCalls(initialLedger(), 99).calls).toBe(CALLS_RANGE.max);
    expect(setCalls(initialLedger(), 2.6).calls).toBe(3);
  });
});

describe('본문과 같은 수치', () => {
  // stage-lead: "왼쪽 문맥은 같은데 오른쪽 누계가 늘어납니다."
  it('병(요청 전 문맥)은 호출 수와 상관없이 같고, 누계는 호출 수와 함께 늘어난다', () => {
    const one = derive(with_(1));
    const four = derive(with_(4));
    expect(one.context).toBe(four.context);
    expect(jarHeight(one.context)).toBe(jarHeight(four.context));
    expect(four.grandTotal).toBeGreaterThan(one.grandTotal);
    // 기본값: 155.2K 문맥, 호출 4번이면 Cache Read 629,940 (예전 화면 · usage.test.ts 와 같다).
    expect(formatTokens(four.context)).toBe('155.2K');
    expect(four.totals.cacheRead).toBe(629_940);
  });

  // stage-note: "캐시 읽기는 입력에 덧붙이는 별도 문맥이 아닙니다."
  it('한 줄의 입력 막대는 재사용 · 캐시 저장 · 새 입력으로 나뉠 뿐, 그 호출의 입력보다 길지 않다', () => {
    for (const calls of [1, 4, CALLS_RANGE.max]) {
      for (const call of derive(with_(calls)).scenario) {
        const inputBar = barLength(call.cacheRead) + barLength(call.cacheWrite ?? 0) + barLength(call.input);
        expect(inputBar).toBeCloseTo(barLength(call.activeContext), 9);
      }
    }
  });

  // panel-b-note: "누계는 창 한도보다 클 수 있습니다." 그래도 어느 한 호출도 창을 넘지 않는다.
  it('줄마다 막대는 창 200K 자 안에 들고, 합계는 창보다 클 수 있다', () => {
    for (const conversation of [CONVERSATION_RANGE.min, SAMPLE_CONTEXT.conversation, CONVERSATION_RANGE.max]) {
      for (let calls = CALLS_RANGE.min; calls <= CALLS_RANGE.max; calls++) {
        const d = derive({ conversation, calls, trimmed: false });
        for (const call of d.scenario) expect(barLength(call.activeContext + call.output)).toBeLessThanOrEqual(ROW.barL - ROW.barR + 1e-9);
      }
    }
    expect(derive(initialLedger()).grandTotal).toBeGreaterThan(WINDOW_LIMIT);
  });

  it('머리줄의 누계는 찍힌 줄만큼 늘고, 다 찍으면 합계와 같다', () => {
    let s = choosePreset(initialLedger(), 'one');
    s = choosePreset(run(s), 'four');
    const seen: number[] = [printedTotal(s)];
    while (!isSettled(s)) {
      s = advanceLedger(s, 1 / 30);
      if (printedTotal(s) !== seen.at(-1)) seen.push(printedTotal(s));
    }
    expect(seen[0]).toBe(0);
    expect(seen).toHaveLength(5);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
    expect(seen.at(-1)).toBe(derive(s).grandTotal);
  });

  it('상태 문구는 예전 오른쪽 화면의 관찰 문구 그대로다', () => {
    const d = derive(initialLedger());
    expect(statusText(initialLedger())).toBe(
      `같은 문맥 155.2K가 호출 4번에 걸쳐 다시 실리면서 Cache Read 가 ${formatTokens(d.totals.cacheRead)}까지 쌓였습니다 — 이 행의 ${Math.round((d.totals.cacheRead / d.grandTotal) * 100)}%.`,
    );
    const summarized = with_(CALLS_RANGE.max, { conversation: CONVERSATION_RANGE.max });
    expect(derive(summarized).summarizedCount).toBeGreaterThan(0);
    expect(statusText(summarized)).toContain('요약됐습니다');
  });
});

describe('ledgerScene', () => {
  const states = (): LedgerState[] => {
    const out: LedgerState[] = [];
    for (const conversation of [CONVERSATION_RANGE.min, SAMPLE_CONTEXT.conversation, CONVERSATION_RANGE.max])
      for (const trimmed of [false, true])
        for (const calls of [1, 4, CALLS_RANGE.max]) {
          out.push(with_(calls, { conversation, trimmed }));
          out.push(with_(calls, { conversation, trimmed, printed: calls - 1, feed: 0.5 }));
        }
    return out;
  };

  it('모든 조건과 찍는 중을 숫자 오류 없이 그린다', () => {
    for (const s of states()) for (const scale of [1, 2.2]) expect(draw(s, scale)).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('가장 긴 영수증도 장면 높이 안에 든다', () => {
    const s = with_(CALLS_RANGE.max);
    expect(PAPER.slot + paperLength(s)).toBeLessThanOrEqual(LEDGER_SIZE[2]);
  });

  it('찍는 중인 줄은 기계 밖으로 다 나오기 전에는 글자를 쓰지 않는다', () => {
    const s = with_(4, { printed: 2, feed: 0.4 });
    const bodies = texts(draw(s)).map((t) => t.body);
    expect(bodies).toContain('2회');
    expect(bodies).not.toContain('3회');
    expect(bodies.some((b) => b.startsWith('합계'))).toBe(false);
    // 다 찍힌 줄은 모두 틈 위에 있다.
    for (let i = 0; i < s.printed; i++) expect(rowBox(s, i).vB).toBeGreaterThanOrEqual(PAPER.slot);
  });

  it('영수증 글자는 좁은 화면에서도 종이 안의 제자리에 들고, 줄 높이를 넘지 않는다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      for (let calls = CALLS_RANGE.min; calls <= CALLS_RANGE.max; calls++) {
        const ps = paperSize(scale, calls);
        expect(ps).toBeLessThan(rowHeight(calls));
        expect(textWidth(`${calls}회`, ps)).toBeLessThan(PAPER.u1 - ROW.labelR - 1);
        // 수치 칸: 가장 긴 표기 (예: 199.9K) 는 막대 끝과 종이 끝 사이에 든다. 고정폭이라 한 글자를 0.66 로 센다.
        expect(6 * 0.66 * ps).toBeLessThan(ROW.barR - PAPER.u0);
      }
      const head = paperSize(scale, 1);
      for (const str of [PAPER_HEAD[0], '합계 6,740,910']) expect(textWidth(str, head * 1.15)).toBeLessThan(PAPER.u1 - PAPER.u0 - 2);
      for (const str of [PAPER_HEAD[1], PAPER_TOTAL_NOTE]) expect(textWidth(str, head * 0.85)).toBeLessThan(PAPER.u1 - PAPER.u0 - 2);
      const [n1, n2] = noteLines();
      for (const n of [n1, n2]) expect(textWidth(n, noteSize(scale))).toBeLessThan(NOTE.y1 - NOTE.y0);
    }
  });

  it('병의 글자는 받침판 안에 들고, 층 이름은 층 높이에 맞을 때만 쓴다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      const size = labelSize(scale);
      const [t1, t2] = jarTitle(CONVERSATION_RANGE.max + 30_000, 100);
      expect(JAR.cy + textWidth(t1, size) / 2).toBeLessThan(LEDGER_SIZE[1]);
      expect(JAR.cy + textWidth(t2, size * 0.85) / 2).toBeLessThan(LEDGER_SIZE[1]);
      expect(textWidth('설정·도구 29.6K', size * 0.85)).toBeLessThan(JAR.r * 2);
    }
    const trimmed = draw(with_(4, { trimmed: true, conversation: CONVERSATION_RANGE.min }));
    const d = derive(with_(4, { trimmed: true, conversation: CONVERSATION_RANGE.min }));
    const small = labelSize(1) * 0.85;
    const hasOver = texts(trimmed).some((t) => t.body.startsWith('설정·도구'));
    expect(hasOver).toBe(jarHeight(d.overhead) >= small * 1.3);
  });

  it('한글이 든 글자는 일반 글꼴, 줄의 수치는 고정폭으로 쓴다', () => {
    const s = initialLedger();
    const values = new Set(derive(s).scenario.map((c) => formatTokens(c.activeContext)));
    for (const t of texts(draw(s))) {
      if (values.has(t.body)) expect(t.tag, t.body).toContain(MONO_FONT);
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
    for (const s of [initialLedger(), with_(CALLS_RANGE.max, { conversation: CONVERSATION_RANGE.max }), with_(1, { trimmed: true })]) {
      for (const [, c] of draw(s).matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
    }
  });
});
