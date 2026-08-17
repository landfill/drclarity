import { describe, it, expect } from 'vitest';
import {
  DOOR_COUNT,
  chooseOpenDoor,
  playRound,
  resolveRound,
  switchTarget,
  winsWith,
  type Rng,
} from './montyHall';

/** 미리 정해둔 값을 순서대로 돌려주는 난수. 마지막 값에 도달하면 그 값을 계속 쓴다. */
function scriptedRng(values: number[]): Rng {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

describe('montyHall.ts', () => {
  it('사회자는 참가자가 고른 문과 자동차 문을 열지 않는다', () => {
    for (let carDoor = 0; carDoor < DOOR_COUNT; carDoor += 1) {
      for (let pickedDoor = 0; pickedDoor < DOOR_COUNT; pickedDoor += 1) {
        // 후보가 둘인 경우(carDoor === pickedDoor)까지 모두 훑기 위해 양 끝 난수를 쓴다.
        for (const roll of [0, 0.999]) {
          const opened = chooseOpenDoor(carDoor, pickedDoor, () => roll);
          expect(opened).not.toBe(carDoor);
          expect(opened).not.toBe(pickedDoor);
        }
      }
    }
  });

  it('바꾸기 대상은 고른 문도 열린 문도 아닌 남은 하나다', () => {
    for (let pickedDoor = 0; pickedDoor < DOOR_COUNT; pickedDoor += 1) {
      for (let openedDoor = 0; openedDoor < DOOR_COUNT; openedDoor += 1) {
        if (openedDoor === pickedDoor) continue;
        const target = switchTarget(pickedDoor, openedDoor);
        expect(target).not.toBe(pickedDoor);
        expect(target).not.toBe(openedDoor);
      }
    }
  });

  it('두 전략의 승패는 항상 정확히 하나만 참이다', () => {
    for (let carDoor = 0; carDoor < DOOR_COUNT; carDoor += 1) {
      for (let pickedDoor = 0; pickedDoor < DOOR_COUNT; pickedDoor += 1) {
        const trial = resolveRound(carDoor, pickedDoor, () => 0);
        expect(trial.switchWins).toBe(!trial.stayWins);
      }
    }
  });

  it('처음 고른 문이 자동차면 유지가, 아니면 바꾸기가 이긴다', () => {
    const stayWinning = resolveRound(1, 1, () => 0);
    expect(stayWinning.stayWins).toBe(true);
    expect(stayWinning.switchWins).toBe(false);

    const switchWinning = resolveRound(1, 0, () => 0);
    expect(switchWinning.switchWins).toBe(true);
    expect(switchWinning.stayWins).toBe(false);
    expect(switchWinning.switchDoor).toBe(1);
  });

  it('9가지 (자동차, 첫 선택) 조합에서 바꾸기가 6번 이긴다 — 2/3', () => {
    let switchWins = 0;
    let stayWins = 0;

    for (let carDoor = 0; carDoor < DOOR_COUNT; carDoor += 1) {
      for (let pickedDoor = 0; pickedDoor < DOOR_COUNT; pickedDoor += 1) {
        const trial = resolveRound(carDoor, pickedDoor, () => 0);
        if (trial.switchWins) switchWins += 1;
        if (trial.stayWins) stayWins += 1;
      }
    }

    expect(switchWins).toBe(6);
    expect(stayWins).toBe(3);
  });

  it('난수가 1에 가까워도 문 범위를 벗어나지 않는다', () => {
    const trial = playRound(scriptedRng([0.9999999]));
    for (const door of [trial.carDoor, trial.pickedDoor, trial.openedDoor, trial.switchDoor]) {
      expect(door).toBeGreaterThanOrEqual(0);
      expect(door).toBeLessThan(DOOR_COUNT);
    }
  });

  it('winsWith 는 전략별 승패 필드를 그대로 읽는다', () => {
    const trial = resolveRound(2, 0, () => 0);
    expect(winsWith(trial, 'switch')).toBe(trial.switchWins);
    expect(winsWith(trial, 'stay')).toBe(trial.stayWins);
  });

  it('playRound 는 규칙을 깨지 않는다 (다수 시행)', () => {
    for (let i = 0; i < 2000; i += 1) {
      const trial = playRound();
      expect(trial.openedDoor).not.toBe(trial.carDoor);
      expect(trial.openedDoor).not.toBe(trial.pickedDoor);
      expect(trial.switchDoor).not.toBe(trial.pickedDoor);
      expect(trial.switchDoor).not.toBe(trial.openedDoor);
      expect(trial.switchWins).toBe(!trial.stayWins);
    }
  });
});
