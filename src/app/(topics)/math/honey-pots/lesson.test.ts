import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, withFrame } from '@/lib/colorfigures/core';
import { ANT_BITS, POT_COUNT, antsForPot, potsForAnt, toBinary5 } from './binary';
import { addAnt, groupPots, initialLesson, nextAction, outcomeCodes, readResult, type LessonMode } from './lesson';
import { GRID_SIZE, LABEL_SIZE, OUTCOMES_SIZE, lessonScene } from './lessonScene';

describe('그림과 본문의 대응', () => {
  it('다섯 그룹은 25통을 중복 없이 나누고, 각 그룹에 후보 다섯 통이 남는다', () => {
    const groups = Array.from({ length: 5 }, (_, i) => groupPots(i));
    expect(groups.every(group => group.length === 5)).toBe(true);
    expect(groups.flat()).toEqual(Array.from({ length: POT_COUNT }, (_, i) => i + 1));
  });

  it('개미 한 마리를 더할 때마다 결과는 두 배가 되고, 다섯 마리를 넘겨 추가할 수 없다', () => {
    let state = initialLesson();
    for (let n = 1; n <= 5; n++) {
      expect(state.antCount).toBe(n);
      expect(nextAction(state)).toBe(n < 5 ? 'add' : 'reset');
      const codes = outcomeCodes(n);
      expect(new Set(codes).size).toBe(2 ** n);
      expect(codes.every(code => code.length === n)).toBe(true);
      state = addAnt(state);
    }
    expect(state.antCount).toBe(5);
    expect(state.note).toContain('다섯 마리');
    expect(nextAction(initialLesson())).toBe('add');
  });

  it('모든 꿀통의 배분 대상이 판독 결과로 되돌아온다', () => {
    for (let pot = 1; pot <= POT_COUNT; pot++) {
      const result = readResult(antsForPot(pot));
      expect(result.pot).toBe(pot);
      expect(result.code).toBe(toBinary5(pot));
      for (const bit of ANT_BITS) expect(potsForAnt(bit).includes(pot)).toBe(antsForPot(pot).includes(bit));
    }
  });

  it('32가지 결과 중 00000과 26~31번의 일곱 가지만 배정되지 않는다', () => {
    const unassigned: number[] = [];
    for (let code = 0; code < 32; code++) {
      const result = readResult(ANT_BITS.filter(bit => (code & bit) !== 0));
      if (result.pot === null) unassigned.push(code);
      else expect(result.pot).toBe(code);
    }
    expect(unassigned).toEqual([0, 26, 27, 28, 29, 30, 31]);
  });
});

describe('장면 그리기', () => {
  it('모든 단계·선택·32가지 판독 결과를 숫자 오류 없이 그린다', () => {
    const modes: LessonMode[] = ['grid', 'groups', 'codes', 'signature', 'encoding', 'simulation', 'summary'];
    for (const mode of modes) {
      const size = mode === 'signature' || mode === 'simulation' ? LABEL_SIZE : mode === 'codes' || mode === 'summary' ? OUTCOMES_SIZE : GRID_SIZE;
      const frame = frameFor(size, 'honey-test', { view: FRONT_VIEW });
      for (let code = 0; code < 32; code++) {
        const state = { ...initialLesson(), antCount: code % 5 + 1, group: code % 5 };
        const svg = withFrame(frame, () => lessonScene(mode, state, code % 25 + 1, ANT_BITS[code % 5], ANT_BITS.filter(bit => (code & bit) !== 0)));
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
        expect(svg).toContain('<text');
      }
    }
  });

  it('정리 그림에 32개의 서로 다른 이름표를 그리고 00000도 남겨 둔다', () => {
    const svg = lessonScene('summary', initialLesson(), 21, null, []);
    const texts = [...svg.matchAll(/<text\b[^>]*>(.*?)<\/text>/g)].map(match => match[1]);
    expect(texts).toHaveLength(32);
    expect(new Set(texts).size).toBe(32);
    expect(texts).toContain('00000');
    expect(texts).toContain('11001');
  });
});
