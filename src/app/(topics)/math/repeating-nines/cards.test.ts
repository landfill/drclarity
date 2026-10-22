import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, WOOD, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { MAX_DIGITS, gapString, ninesString } from './nines';
import {
  ROWS,
  TICKS,
  advanceCards,
  canAdd,
  canRemove,
  cardFace,
  cardPlace,
  initialCards,
  isSettled,
  nextAction,
  refuseAdd,
  refuseRemove,
  retarget,
  statusText,
  topCard,
  type CardsState,
} from './cards';
import { CARDS_SIZE, CARD_H, CARD_W, RULER_BAND, cardLabels, cardsScene, textWidth, tickU } from './cardsScene';

const run = (s: CardsState) => settle(s, advanceCards, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(CARDS_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: CardsState, labelScale = 1) => withFrame(frame(labelScale), () => cardsScene(s));
/** 0.1 씩 건너 1..MAX 사이의 모든 자리. 정수 자리는 정확히 정수로 둔다. */
const allShown = () => Array.from({ length: (MAX_DIGITS - 1) * 10 + 1 }, (_, i) => (i % 10 === 0 ? 1 + i / 10 : 1 + i / 10 + 1e-9));

describe('카드의 내용', () => {
  it('카드 k 는 9 가 k−1 개인 수에서 1 까지이고, 아홉째 눈금이 9 가 k 개인 수다', () => {
    expect(cardFace(1)).toMatchObject({ left: '0', pin: '0.9', right: '1' });
    expect(cardFace(3)).toMatchObject({ left: '0.99', pin: '0.999', right: '1' });
    for (let k = 1; k <= MAX_DIGITS; k++) {
      expect(cardFace(k).pin).toBe(ninesString(k));
      expect(cardFace(k).left).toBe(ninesString(k - 1));
    }
  });

  // 본문: 9 를 하나씩 늘리면서 수직선을 그만큼(열 배) 확대한다.
  it('다음 카드는 앞 카드의 마지막 한 칸(틈)을 열 배로 키운 것이다: 양 끝이 앞 카드의 틈의 양 끝과 같다', () => {
    for (let k = 1; k < MAX_DIGITS; k++) {
      expect(cardFace(k + 1).left).toBe(cardFace(k).pin);
      expect(cardFace(k + 1).right).toBe(cardFace(k).right);
    }
  });

  // 본문: 확대해도 틈이 계속 보인다. 어느 카드에서나 틈은 눈금 한 칸이다.
  it('틈은 어느 카드에서나 카드 자의 10분의 1, 같은 자리다 (부동소수점으로 1 − 10^−k 를 만들지 않는다)', () => {
    const one = tickU(TICKS) - tickU(TICKS - 1);
    expect(one).toBeCloseTo((tickU(TICKS) - tickU(0)) / 10, 12);
    const base = draw({ ...initialCards(3), shown: 3 });
    const deep = draw({ ...initialCards(15), shown: 15 });
    // 판과 판의 카드 두 장(상자 앞까지)의 선과 면.
    const geometry = (svg: string) => svg.slice(0, svg.indexOf(WOOD.l)).match(/<path d="[^"]*"/g) ?? [];
    expect(geometry(base).length).toBeGreaterThan(60); // 판까지는 30여 개, 나머지가 카드 세 장과 점선이다.
    expect(geometry(deep)).toEqual(geometry(base));
  });

  it('카드의 숫자는 지수 표기 없이 0.99…9 로 적고, 0.999… (끝없는 수) 는 어느 카드에도 없다', () => {
    for (let k = 1; k <= MAX_DIGITS; k++) {
      for (const l of cardLabels(k, 1)) {
        expect(l.text).not.toMatch(/e|…/);
      }
    }
  });
});

describe('카드의 자리', () => {
  it('어느 자리에서든 카드 열다섯 장이 저마다 한 곳에만 있다', () => {
    for (const shown of allShown()) {
      const kinds = Array.from({ length: MAX_DIGITS }, (_, i) => cardPlace(i + 1, shown).kind);
      expect(kinds).toHaveLength(MAX_DIGITS);
      const moving = kinds.filter((k) => k === 'arrive' || k === 'leave').length;
      expect(moving, `shown ${shown}`).toBeLessThanOrEqual(2);
    }
  });

  it('9 가 d 개면 판에 카드 d−1, d 가 위에서부터 붙고, 앞 카드들은 상자 뒤칸, 나머지는 앞칸에 있다', () => {
    for (let d = 1; d <= MAX_DIGITS; d++) {
      const rows: number[] = [];
      for (let k = 1; k <= MAX_DIGITS; k++) {
        const p = cardPlace(k, d);
        if (k > d) expect(p.kind).toBe('box');
        else if (k < d - (ROWS - 1)) expect(p.kind).toBe('seen');
        else {
          expect(p).toEqual({ kind: 'row', row: k - topCard(d) });
          rows.push(k);
        }
      }
      expect(rows[rows.length - 1]).toBe(d);
      expect(rows.length).toBe(Math.min(d, ROWS));
    }
  });

  it('옮겨 가는 동안 나오는 카드는 상자에서 판으로, 나가는 카드는 판의 맨 위에서 상자 뒤칸으로 간다', () => {
    expect(cardPlace(4, 3.5)).toEqual({ kind: 'arrive', row: 1, t: 0.5 });
    expect(cardPlace(2, 3.5)).toEqual({ kind: 'leave', t: 0.5 });
    expect(cardPlace(3, 3.5)).toEqual({ kind: 'row', row: 0.5 });
    expect(cardPlace(1, 3.5)).toEqual({ kind: 'seen' });
    expect(cardPlace(3, 1.5)).toEqual({ kind: 'box' });
    expect(cardPlace(2, 1.5)).toEqual({ kind: 'arrive', row: 1, t: 0.5 });
    expect(cardPlace(1, 1.5)).toEqual({ kind: 'row', row: 0 });
  });
});

describe('움직임과 버튼', () => {
  it('9 의 개수가 바뀌면 그 자리로 옮겨 가 정확히 선다. 여러 장을 건너뛰어도 1.6초 안이다', () => {
    for (const [from, to] of [
      [3, 4],
      [4, 3],
      [1, 15],
      [15, 1],
    ]) {
      let s = retarget(initialCards(from), to);
      expect(isSettled(s)).toBe(false);
      let prev = s.shown;
      for (let i = 0; i < 1.6 * 60 + 1; i++) {
        s = advanceCards(s, 1 / 60);
        expect(Math.abs(to - s.shown)).toBeLessThanOrEqual(Math.abs(to - prev) + 1e-12);
        prev = s.shown;
      }
      expect(s.shown).toBe(to);
      expect(isSettled(s)).toBe(true);
    }
  });

  it('옮겨 가는 중에 다시 바뀌면 지금 자리에서 새 목표로 간다', () => {
    const moving = advanceCards(retarget(initialCards(3), 6), 0.3);
    expect(moving.shown).toBeGreaterThan(3);
    const back = run(retarget(moving, 2));
    expect(back.shown).toBe(2);
  });

  it('9 가 15개일 때의 "하나 더" 와 1개일 때의 "하나 빼기" 는 받아들이지 않고 이유를 알린다', () => {
    expect(canAdd(MAX_DIGITS)).toBe(false);
    expect(canRemove(1)).toBe(false);
    const full = initialCards(MAX_DIGITS);
    const refused = refuseAdd(full);
    expect({ ...refused, note: '' }).toEqual(full);
    expect(statusText(refused, MAX_DIGITS)).toContain('카드가 더 없습니다');
    const one = initialCards(1);
    expect({ ...refuseRemove(one), note: '' }).toEqual(one);
    expect(statusText(refuseRemove(one), 1)).toContain('0.9 부터');
  });

  it('이유는 9 의 개수가 바뀌면 지운다', () => {
    const s = retarget(refuseAdd(initialCards(MAX_DIGITS)), MAX_DIGITS - 1);
    expect(s.note).toBe('');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    for (let d = 1; d <= MAX_DIGITS; d++) {
      expect(nextAction(d)).toBe(canAdd(d) ? 'add' : null);
    }
  });

  // 본문: 유한한 자릿수에서는 언제나 틈이 남고, 0.999… 에는 마지막 9 가 없다.
  it('상태 문구는 지금 수가 유한소수이고 틈이 얼마인지 적고, 마지막 카드에서는 0.999… 가 어느 카드도 아니라고 적는다', () => {
    for (let d = 1; d < MAX_DIGITS; d++) {
      const t = statusText(initialCards(d), d);
      expect(t).toContain(ninesString(d));
      expect(t).toContain(gapString(d));
      expect(t).toContain('유한소수');
    }
    const last = statusText(initialCards(MAX_DIGITS), MAX_DIGITS);
    expect(last).toContain(`${MAX_DIGITS}장`);
    expect(last).toContain('0.999… 를 담은 카드는 없습니다');
  });
});

describe('cardsScene', () => {
  it('모든 자리(옮겨 가는 중 포함)를 숫자 오류 없이 그린다', () => {
    for (const shown of allShown()) expect(draw({ ...initialCards(3), shown }), `shown ${shown}`).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('상자 앞벽에 남은 카드 수를 적는다', () => {
    for (let d = 1; d <= MAX_DIGITS; d++) expect(draw(initialCards(d))).toContain(`남은 카드 ${MAX_DIGITS - d}장`);
  });

  it('선 카드만 글자를 쓴다: 판이 한 줄씩 올라가는 동안에는 카드 글자를 쉬고, 다 서면 판의 두 장이 글자를 쓴다', () => {
    const count = (svg: string) => (svg.match(/>9 가 \d+개</g) ?? []).length;
    expect(count(draw(initialCards(5)))).toBe(2);
    expect(count(draw({ ...initialCards(5), shown: 5.4 }))).toBe(0);
    // 판이 다 차기 전에는 나오는 카드만 글자가 없다.
    expect(count(draw({ ...initialCards(1), shown: 1.5 }))).toBe(1);
  });

  // AGENTS.md: 한글이 섞인 라벨은 일반 글꼴로, 숫자만 있는 눈금은 고정폭으로 쓴다.
  it('한글이 든 글자는 일반 글꼴로, 숫자는 고정폭으로 쓴다', () => {
    const texts = draw(initialCards(4)).match(/<text[^>]*>[^<]*<\/text>/g) ?? [];
    const korean = texts.filter((t) => /[가-힯]/.test(t));
    expect(korean.length).toBe(3);
    for (const t of korean) expect(t).toContain(GENERAL_FONT);
    for (const t of texts.filter((t) => !/[가-힯]/.test(t))) {
      expect(t).not.toContain(GENERAL_FONT);
      expect(t).toContain('font-family=');
    }
  });

  it('카드 글자는 가장 긴 수에서도, 글자가 커진 좁은 화면에서도 카드 안에 들고 서로 겹치지 않는다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      for (let k = 1; k <= MAX_DIGITS; k++) {
        const boxes = withFrame(frame(scale), () => cardLabels(k)).map((l) => {
          const half = textWidth(l.text, l.size) / 2 / CARD_W;
          return { text: l.text, u0: l.u - half, u1: l.u + half, v0: l.v - (0.25 * l.size) / CARD_H, v1: l.v + (0.85 * l.size) / CARD_H };
        });
        for (let i = 0; i < boxes.length; i++) {
          const b = boxes[i];
          expect(b.u0, `${b.text} (${scale})`).toBeGreaterThanOrEqual(0.02);
          expect(b.u1, `${b.text} (${scale})`).toBeLessThanOrEqual(0.98);
          expect(b.v0).toBeGreaterThanOrEqual(0);
          expect(b.v1).toBeLessThanOrEqual(1);
          // 글자가 자의 눈금 띠를 가리지 않는다.
          expect(b.v1 <= RULER_BAND.v0 || b.v0 >= RULER_BAND.v1, `${b.text} (${scale})`).toBe(true);
          for (let j = i + 1; j < boxes.length; j++) {
            const c = boxes[j];
            const overlap = b.u0 < c.u1 && c.u0 < b.u1 && b.v0 < c.v1 && c.v0 < b.v1;
            expect(overlap, `${b.text} / ${c.text} (${scale})`).toBe(false);
          }
        }
      }
    }
  });
});
