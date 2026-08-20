import { describe, expect, it } from 'vitest';
import {
  type Rule,
  doubleRoom,
  freedRooms,
  guestMoves,
  isInjectiveOn,
  isMapInjectiveOn,
  respectsFloor,
  ruleLabel,
  ruleToMap,
  shiftBy,
} from './hotel';

/**
 * 이 파일이 확인하는 것은 전부 **유한 구간** `1..upTo` 에서의 성질이다.
 * 무한 호텔의 주장을 테스트가 증명하지는 못한다. 규칙이 유한 구간마다
 * 성립한다는 것과, 규칙의 형태가 구간에 의존하지 않는다는 것을 보일 뿐이다.
 */
const UP_TO = 40;

describe('shiftBy', () => {
  it('n → n + k', () => {
    expect(shiftBy(1, 1)).toBe(2);
    expect(shiftBy(7, 1)).toBe(8);
    expect(shiftBy(7, 3)).toBe(10);
  });

  it('k = 0 이면 제자리다', () => {
    expect(shiftBy(5, 0)).toBe(5);
  });

  it('방 번호를 1 이상 정수로 맞춘다', () => {
    expect(shiftBy(0, 1)).toBe(2);
    expect(shiftBy(-3, 1)).toBe(2);
    expect(shiftBy(2.7, 1)).toBe(3);
  });
});

describe('doubleRoom', () => {
  it('n → 2n', () => {
    expect(doubleRoom(1)).toBe(2);
    expect(doubleRoom(9)).toBe(18);
  });

  it('언제나 짝수 방으로 보낸다 — 홀수 방이 통째로 비는 이유', () => {
    for (let room = 1; room <= UP_TO; room += 1) {
      expect(doubleRoom(room) % 2).toBe(0);
    }
  });
});

describe('isInjectiveOn — 아무도 쫓겨나지 않는다', () => {
  const rules: Rule[] = [
    { kind: 'stay' },
    { kind: 'shift', k: 1 },
    { kind: 'shift', k: 5 },
    { kind: 'double' },
  ];

  it('화면이 쓰는 규칙은 모두 단사다', () => {
    for (const rule of rules) {
      expect(isInjectiveOn(rule, UP_TO)).toBe(true);
    }
  });

  it('구간을 어디서 끊어도 단사다', () => {
    for (let upTo = 1; upTo <= UP_TO; upTo += 1) {
      for (const rule of rules) {
        expect(isInjectiveOn(rule, upTo)).toBe(true);
      }
    }
  });

  it('단사가 아닌 규칙은 걸러낸다 — 반으로 접으면 둘이 한 방에서 만난다', () => {
    // n → ⌈n/2⌉ 는 1 과 2 를 모두 1 번 방으로 보낸다. 방을 옮기는 규칙이라고
    // 다 되는 것이 아니라는 대비다.
    expect(isMapInjectiveOn(room => Math.ceil(room / 2), UP_TO)).toBe(false);
  });

  it('빈 구간은 단사다 — 비교할 쌍이 없다', () => {
    expect(isInjectiveOn({ kind: 'double' }, 0)).toBe(true);
  });
});

describe('freedRooms', () => {
  it('제자리면 비는 방이 없다 — 만실', () => {
    expect(freedRooms({ kind: 'stay' }, UP_TO)).toEqual([]);
  });

  it('한 칸 밀면 1 번 방 하나가 빈다', () => {
    expect(freedRooms({ kind: 'shift', k: 1 }, UP_TO)).toEqual([1]);
  });

  it('k 칸 밀면 1..k 가 빈다 — 버스 한 대 분량', () => {
    expect(freedRooms({ kind: 'shift', k: 5 }, UP_TO)).toEqual([1, 2, 3, 4, 5]);
  });

  it('두 배로 보내면 홀수 방이 전부 빈다', () => {
    const odds = Array.from({ length: UP_TO / 2 }, (_, i) => i * 2 + 1);
    expect(freedRooms({ kind: 'double' }, UP_TO)).toEqual(odds);
  });

  it('구간을 넓혀도 앞부분의 답이 바뀌지 않는다', () => {
    // 유한 구간에서 본 결과가 구간을 늘렸다고 뒤집히면, 화면이 보여주는 것이
    // 무한에 대한 근거가 되지 못한다.
    const rule: Rule = { kind: 'double' };
    const narrow = freedRooms(rule, 10);
    const wide = freedRooms(rule, UP_TO);
    expect(wide.slice(0, narrow.length)).toEqual(narrow);
  });

  it('방 번호를 줄이는 규칙은 거부한다 — 조용히 틀린 답을 내지 않는다', () => {
    // k = -1 을 그냥 계산하면 40 번 방이 빈다고 답한다. 실제로는 41 번 방 손님이
    // 그리로 내려오므로, 그 값을 입실할 방으로 쓰면 두 손님이 한 방에서 만난다.
    expect(() => freedRooms({ kind: 'shift', k: -1 }, UP_TO)).toThrow(RangeError);
  });

  it('빈 방은 새 손님이 정확히 채운다 — 남거나 모자라지 않는다', () => {
    const freed = freedRooms({ kind: 'double' }, UP_TO);
    const takenAfterBoarding = new Set<number>([
      ...guestMoves({ kind: 'double' }, UP_TO)
        .map(move => move.to)
        .filter(room => room <= UP_TO),
      ...freed,
    ]);
    expect(takenAfterBoarding.size).toBe(UP_TO);
  });
});

describe('respectsFloor', () => {
  it('화면이 쓰는 규칙은 아무도 호텔 밖으로 내보내지 않는다', () => {
    // freedRooms 가 유한 구간만 훑고도 정확할 수 있는 근거이기도 하다.
    expect(respectsFloor({ kind: 'stay' }, UP_TO)).toBe(true);
    expect(respectsFloor({ kind: 'shift', k: 1 }, UP_TO)).toBe(true);
    expect(respectsFloor({ kind: 'double' }, UP_TO)).toBe(true);
  });

  it('뒤로 당기는 규칙은 걸린다', () => {
    expect(respectsFloor({ kind: 'shift', k: -1 }, UP_TO)).toBe(false);
  });
});

describe('guestMoves', () => {
  it('손님마다 출발 방과 도착 방을 하나씩 만든다', () => {
    const moves = guestMoves({ kind: 'shift', k: 1 }, 3);
    expect(moves).toEqual([
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
    ]);
  });

  it('두 배 규칙은 화면 밖까지 뻗는다 — 그리는 쪽이 잘라내야 한다', () => {
    const moves = guestMoves({ kind: 'double' }, 12);
    expect(moves.at(-1)).toEqual({ from: 12, to: 24 });
  });
});

describe('ruleToMap · ruleLabel', () => {
  it('규칙과 함수가 같은 것을 말한다', () => {
    const map = ruleToMap({ kind: 'shift', k: 2 });
    expect(map(4)).toBe(shiftBy(4, 2));
    expect(ruleToMap({ kind: 'double' })(4)).toBe(doubleRoom(4));
    expect(ruleToMap({ kind: 'stay' })(4)).toBe(4);
  });

  it('화면에 적을 이름을 준다', () => {
    expect(ruleLabel({ kind: 'shift', k: 1 })).toBe('n → n + 1');
    expect(ruleLabel({ kind: 'double' })).toBe('n → 2n');
    expect(ruleLabel({ kind: 'stay' })).toBe('그대로');
  });
});
