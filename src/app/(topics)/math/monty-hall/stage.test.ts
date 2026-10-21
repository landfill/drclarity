import { describe, expect, it } from 'vitest';
import { settle } from '@/lib/colorfigures/core';
import { DOOR_COUNT, type Rng } from './montyHall';
import {
  advanceStage,
  decide,
  describeDoor,
  finalDoor,
  hostOpens,
  initialStage,
  isSettled,
  newRound,
  nextAction,
  pickDoor,
  type StageState,
} from './stage';
import { stageScene } from './stageScene';

const run = (s: StageState) => settle(s, advanceStage, isSettled);
/** 미리 정한 값을 차례로 돌려주는 난수. */
const scripted = (values: number[]): Rng => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};
/** 자동차를 carDoor 에 두고 사회자 난수를 roll 로 둔 첫 판. */
const stageWith = (carDoor: number, roll: number): StageState => ({ ...initialStage(() => 0), carDoor, hostRoll: roll });

/** 상태에서 note 를 뺀 나머지. 순서를 건너뛴 입력이 상태를 바꾸지 않았는지 비교할 때 쓴다. */
const withoutNote = (s: StageState): Partial<StageState> => {
  const rest: Partial<StageState> = { ...s };
  delete rest.note;
  return rest;
};

describe('순서를 건너뛴 입력', () => {
  it('문을 고르기 전에는 사회자도, 바꾸기·유지하기도 상태를 바꾸지 않고 이유를 알린다', () => {
    const s = stageWith(1, 0);
    for (const act of [hostOpens, (x: StageState) => decide(x, 'switch'), (x: StageState) => decide(x, 'stay')]) {
      const n = act(s);
      expect(withoutNote(n)).toEqual(withoutNote(s));
      expect(n.note).toContain('먼저 문을 하나 고르세요');
    }
  });

  it('사회자가 문을 열기 전에는 바꾸기·유지하기가 상태를 바꾸지 않는다', () => {
    const s = pickDoor(stageWith(1, 0), 0);
    const n = decide(s, 'switch');
    expect(withoutNote(n)).toEqual(withoutNote(s));
    expect(n.note).toContain('사회자가 문을 하나 연 뒤에');
  });

  it('사회자가 문을 연 뒤에는 다른 문을 고를 수 없다', () => {
    const s = run(hostOpens(pickDoor(stageWith(1, 0), 0)));
    const n = pickDoor(s, 1);
    expect(withoutNote(n)).toEqual(withoutNote(s));
  });

  it('사회자의 문이 아직 열리는 중이면 바꾸기·유지하기를 받지 않는다', () => {
    let s = hostOpens(pickDoor(stageWith(1, 0), 0));
    s = advanceStage(s, 0.3);
    expect(s.door[s.opened as number]).toBeGreaterThan(0);
    expect(s.door[s.opened as number]).toBeLessThan(1);
    const n = decide(s, 'switch');
    expect(withoutNote(n)).toEqual(withoutNote(s));
    expect(n.note).toContain('여는 중');
  });

  it('판이 끝난 뒤의 문 고르기·바꾸기는 기록을 바꾸지 않는다', () => {
    const s = run(decide(run(hostOpens(pickDoor(stageWith(2, 0), 0))), 'stay'));
    expect(s.tally.rounds).toBe(1);
    for (const n of [pickDoor(s, 1), decide(s, 'switch'), hostOpens(s)]) {
      expect(n.tally).toEqual(s.tally);
      expect(n.final).toBe('stay');
    }
  });

  it('문을 고르기 전의 "한 판 더" 는 아무것도 바꾸지 않는다', () => {
    const s = stageWith(1, 0);
    expect(withoutNote(newRound(s, () => 0.9))).toEqual(withoutNote(s));
  });
});

describe('사회자', () => {
  // 상태 문구 "사회자가, 내가 고르지 않은 문 중 염소가 있는 N번 문을 엽니다" 의 근거.
  it('내가 고른 문과 자동차 문은 열지 않는다 (모든 경우)', () => {
    for (let car = 0; car < DOOR_COUNT; car++) {
      for (let pick = 0; pick < DOOR_COUNT; pick++) {
        for (const roll of [0, 0.49, 0.5, 0.999]) {
          const s = hostOpens(pickDoor(stageWith(car, roll), pick));
          expect(s.opened).not.toBe(pick);
          expect(s.opened).not.toBe(car);
          expect(s.note).toContain(`${(s.opened as number) + 1}번 문을 엽니다`);
          expect(s.doorTarget.filter((t) => t === 1)).toHaveLength(1);
        }
      }
    }
  });

  it('문을 연 뒤에도 고른 문과 남은 문은 닫혀 있다', () => {
    const s = run(hostOpens(pickDoor(stageWith(1, 0), 0)));
    expect(s.door).toEqual(s.door.map((_, i) => (i === s.opened ? 1 : 0)));
  });
});

describe('바꾸기와 유지하기', () => {
  it('처음 고른 문이 자동차가 아니면 바꿔서 자동차, 맞으면 유지해서 자동차', () => {
    for (let car = 0; car < DOOR_COUNT; car++) {
      for (let pick = 0; pick < DOOR_COUNT; pick++) {
        const opened = run(hostOpens(pickDoor(stageWith(car, 0.5), pick)));
        const sw = decide(opened, 'switch');
        const st = decide(opened, 'stay');
        expect(finalDoor(sw) === car).toBe(pick !== car);
        expect(finalDoor(st) === car).toBe(pick === car);
        expect(sw.tally.switchWins).toBe(pick !== car ? 1 : 0);
        expect(st.tally.stayWins).toBe(pick === car ? 1 : 0);
      }
    }
  });

  it('정하면 남은 문이 모두 열린다', () => {
    const s = run(decide(run(hostOpens(pickDoor(stageWith(0, 0), 1))), 'switch'));
    expect(s.door).toEqual([1, 1, 1]);
    expect(nextAction(s)).toBe('again');
  });
});

describe('새 판', () => {
  it('문이 하나라도 열려 있는 동안에는 자동차가 자리를 옮기지 않는다', () => {
    let s = run(decide(run(hostOpens(pickDoor(stageWith(0, 0), 1))), 'stay'));
    s = newRound(s, scripted([0.9, 0.3]));
    expect(s.pending?.carDoor).toBe(2);
    while (!isSettled(s)) {
      if (s.door.some((d) => d > 0)) expect(s.carDoor).toBe(0);
      s = advanceStage(s, 1 / 30);
    }
    expect(s.door).toEqual([0, 0, 0]);
    expect(s.carDoor).toBe(2);
    expect(s.hostRoll).toBe(0.3);
  });

  it('문이 닫히는 동안에는 문을 고를 수 없다', () => {
    let s = run(decide(run(hostOpens(pickDoor(stageWith(0, 0), 1))), 'stay'));
    s = advanceStage(newRound(s, () => 0.5), 0.2);
    const n = pickDoor(s, 0);
    expect(n.picked).toBeNull();
    expect(n.note).toContain('닫히는 중');
  });

  it('끝까지 하지 않은 판은 기록하지 않는다', () => {
    const s = run(newRound(run(hostOpens(pickDoor(stageWith(0, 0), 1))), () => 0.1));
    expect(s.tally.rounds).toBe(0);
    expect(nextAction(s)).toBe('pick');
  });
});

describe('움직임 줄이기와 멈춤', () => {
  it('settle 은 열리는 문을 끝 상태로 바로 보낸다', () => {
    const s = run(hostOpens(pickDoor(stageWith(2, 0), 0)));
    expect(isSettled(s)).toBe(true);
    expect(s.door[s.opened as number]).toBe(1);
  });

  it('멈춘 상태에서는 시간이 흘러도 같은 객체를 돌려준다', () => {
    const s = stageWith(1, 0);
    expect(advanceStage(s, 0.1)).toBe(s);
  });
});

describe('describeDoor', () => {
  it('바꾼 판에서는 처음 고른 문과 최종 선택을 구분해 읽는다', () => {
    const s = run(decide(run(hostOpens(pickDoor(stageWith(2, 0), 0))), 'switch'));
    expect(describeDoor(s, 0)).toBe('1번 문 열림, 염소 처음 고른 문');
    expect(describeDoor(s, 1)).toBe('2번 문 열림, 염소 사회자가 연 문');
    expect(describeDoor(s, 2)).toBe('3번 문 열림, 자동차 최종 선택');
  });

  it('닫힌 문은 안의 상품을 말하지 않는다', () => {
    const s = pickDoor(stageWith(1, 0), 1);
    for (let i = 0; i < DOOR_COUNT; i++) {
      expect(describeDoor(s, i)).not.toMatch(/자동차|염소/);
    }
  });
});

describe('stageScene', () => {
  it('모든 단계를 숫자 오류 없이 그린다', () => {
    const stages: StageState[] = [];
    let s = stageWith(1, 0.5);
    stages.push(s);
    s = pickDoor(s, 0);
    stages.push(s);
    s = hostOpens(s);
    for (let i = 0; i < 5; i++) stages.push((s = advanceStage(s, 0.2)));
    s = decide(s, 'switch');
    for (let i = 0; i < 5; i++) stages.push((s = advanceStage(s, 0.2)));
    s = newRound(s, () => 0.4);
    for (let i = 0; i < 6; i++) stages.push((s = advanceStage(s, 0.2)));
    for (const stage of stages) {
      expect(stageScene(stage)).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});
