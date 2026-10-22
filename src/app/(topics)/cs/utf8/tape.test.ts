import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { cutAt, encodeUtf8, lengthFromLeadByte, toHex, utf8Length } from './utf8';
import {
  DISPLAY_CHARS,
  NARROW_WINDOW,
  WINDOW,
  advanceTape,
  bladeDown,
  canLess,
  canMore,
  displayText,
  initialTape,
  isCut,
  isSettled,
  nextAction,
  pieceFall,
  refuseLess,
  refuseMore,
  retarget,
  statusText,
  tapeCells,
  windowStart,
  type TapeState,
} from './tape';
import { BROKEN_FILL, TAPE_SIZE, cellWidth, hexSize, tapeScene, windowFor } from './tapeScene';

const SHORT = '안녕 hi 😀';
const LONG = '정말 고맙습니다 thank you very much 😀😀 é';
const frame = (labelScale = 1) => ({ ...frameFor(TAPE_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: TapeState, text = s.text, labelScale = 1) => withFrame(frame(labelScale), () => tapeScene(s, encodeUtf8(text)));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));

describe('테이프의 칸', () => {
  it('칸 하나에 바이트 하나: 칸 수가 문장의 바이트 수와 같고, 순서대로 이어 붙이면 문장의 바이트 그대로다', () => {
    for (const text of [SHORT, LONG, '👨‍👩‍👧‍👦', '']) {
      const chars = encodeUtf8(text);
      const cells = tapeCells(chars);
      expect(cells.length).toBe(utf8Length(text));
      expect(cells.map((c) => c.byte)).toEqual(chars.flatMap((c) => c.bytes));
      cells.forEach((c, i) => expect(c.index).toBe(i));
    }
  });

  // 본문: 첫 바이트의 앞머리가 그 글자가 몇 바이트인지 알려 준다.
  it('글자의 첫 칸(part 0)은 앞머리가 말하는 길이가 그 글자의 바이트 수와 같고, 나머지 칸은 이어지는 바이트다', () => {
    for (const c of tapeCells(encodeUtf8(LONG))) {
      if (c.part === 0) expect(lengthFromLeadByte(c.byte)).toBe(c.size);
      else expect(lengthFromLeadByte(c.byte)).toBe(0);
    }
  });

  it('보이는 창은 자르는 자리를 늘 담는다. 짧은 문장은 처음부터 보인다', () => {
    expect(windowStart(14, 7)).toBe(0);
    const total = utf8Length(LONG);
    expect(total).toBeGreaterThan(WINDOW);
    for (const window of [WINDOW, NARROW_WINDOW]) {
      for (let limit = 0; limit <= total; limit++) {
        const start = windowStart(total, limit, window);
        expect(start).toBeGreaterThanOrEqual(0);
        expect(start + window).toBeLessThanOrEqual(total);
        expect(limit - start).toBeGreaterThanOrEqual(0);
        expect(limit - start).toBeLessThanOrEqual(window);
      }
    }
  });
});

describe('자르기', () => {
  it('자르는 자리가 바뀌면 다시 자르고, 0.9초 안에 끝난다', () => {
    let s = retarget(initialTape(SHORT, 14), SHORT, 12);
    expect(s.t).toBe(0);
    for (let i = 0; i < 0.9 * 60 + 1; i++) s = advanceTape(s, 1 / 60);
    expect(isSettled(s)).toBe(true);
    expect(advanceTape(s, 1)).toBe(s);
  });

  it('문장이 바뀌면 새 테이프를 찍은 끝 모습으로 둔다. 같은 값이면 그대로다', () => {
    const s = initialTape(SHORT, 14);
    expect(retarget(s, SHORT, 14)).toBe(s);
    expect(retarget(s, LONG, utf8Length(LONG))).toMatchObject({ text: LONG, t: 1 });
  });

  it('칼날은 내려왔다가 다시 올라가고, 뒤 조각은 칼날이 테이프를 지난 뒤에야 떨어진다', () => {
    expect(bladeDown(0)).toBe(0);
    expect(bladeDown(1)).toBe(0);
    expect(bladeDown(0.4)).toBe(1);
    for (let t = 0; t < 0.3; t += 0.01) expect(pieceFall(t)).toBe(0);
    expect(pieceFall(1)).toBe(1);
    expect(isCut(0.29)).toBe(false);
    expect(isCut(0.3)).toBe(true);
  });

  it('1바이트 덜·더: 끝에서는 받아들이지 않고 이유를 알리고, 자리가 바뀌면 이유를 지운다', () => {
    expect(canLess(0)).toBe(false);
    expect(canMore(14, 14)).toBe(false);
    const s = initialTape(SHORT, 0);
    expect({ ...refuseLess(s), note: '' }).toEqual(s);
    expect(statusText(refuseLess(s), encodeUtf8(SHORT))).toContain('0바이트');
    const end = initialTape(SHORT, 14);
    expect({ ...refuseMore(end), note: '' }).toEqual(end);
    expect(statusText(refuseMore(end), encodeUtf8(SHORT))).toContain('테이프 끝');
    expect(retarget(refuseMore(end), SHORT, 13).note).toBe('');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    expect(nextAction(14)).toBe('less');
    expect(nextAction(1)).toBe('less');
    expect(nextAction(0)).toBeNull();
  });
});

describe('판독 창과 상태 문구', () => {
  // 본문: 화면의 □ 는 글자가 망가진 것이 아니라, 글자가 되지 못한 바이트 조각이다.
  it('판독 창은 남은 글자를 읽고, 글자가 되지 못한 조각이 있을 때만 □ 를 붙인다', () => {
    const chars = encodeUtf8(SHORT);
    for (let limit = 0; limit <= 14; limit++) {
      const cut = cutAt(chars, limit);
      const d = displayText(cut);
      expect(d.broken).toBe(cut.broken !== null);
      expect(d.text).not.toContain('□');
    }
    expect(displayText(cutAt(chars, 12))).toEqual({ text: '…녕·hi·', broken: true });
    expect(displayText(cutAt(chars, 3))).toEqual({ text: '안', broken: false });
  });

  it('판독 창은 끝 다섯 글자만 보이고 앞은 … 로 줄인다', () => {
    const d = displayText(cutAt(encodeUtf8(LONG), utf8Length(LONG)));
    expect([...d.text].length).toBe(DISPLAY_CHARS + 1);
    expect(d.text.startsWith('…')).toBe(true);
  });

  it('깨진 자리에서는 그 글자의 바이트 수와 남은 바이트를 적고, 경계에서는 깨진 글자가 없다고 적는다', () => {
    const chars = encodeUtf8(SHORT);
    const broken = statusText(initialTape(SHORT, 12), chars);
    expect(broken).toContain('😀 는 4바이트인데 2바이트(F0 9F)만 남았습니다');
    expect(broken).toContain('어떤 글자도 되지 못해');
    expect(statusText(initialTape(SHORT, 10), chars)).toContain('글자 경계');
    expect(statusText(initialTape(SHORT, 0), chars)).toContain('아무것도 남지 않았습니다');
  });
});

describe('tapeScene', () => {
  const states = (): [TapeState, string][] => {
    const out: [TapeState, string][] = [];
    for (const text of [SHORT, LONG, '', '👨‍👩‍👧‍👦']) {
      const total = utf8Length(text);
      for (let limit = 0; limit <= total; limit += Math.max(1, Math.floor(total / 9))) {
        for (const t of [0, 0.2, 0.35, 0.6, 1]) out.push([{ ...initialTape(text, limit), t }, text]);
      }
    }
    return out;
  };

  it('모든 문장·자리·단계를 숫자 오류 없이 그린다', () => {
    for (const [s, text] of states()) expect(draw(s, text), `${text} ${s.limit} ${s.t}`).not.toMatch(/NaN|undefined|Infinity/);
  });

  // 테이프에는 바이트만 있다: 글자는 기계가 읽어서 판독 창에만 나타난다.
  it('테이프 칸에는 16진수 바이트만 찍는다. 글자는 판독 창에만 나온다', () => {
    const svg = draw(initialTape(SHORT, 12));
    // 테이프 칸의 글자 크기로 칸의 글자를 가린다. 칼날 받침의 자리 숫자는 더 작다.
    const onTape = (t: { tag: string }) => t.tag.includes(`font-size="${hexSize(1)}"`);
    expect(texts(svg).filter(onTape).map((t) => t.body)).toEqual(tapeCells(encodeUtf8(SHORT)).map((c) => toHex(c.byte)));
    const others = texts(svg).filter((t) => !onTape(t)).map((t) => t.body);
    expect(others.sort()).toEqual(['12', '□', '…녕·hi·', '읽은 글자'].sort());
  });

  it('칼날이 테이프를 지나기 전에는 판독 창이 테이프 전체를 읽고, 지난 뒤에는 앞 조각만 읽는다', () => {
    const before = texts(draw({ ...initialTape(SHORT, 12), t: 0.1 })).map((t) => t.body);
    expect(before).toContain('…·hi·😀');
    expect(before).not.toContain('□');
    const after = texts(draw({ ...initialTape(SHORT, 12), t: 0.5 })).map((t) => t.body);
    expect(after).toContain('□');
  });

  it('글자가 되지 못한 조각의 칸만, 잘린 뒤에만 붉게 칠한다', () => {
    const count = (svg: string) => (svg.match(new RegExp(`fill="${BROKEN_FILL}"`, 'g')) ?? []).length;
    expect(count(draw(initialTape(SHORT, 12)))).toBe(2);
    expect(count(draw(initialTape(SHORT, 13)))).toBe(3);
    expect(count(draw(initialTape(SHORT, 10)))).toBe(0);
    expect(count(draw({ ...initialTape(SHORT, 12), t: 0.1 }))).toBe(0);
  });

  // AGENTS.md: 한글이 섞인 라벨은 일반 글꼴로, 숫자만 있는 눈금은 고정폭으로 쓴다.
  it('한글이 든 글자는 일반 글꼴로, 바이트와 자리 숫자는 고정폭으로 쓴다', () => {
    for (const t of texts(draw(initialTape(SHORT, 12)))) {
      if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
      else if (/^[0-9A-F]+$/.test(t.body)) expect(t.tag, t.body).toContain('font-family=');
    }
  });

  it('바이트 글자는 글자가 커진 좁은 화면에서도 제 칸 폭 안에 든다 (좁은 화면은 칸을 줄이고 키운다)', () => {
    expect(windowFor(1)).toBe(WINDOW);
    expect(windowFor(2.2)).toBe(NARROW_WINDOW);
    expect(cellWidth(2.2)).toBeGreaterThan(cellWidth(1));
    for (const scale of [1, 1.6, 2.2]) {
      const svg = draw(initialTape(SHORT, 12), SHORT, scale);
      const sizes = texts(svg)
        .filter((t) => /^[0-9A-F]{2}$/.test(t.body))
        .map((t) => Number(/font-size="([\d.]+)"/.exec(t.tag)![1]));
      // tx 의 글자는 앞면 좌표로 그리므로 font-size 가 곧 세계 단위다. 고정폭 두 글자: 0.62em 에 자간 0.04em.
      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) expect(2 * 0.66 * size).toBeLessThan(cellWidth(scale) - 0.4);
    }
  });
});
