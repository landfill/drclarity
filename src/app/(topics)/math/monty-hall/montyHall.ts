/**
 * 몬티 홀 문제의 순수 로직.
 *
 * 규칙: 문 3개 중 하나에 자동차, 나머지 둘에 염소가 있다.
 * 참가자가 문 하나를 고르면 사회자는 **자동차 위치를 알고 있는 상태로**
 * 참가자가 고르지 않은 문 중 염소가 있는 문 하나를 열어 보여준다.
 * 참가자는 남은 문으로 바꿀지, 처음 선택을 유지할지 결정한다.
 *
 * 난수는 주입 가능하게 두어 테스트에서 결정적으로 검증한다.
 */

export const DOOR_COUNT = 3;

/** 0, 1, 2 중 하나. */
export type DoorIndex = number;

export type Strategy = 'switch' | 'stay';

/** 0 이상 1 미만의 난수를 돌려주는 함수. 기본값은 Math.random. */
export type Rng = () => number;

export interface MontyHallTrial {
  /** 자동차가 있는 문. */
  carDoor: DoorIndex;
  /** 참가자가 처음 고른 문. */
  pickedDoor: DoorIndex;
  /** 사회자가 열어 보인 염소 문. */
  openedDoor: DoorIndex;
  /** 바꾸기로 했을 때 최종적으로 고르게 되는 문. */
  switchDoor: DoorIndex;
  /** 바꿨다면 자동차를 얻는가. */
  switchWins: boolean;
  /** 유지했다면 자동차를 얻는가. */
  stayWins: boolean;
}

function randomDoor(rng: Rng): DoorIndex {
  return Math.min(DOOR_COUNT - 1, Math.floor(rng() * DOOR_COUNT));
}

/**
 * 사회자가 열 문을 고른다. 참가자가 고른 문과 자동차가 있는 문은 열 수 없다.
 *
 * 참가자가 자동차를 골랐다면 후보가 둘이므로 난수로 하나를 고르고,
 * 염소를 골랐다면 열 수 있는 문이 하나로 정해진다.
 */
export function chooseOpenDoor(
  carDoor: DoorIndex,
  pickedDoor: DoorIndex,
  rng: Rng = Math.random,
): DoorIndex {
  const candidates: DoorIndex[] = [];
  for (let door = 0; door < DOOR_COUNT; door += 1) {
    if (door !== carDoor && door !== pickedDoor) candidates.push(door);
  }
  const index = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
  return candidates[index];
}

/** 사회자가 문을 연 뒤, 바꾸기를 택했을 때 가게 되는 문. */
export function switchTarget(pickedDoor: DoorIndex, openedDoor: DoorIndex): DoorIndex {
  for (let door = 0; door < DOOR_COUNT; door += 1) {
    if (door !== pickedDoor && door !== openedDoor) return door;
  }
  // 문이 3개이고 pickedDoor !== openedDoor 인 한 도달할 수 없다.
  throw new Error('바꿀 수 있는 문이 없습니다.');
}

/**
 * 한 판을 끝까지 진행한다.
 *
 * 한 번의 시행에서 두 전략의 결과가 **동시에** 정해진다는 점이 중요하다.
 * 처음 고른 문이 자동차면 유지가 이기고, 아니면 바꾸기가 이긴다.
 * 그래서 두 전략을 비교할 때 시행을 따로 돌릴 필요가 없다.
 */
export function playRound(rng: Rng = Math.random): MontyHallTrial {
  const carDoor = randomDoor(rng);
  const pickedDoor = randomDoor(rng);
  const openedDoor = chooseOpenDoor(carDoor, pickedDoor, rng);
  const switchDoor = switchTarget(pickedDoor, openedDoor);

  return {
    carDoor,
    pickedDoor,
    openedDoor,
    switchDoor,
    switchWins: switchDoor === carDoor,
    stayWins: pickedDoor === carDoor,
  };
}

/** 참가자의 선택이 이미 정해진 상태에서 나머지를 채운다. 직접 플레이 모드용. */
export function resolveRound(
  carDoor: DoorIndex,
  pickedDoor: DoorIndex,
  rng: Rng = Math.random,
): MontyHallTrial {
  const openedDoor = chooseOpenDoor(carDoor, pickedDoor, rng);
  const switchDoor = switchTarget(pickedDoor, openedDoor);

  return {
    carDoor,
    pickedDoor,
    openedDoor,
    switchDoor,
    switchWins: switchDoor === carDoor,
    stayWins: pickedDoor === carDoor,
  };
}

/** 이 시행이 해당 전략에서 이겼는가. */
export function winsWith(trial: MontyHallTrial, strategy: Strategy): boolean {
  return strategy === 'switch' ? trial.switchWins : trial.stayWins;
}

/** 이론값. 바꾸면 2/3, 유지하면 1/3. */
export const THEORETICAL_WIN_RATE: Record<Strategy, number> = {
  switch: 2 / 3,
  stay: 1 / 3,
};
