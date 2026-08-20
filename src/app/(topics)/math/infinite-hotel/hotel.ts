/**
 * 무한 호텔의 방 배정 규칙.
 *
 * 방 번호는 1 부터 시작하는 자연수다. 규칙 자체는 모든 자연수에 정의되지만,
 * 화면과 테스트는 언제나 **유한 구간** `1..upTo` 만 본다. 무한을 다루는 주제라서
 * 이 경계를 흐리면 안 된다 — 여기서 확인할 수 있는 것은 "유한 구간에서 그렇다"
 * 까지이고, 그 너머는 규칙의 형태가 보장한다.
 */

/** 손님이 옮겨 갈 방을 정하는 규칙. */
export type Rule =
  | { kind: 'stay' }
  | { kind: 'shift'; k: number }
  | { kind: 'double' };

/** 방 번호를 방 번호로 옮기는 함수. `Rule` 은 이 함수에 붙인 이름표다. */
export type RoomMap = (room: number) => number;

/** 방 번호를 1 이상의 정수로 맞춘다. 화면 입력이 소수나 0 으로 새는 것을 막는다. */
function normalizeRoom(room: number): number {
  return Math.max(1, Math.floor(room));
}

/**
 * 훑을 구간의 끝을 검증한다. 이 파일의 함수는 전부 `1..upTo` 를 한 칸씩 도는데,
 * `Infinity` 가 들어오면 루프가 끝나지 않아 브라우저 탭이 통째로 멈춘다.
 * 무한을 다루는 주제라고 해서 무한을 세려 들면 안 된다 — 세는 것은 언제나 유한 구간이다.
 *
 * @throws {RangeError} `upTo` 가 0 이상의 안전한 정수가 아닐 때
 */
function assertFiniteWindow(upTo: number): void {
  if (!Number.isSafeInteger(upTo) || upTo < 0) {
    throw new RangeError(`훑을 구간의 끝은 0 이상의 정수여야 한다: ${upTo}`);
  }
}

/** n → n + k. 모두가 k 칸씩 뒤로 밀린다. */
export function shiftBy(room: number, k: number): number {
  return normalizeRoom(room) + Math.floor(k);
}

/** n → 2n. 모두가 자기 번호의 두 배인 방으로 간다. */
export function doubleRoom(room: number): number {
  return normalizeRoom(room) * 2;
}

/** 규칙을 실제 함수로 편다. */
export function ruleToMap(rule: Rule): RoomMap {
  switch (rule.kind) {
    case 'stay':
      return room => normalizeRoom(room);
    case 'shift':
      return room => shiftBy(room, rule.k);
    case 'double':
      return doubleRoom;
  }
}

/**
 * `1..upTo` 에서 map 이 단사(injective)인가. 즉 서로 다른 두 손님이
 * 같은 방으로 가는 일이 없는가.
 *
 * 이것이 "아무도 쫓겨나지 않는다"의 형식적 표현이다. 방을 옮기라고만 하면
 * 두 사람이 한 방에서 마주치는 규칙도 만들 수 있고 (n → ⌈n/2⌉), 그때는
 * 누군가 밀려난다.
 */
export function isMapInjectiveOn(map: RoomMap, upTo: number): boolean {
  assertFiniteWindow(upTo);

  const seen = new Set<number>();
  for (let room = 1; room <= upTo; room += 1) {
    const to = map(room);
    if (seen.has(to)) return false;
    seen.add(to);
  }
  return true;
}

/** `isMapInjectiveOn` 을 규칙에 적용한 것. */
export function isInjectiveOn(rule: Rule, upTo: number): boolean {
  return isMapInjectiveOn(ruleToMap(rule), upTo);
}

/**
 * `1..upTo` 에서 규칙이 **쓸 수 있는** 방 번호를 내놓는가. `freedRooms` 가 유한
 * 구간만 훑고도 정확할 수 있는 근거이며, 동시에 "규칙이 호텔 밖(0 번 이하)으로
 * 손님을 내보내지 않는다"는 확인이기도 하다.
 *
 * 값이 유한한지를 먼저 본다. `map(room) < room` 만으로는 `NaN` 을 놓친다 —
 * `NaN` 과의 비교는 언제나 거짓이라 검사를 그냥 통과하고, 그 뒤 `freedRooms` 가
 * 만실인 호텔을 두고 "전 객실이 비었다"고 답한다.
 */
export function respectsFloor(rule: Rule, upTo: number): boolean {
  assertFiniteWindow(upTo);

  const map = ruleToMap(rule);
  for (let room = 1; room <= upTo; room += 1) {
    const to = map(room);
    if (!Number.isFinite(to) || to < room) return false;
  }
  return true;
}

/**
 * 규칙을 적용한 뒤 `1..upTo` 안에서 비는 방을 오름차순으로 돌려준다.
 *
 * `1..upTo` 밖의 손님은 세지 않는다. 방 번호를 줄이지 않는 규칙(`map(n) >= n`)
 * 이라면 `upTo` 보다 큰 방의 손님이 `upTo` 이하로 되돌아올 수 없기 때문이다.
 *
 * 그 전제를 여기서 **강제한다.** `Rule` 타입은 음수나 `NaN` 인 `k` 를 막지 못하는데,
 * 전제가 깨진 규칙을 그냥 계산하면 예외 없이 조용히 틀린 답이 나온다 —
 * `{ kind: 'shift', k: -1 }` 은 40 번 방이 빈다고 답하지만 실제로는 41 번 방
 * 손님이 그리로 내려온다. 그 값을 입실할 방으로 쓰면 두 손님이 한 방에서 만난다.
 * `k: NaN` 은 더 나빠서, 만실인 호텔을 두고 전 객실이 비었다고 답한다.
 * 화면은 이런 규칙을 만들지 않지만, 나중에 누가 넣었을 때 조용히 틀리는 것보다
 * 그 자리에서 멈추는 편이 낫다.
 *
 * @throws {RangeError} 규칙이 `1..upTo` 안에서 쓸 수 있는 방 번호를 내놓지 않을 때
 */
export function freedRooms(rule: Rule, upTo: number): number[] {
  if (!respectsFloor(rule, upTo)) {
    throw new RangeError(
      `쓸 수 없는 규칙(${ruleLabel(rule)})으로는 빈 방을 셀 수 없다. ` +
        '손님을 뒤로 보내거나 방 번호가 아닌 값으로 보내는 규칙은 이 호텔이 다루는 대상이 아니다.'
    );
  }

  const map = ruleToMap(rule);
  const taken = new Set<number>();

  for (let room = 1; room <= upTo; room += 1) {
    const to = map(room);
    if (to <= upTo) taken.add(to);
  }

  const freed: number[] = [];
  for (let room = 1; room <= upTo; room += 1) {
    if (!taken.has(room)) freed.push(room);
  }
  return freed;
}

/** 한 손님의 이동. `from` 이 손님을 식별한다 — 이동 전 방 번호다. */
export interface GuestMove {
  from: number;
  to: number;
}

/** `1..upTo` 손님들의 이동 목록. 화면이 출발점과 도착점을 잇는 데 쓴다. */
export function guestMoves(rule: Rule, upTo: number): GuestMove[] {
  assertFiniteWindow(upTo);

  const map = ruleToMap(rule);
  const moves: GuestMove[] = [];
  for (let room = 1; room <= upTo; room += 1) {
    moves.push({ from: room, to: map(room) });
  }
  return moves;
}

/** 규칙을 화면에 적을 때 쓰는 짧은 이름. */
export function ruleLabel(rule: Rule): string {
  switch (rule.kind) {
    case 'stay':
      return '그대로';
    case 'shift':
      return `n → n + ${Math.floor(rule.k)}`;
    case 'double':
      return 'n → 2n';
  }
}
