import * as ENGINE from '@/lib/colorfigures/core';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { MONO_FONT, palette } from '@/styles/palette';
import { COMMON_PASSWORDS, lookupRainbow } from './hashing';
import {
  ACCOUNT_PASSWORD,
  ROW_SECONDS,
  TABLE,
  act,
  advanceLookup,
  hits,
  initialLookup,
  isDone,
  isSettled,
  matchesAt,
  nextAction,
  setSalted,
  statusText,
  storedRows,
  type LookupState,
} from './lookup';
import { BOOK, BOOK_COLS, LOOKUP_SIZE, ROW_H, SHEET, labelSize, lookupScene, rulerV, sheetColumns, textWidth, threadEnds } from './lookupScene';

const run = (s: LookupState) => settle(s, advanceLookup, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(LOOKUP_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: LookupState, labelScale = 1) => withFrame(frame(labelScale), () => lookupScene(s));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));

describe('순서', () => {
  it('본문 순서: 표에서 찾기 → 소금 섞어 다시 찾기', () => {
    let s = initialLookup();
    expect(nextAction(s)).toBe('scan');
    s = run(act(s, 'scan'));
    expect(isDone(s)).toBe(true);
    expect(hits(s)).toBe(1);
    expect(nextAction(s)).toBe('salt');
    s = run(act(s, 'salt'));
    expect(s.salted).toBe(true);
    expect(isDone(s)).toBe(true);
    expect(hits(s)).toBe(0);
    expect(nextAction(s)).toBeNull();
  });

  it('자는 표를 한 줄씩 내려간다', () => {
    let s = act(initialLookup(), 'scan');
    const seen: number[] = [s.scanned];
    while (!isSettled(s)) {
      s = advanceLookup(s, 1 / 60);
      if (s.scanned !== seen.at(-1)) seen.push(s.scanned);
    }
    expect(seen).toEqual(Array.from({ length: TABLE.length + 1 }, (_, i) => i));
    let t = act(initialLookup(), 'scan');
    for (let i = 0; i < Math.round(ROW_SECONDS * 60) + 1; i++) t = advanceLookup(t, 1 / 60);
    expect(t.scanned).toBe(1);
  });

  it('훑는 중의 입력과 이미 한 일은 상태를 바꾸지 않고 이유를 알린다', () => {
    const check = (t: LookupState, s: LookupState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t)).toContain(word);
    };
    const scanning = advanceLookup(act(initialLookup(), 'scan'), 0.1);
    expect(isSettled(scanning)).toBe(false);
    check(act(scanning, 'scan'), scanning, '훑는 중');
    check(act(scanning, 'salt'), scanning, '훑는 중');
    const done = run(act(initialLookup(), 'scan'));
    check(act(done, 'scan'), done, '이미');
    const salted = run(act(done, 'salt'));
    check(act(salted, 'salt'), salted, '이미');
    check(act(salted, 'scan'), salted, '이미');
    expect(run(act(scanning, 'salt')).note).toBe('');
  });

  it('소금 없이 찾아 보기 전에 누른 "2. 소금 섞어 다시 찾기" 는 상태를 바꾸지 않고 이유를 알린다', () => {
    const s0 = initialLookup();
    const t = act(s0, 'salt');
    expect({ ...t, note: '' }).toEqual(s0);
    expect(statusText(t)).toContain('1. 표에서 찾기');
    // 위 칸의 체크 상자로 소금을 켠 저장소에서는 순서를 건너뛴 것이 아니므로 받는다.
    expect(act(setSalted(s0, true), 'salt').note).toBe('');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    const scanning = advanceLookup(act(initialLookup(), 'scan'), 0.1);
    expect(nextAction(scanning)).toBeNull();
    const states = [initialLookup(), run(act(initialLookup(), 'scan')), setSalted(initialLookup(), true)];
    for (const s of states) {
      const a = nextAction(s)!;
      expect(a).not.toBeNull();
      expect(act(s, a).note).toBe('');
    }
  });

  it('위 칸의 체크 상자로 소금을 바꾸면 찾기를 처음부터 다시 한다', () => {
    const done = run(act(initialLookup(), 'scan'));
    const s = setSalted(done, true);
    expect(s).toMatchObject({ salted: true, started: false, scanned: 0, note: '' });
    expect(hits(s)).toBe(0);
    expect(nextAction(s)).toBe('scan');
  });
});

describe('본문과 같은 결과', () => {
  // rainbow: "되돌리는 대신 찾는 것입니다." 걸린 줄은 hashing.ts 의 lookupRainbow 가 찾는 것과 같다.
  it('소금이 없으면 두 사람의 저장값이 같고, 표의 password 줄 하나가 둘 다에 걸린다', () => {
    const rows = storedRows(false);
    expect(rows[0].hash).toBe(rows[1].hash);
    expect(lookupRainbow(rows[0].hash)).toBe(ACCOUNT_PASSWORD);
    const done = run(act(initialLookup(), 'scan'));
    TABLE.forEach((row, i) => {
      const m = matchesAt(done, i)!;
      if (row.password === ACCOUNT_PASSWORD) expect(m).toEqual(rows.map((r) => r.id));
      else expect(m).toEqual([]);
    });
  });

  // salt: "두 사람이 똑같은 비밀번호를 써도 저장되는 값이 갈립니다. 그리고 … 한 줄도 맞지 않습니다."
  it('소금을 섞으면 저장값이 갈리고, 같은 표가 한 줄도 맞지 않는다', () => {
    const rows = storedRows(true);
    expect(rows[0].hash).not.toBe(rows[1].hash);
    for (const r of rows) expect(lookupRainbow(r.hash)).toBeNull();
    const done = run(act(run(act(initialLookup(), 'scan')), 'salt'));
    TABLE.forEach((_, i) => expect(matchesAt(done, i)).toEqual([]));
  });

  it('자가 아직 지나지 않은 줄은 걸렸는지 모른다', () => {
    let s = act(initialLookup(), 'scan');
    const pw = TABLE.findIndex((r) => r.password === ACCOUNT_PASSWORD);
    while (s.scanned <= pw) {
      expect(matchesAt(s, pw)).toBeNull();
      expect(hits(s)).toBe(0);
      s = advanceLookup(s, 1 / 30);
    }
    expect(hits(s)).toBe(1);
  });

  it('표는 흔한 비밀번호 10개를 소금 없이 해시한 것이고, 소금 설정과 상관없이 같다', () => {
    expect(TABLE.map((r) => r.password)).toEqual([...COMMON_PASSWORDS]);
    expect(TABLE).toHaveLength(10);
  });
});

describe('lookupScene', () => {
  const states = (): LookupState[] => {
    const out: LookupState[] = [];
    for (const salted of [false, true]) {
      out.push(setSalted(initialLookup(), salted));
      for (let k = 0; k <= TABLE.length; k++) out.push({ ...setSalted(initialLookup(), salted), started: true, scanned: k, t: 0.5 });
    }
    return out;
  };

  it('모든 단계를 숫자 오류 없이 그린다', () => {
    for (const s of states()) for (const scale of [1, 2.2]) expect(draw(s, scale)).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('자는 줄 경계에만 놓여 줄의 글자를 가리지 않는다', () => {
    for (let i = 0; i < TABLE.length; i++) {
      expect(rulerV(i)).toBeGreaterThanOrEqual(BOOK.v0);
      expect(rulerV(i) + ROW_H).toBeLessThanOrEqual(BOOK.v1);
    }
  });

  it('글자는 좁은 화면에서도 종이와 장부 안의 제 칸에 든다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      const size = labelSize(scale);
      expect(size).toBeLessThan(ROW_H);
      // 장부: 비밀번호 칸과 해시 칸이 겹치지 않고 장부 안에 든다.
      const pwW = Math.max(...TABLE.map((r) => textWidth(r.password, size)));
      const hW = textWidth('0123abcd…', size);
      expect(BOOK_COLS.hash + hW / 2).toBeLessThan(BOOK.u1 - 2);
      expect(BOOK_COLS.hash - hW / 2).toBeGreaterThan(BOOK_COLS.password + pwW / 2 + 2);
      expect(BOOK_COLS.password - pwW / 2).toBeGreaterThan(BOOK.u0 + 2);
      expect(textWidth('미리 만든 표 · 흔한 비밀번호 10개', size)).toBeLessThan(BOOK.u1 - BOOK.u0 - 4);
      // 저장소: 사용자 · 소금 · 저장된 값이 겹치지 않고 종이 안에 든다.
      for (const salted of [false, true]) {
        const c = sheetColumns(salted);
        const hashW = textWidth('0123456789ab…', size);
        expect(c.name + textWidth('사용자', size * 0.85) / 2).toBeLessThan(SHEET.u1 - 1);
        expect(c.hash - hashW / 2).toBeGreaterThan(SHEET.u0 + 1);
        const leftOfHash = c.salt ?? c.name;
        const leftW = c.salt !== null ? textWidth('x7f2', size) : textWidth('ari', size);
        expect(leftOfHash - leftW / 2).toBeGreaterThan(c.hash + hashW / 2 + 1);
        if (c.salt !== null) expect(c.name - textWidth('사용자', size * 0.85) / 2).toBeGreaterThan(c.salt + textWidth('소금', size * 0.85) / 2 + 1);
      }
    }
  });

  it('실은 저장소의 값과 장부의 해시 사이, 둘 다 글자 밖에 걸린다', () => {
    for (const scale of [1, 2.2]) {
      const size = labelSize(scale);
      for (const salted of [false, true]) {
        const [a, b] = threadEnds(salted, 1, 0, size);
        expect(a[0]).toBeLessThan(SHEET.u1);
        expect(a[0]).toBeGreaterThan(SHEET.u0 - 1);
        expect(b[0]).toBeLessThan(BOOK.u1);
        expect(b[0]).toBeGreaterThan(BOOK_COLS.hash);
        expect(a[0] - b[0]).toBeGreaterThan(10);
      }
    }
  });

  it('비밀번호 · 해시 · 소금은 고정폭, 한글이 든 글자는 일반 글꼴로 쓴다', () => {
    const s = run(act(run(act(initialLookup(), 'scan')), 'salt'));
    for (const t of texts(draw(s))) {
      if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
      else expect(t.tag, t.body).toContain(MONO_FONT);
    }
  });

  // 본문(store-lead): 저장소에는 비밀번호 칸이 없다. 그림의 저장소에도 비밀번호 원문을 적지 않는다.
  it('저장소 종이에는 비밀번호 원문이 없다 (걸린 표의 줄에만 있다)', () => {
    const done = run(act(initialLookup(), 'scan'));
    const bodies = texts(draw(done)).map((t) => t.body);
    expect(bodies.filter((b) => b === ACCOUNT_PASSWORD)).toHaveLength(1);
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
    for (const s of [initialLookup(), run(act(initialLookup(), 'scan')), run(act(run(act(initialLookup(), 'scan')), 'salt'))])
      for (const [, c] of draw(s).matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
  });
});
