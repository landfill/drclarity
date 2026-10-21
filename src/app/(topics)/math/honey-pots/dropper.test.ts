import { describe, expect, it } from 'vitest';
import { settle } from '@/lib/colorfigures/core';
import { ANT_BITS, POT_COUNT, antsForPot } from './binary';
import {
  advanceDropper,
  emptyCups,
  filledCups,
  initialDropper,
  isSettled,
  nextAction,
  startDropping,
  targetCups,
  timeline,
  totalSeconds,
  type DropperState,
} from './dropper';
import { dropperScene } from './dropperScene';

const run = (s: DropperState) => settle(s, advanceDropper, isSettled);
/** 상태에서 note 를 뺀 나머지. 순서를 건너뛴 입력이 상태를 바꾸지 않았는지 비교할 때 쓴다. */
const withoutNote = (s: DropperState): Partial<DropperState> => {
  const rest: Partial<DropperState> = { ...s };
  delete rest.note;
  return rest;
};

describe('시간표', () => {
  // 본문 4단계 "자리가 1이면 그 개미의 개별 혼합 컵에 해당 꿀통의 꿀을 한 방울 넣고, 0이면 넣지 않습니다" 의 근거.
  it('꿀은 이름표 자리가 1인 개미의 컵에만, 한 방울씩 들어간다 (1~25번 모두)', () => {
    for (let pot = 1; pot <= POT_COUNT; pot++) {
      const s = run(startDropping(initialDropper(pot)));
      const expected = ANT_BITS.map((bit, i) => ((pot & bit) !== 0 ? i : -1)).filter((i) => i >= 0);
      expect(filledCups(pot, s.t as number)).toEqual(expected);
      expect(targetCups(pot)).toHaveLength(antsForPot(pot).length);
      const drops = timeline(pot).filter((g) => g.kind === 'drop');
      expect(new Set(drops.map((g) => (g.kind === 'drop' ? g.cup : -1))).size).toBe(drops.length);
    }
  });

  it('스포이트는 집어 들고 꿀을 뜬 뒤에야 컵으로 가고, 끝나면 내려놓는다', () => {
    for (let pot = 1; pot <= POT_COUNT; pot++) {
      const kinds = timeline(pot).map((g) => g.kind);
      expect(kinds.slice(0, 3)).toEqual(['pick', 'dip', 'move']);
      expect(kinds.slice(-2)).toEqual(['move', 'place']);
      expect(kinds.filter((k) => k === 'dip')).toHaveLength(1);
    }
  });

  it('A 부터 E 까지 차례로 넣는다', () => {
    const cups = timeline(21).flatMap((g) => (g.kind === 'drop' ? [g.cup] : []));
    expect(cups).toEqual([0, 2, 4]);
  });
});

describe('순서를 건너뛴 입력', () => {
  it('나누는 중에 다시 누르면 시간표를 처음부터 다시 돌리지 않는다', () => {
    const s = advanceDropper(startDropping(initialDropper(21)), 1.2);
    const n = startDropping(s);
    expect(withoutNote(n)).toEqual(withoutNote(s));
    expect(n.note).toContain('나누는 중');
  });

  it('나누는 동안에는 어느 버튼도 강조하지 않는다', () => {
    expect(nextAction(initialDropper(21))).toBe('drop');
    expect(nextAction(startDropping(initialDropper(21)))).toBeNull();
    expect(nextAction(advanceDropper(startDropping(initialDropper(21)), 1.2))).toBeNull();
  });

  it('다 나눈 뒤에 다시 누르면 상태를 바꾸지 않고 컵 비우기를 알린다', () => {
    const s = run(startDropping(initialDropper(7)));
    const n = startDropping(s);
    expect(withoutNote(n)).toEqual(withoutNote(s));
    expect(n.note).toContain('컵 비우기');
    expect(nextAction(s)).toBe('empty');
  });

  it('컵 비우기는 같은 꿀통의 처음 상태로 돌아간다', () => {
    const s = emptyCups(run(startDropping(initialDropper(13))));
    expect(s).toEqual(initialDropper(13));
    expect(nextAction(s)).toBe('drop');
  });
});

describe('움직임', () => {
  it('방울이 컵에 닿는 순간 그 컵 이름을 알리고, 끝나면 넣지 않은 컵까지 알린다', () => {
    let s = startDropping(initialDropper(21));
    const notes = new Set<string>();
    while (!isSettled(s)) {
      s = advanceDropper(s, 1 / 30);
      notes.add(s.note);
    }
    expect([...notes].some((n) => n.startsWith('A의 컵에'))).toBe(true);
    expect(s.note).toBe('A·C·E의 컵에 21번 꿀이 한 방울씩 들어갔습니다. B·D의 컵에는 넣지 않았습니다.');
    expect(s.t).toBe(totalSeconds(21));
  });

  it('다섯 컵에 모두 넣는 꿀통(11111 = 31번)은 25번까지에 없다', () => {
    for (let pot = 1; pot <= POT_COUNT; pot++) expect(targetCups(pot).length).toBeLessThan(5);
  });

  it('멈춘 상태에서는 시간이 흘러도 같은 객체를 돌려준다', () => {
    const s = initialDropper(5);
    expect(advanceDropper(s, 0.1)).toBe(s);
  });
});

describe('dropperScene', () => {
  it('모든 단계를 숫자 오류 없이 그린다', () => {
    for (const pot of [1, 21, 25]) {
      let s = initialDropper(pot);
      expect(dropperScene(s)).not.toMatch(/NaN|undefined|Infinity/);
      s = startDropping(s);
      while (!isSettled(s)) {
        s = advanceDropper(s, 0.1);
        expect(dropperScene(s)).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });
});
