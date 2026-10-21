/*
 * 몬티 홀 무대 figure 의 장면. 나무 무대 위에 벽 하나, 벽에 문 세 개. 문 뒤 어두운 방마다 상품이 하나씩 있다.
 * 문은 옆(보는 사람의 오른쪽)으로 미끄러져 벽 속으로 들어간다. 경첩 문은 이 시점에서 이웃 문을 가린다.
 *
 * 그리는 순서: 무대 → 벽 그림자 → 문마다 (방 안쪽 → 상품 → 문짝, 모두 문 구멍 안으로 자름)
 *            → 벽 앞면(구멍 뚫린 한 면) → 벽 윗면·옆면 → 벽 외곽 잉크 → 이름표.
 */
import {
  CERAMIC,
  CLEAR,
  DARK,
  METAL,
  PALS,
  WOOD,
  act,
  board,
  boardTop,
  box,
  castShadow,
  clipTo,
  cylX,
  ease,
  fill,
  hullInk,
  ink,
  line,
  on,
  pd,
  PX,
  rectUV,
  rod,
  shape,
  tag,
  tone,
  toneI,
  tx,
  type Vec3,
} from '@/lib/colorfigures/core';
import { DOOR_COUNT } from './montyHall';
import { finalDoor, type StageState } from './stage';

const BOARD_H = 3;
const BOARD: [number, number, number, number] = [0, 0, 62, 164];
/** 벽: 뒤 x = WALL_X0, 앞면 x = WALL_X1. */
const WALL_X0 = 30;
const WALL_X1 = 35;
const WALL_Y0 = 6;
const WALL_Y1 = 158;
const WALL_TOP = 78;
/** 문 구멍: 너비 2·HALF, 높이 BOARD_H..OPEN_TOP. */
const HALF = 18;
const OPEN_TOP = 55;
/** 방 뒷벽. */
const ROOM_X0 = 6;
/** 문짝 앞면 (벽 앞면보다 조금 안쪽). */
const LEAF_X = 34.2;
const LEAF_T = 0.8;

/** 문 i 의 가운데 y. 1번 문이 보는 사람의 왼쪽(+y)에 온다. */
export const doorY = (i: number) => 128 - 46 * i;

/** 장면의 경계 상자 [W, D, H]. */
export const STAGE_SIZE: Vec3 = [BOARD[2], BOARD[3], WALL_TOP];

const WALL = PALS.mustard;
const DOOR = PALS.cobalt;
const CAR = PALS.tomato;
const GOAT = CERAMIC;

/** 문 구멍의 외곽선 (벽 앞면 위). */
const opening = (i: number): Vec3[] =>
  on(PX(WALL_X1), rectUV(doorY(i) - HALF, BOARD_H, doorY(i) + HALF, OPEN_TOP));

/** 방 안쪽: 뒷벽, 오른쪽 옆벽, 바닥. */
function room(i: number): string {
  const y0 = doorY(i) - HALF;
  const y1 = doorY(i) + HALF;
  let s = shape([[ROOM_X0, y0, BOARD_H], [ROOM_X0, y1, BOARD_H], [ROOM_X0, y1, OPEN_TOP], [ROOM_X0, y0, OPEN_TOP]], DARK.l, 0.8);
  // 옆벽은 뒷벽보다 한 단계만 어둡게. 가장 어두운 면을 크게 두면 검은 판처럼 보인다.
  s += shape([[ROOM_X0, y0, BOARD_H], [WALL_X1, y0, BOARD_H], [WALL_X1, y0, OPEN_TOP], [ROOM_X0, y0, OPEN_TOP]], DARK.m, 0.8);
  s += shape([[ROOM_X0, y0, BOARD_H], [WALL_X1, y0, BOARD_H], [WALL_X1, y1, BOARD_H], [ROOM_X0, y1, BOARD_H]], DARK.m, 0.8);
  return s;
}

/** 옆으로 선 자동차. 앞쪽 바퀴만 보인다. */
function car(yc: number): string {
  const z = BOARD_H;
  const pts: Vec3[] = [
    [12, yc - 13, z], [24, yc - 13, z], [24, yc + 13, z], [12, yc + 13, z],
    [12, yc - 13, z + 16], [24, yc + 13, z + 16],
  ];
  let s = castShadow(pts, z);
  s += box(12, yc - 13, z + 2.6, 24, yc + 13, z + 8.6, CAR, tone);
  s += box(13.5, yc - 6.5, z + 8.6, 22.5, yc + 5.5, z + 13, CAR, tone);
  // 옆 유리 두 장
  for (const [a, b] of [[yc - 5.6, yc - 0.8], [yc + 0.2, yc + 4.6]]) {
    s += shape([[22.5, a, z + 9.4], [22.5, b, z + 9.4], [22.5, b, z + 12.3], [22.5, a, z + 12.3]], CLEAR.m, 0.7);
  }
  for (const wy of [yc - 8.5, yc + 8.5]) s += cylX(21.4, 24.8, wy, z + 3, 3, DARK, toneI, 1);
  s += hullInk([[12, yc - 13, z + 2.6], [24, yc - 13, z + 2.6], [24, yc + 13, z + 8.6], [13.5, yc - 6.5, z + 13], [22.5, yc + 5.5, z + 13], [24, yc + 13, z + 2.6]], 1.4);
  return s;
}

/** 옆으로 선 염소 (머리가 보는 사람의 왼쪽). */
function goat(yc: number): string {
  const z = BOARD_H;
  const legs = (x: number) =>
    [yc - 7, yc + 4]
      .map((y) => rod([x, y, z + 1.2], [x, y, z + 12], 0.9, GOAT) + rod([x, y, z], [x, y, z + 1.2], 0.9, DARK))
      .join('');
  let s = castShadow([[14.5, yc - 10, z], [20.5, yc + 12, z], [17, yc + 10, z + 27]], z);
  s += legs(15.2);
  s += rod([17.5, yc - 9, z + 16.5], [17.5, yc - 10.8, z + 19], 0.6, GOAT);
  s += box(14.5, yc - 9, z + 11, 20.5, yc + 6, z + 18.5, GOAT, tone);
  s += legs(19.8);
  s += rod([17.5, yc + 5, z + 16.5], [17.5, yc + 8.2, z + 21.5], 1.9, GOAT);
  s += box(15.5, yc + 7, z + 20, 19.5, yc + 12.5, z + 24.5, GOAT, tone);
  for (const hx of [16.3, 18.7]) s += rod([hx, yc + 8.6, z + 24.5], [hx, yc + 6.6, z + 28], 0.7, DARK, toneI, 0.8, 0.25);
  // 눈과 턱수염
  s += fill(pd(on(PX(19.6), rectUV(yc + 10.2, z + 22.4, yc + 11, z + 23.2))), DARK.d);
  s += rod([18.5, yc + 12, z + 20], [18.5, yc + 12.3, z + 17.8], 0.5, DARK);
  return s;
}

/** 문짝 하나. open 0..1 만큼 오른쪽(−y)으로 미끄러져 있다. */
function leaf(i: number, open: number): string {
  const shift = -2 * HALF * ease(open);
  const y0 = doorY(i) - HALF + shift;
  const y1 = doorY(i) + HALF + shift;
  const z0 = BOARD_H;
  const z1 = OPEN_TOP;
  let s = '';
  // 왼쪽 옆면: 문이 미끄러지면 드러난다.
  s += shape([[LEAF_X - LEAF_T, y1, z0], [LEAF_X, y1, z0], [LEAF_X, y1, z1], [LEAF_X - LEAF_T, y1, z1]], toneI([0, 1, 0], DOOR), 0.8);
  s += shape([[LEAF_X, y0, z0], [LEAF_X, y1, z0], [LEAF_X, y1, z1], [LEAF_X, y0, z1]], tone([1, 0, 0], DOOR), 1.2);
  // 문판 두 칸과 손잡이
  for (const [a, b] of [[z0 + 6, z0 + 22], [z0 + 27, z1 - 6]]) {
    s += line([[LEAF_X, y0 + 6, a], [LEAF_X, y1 - 6, a], [LEAF_X, y1 - 6, b], [LEAF_X, y0 + 6, b], [LEAF_X, y0 + 6, a]], 0.9);
  }
  s += cylX(LEAF_X, LEAF_X + 1.2, y1 - 3.2, z0 + 24, 1, METAL, toneI, 0.8, 12);
  return s;
}

/** 이름표를 달 상품 윗점. */
const prizeTop = (s: StageState, i: number): Vec3 =>
  i === s.carDoor ? [18, doorY(i), BOARD_H + 13] : [17.5, doorY(i) + 9, BOARD_H + 25];

/** 장면 전체. */
export function stageScene(s: StageState): string {
  let out = board(...BOARD, BOARD_H, 6, WOOD);
  const corners: Vec3[] = [];
  for (const x of [WALL_X0, WALL_X1]) for (const y of [WALL_Y0, WALL_Y1]) for (const z of [BOARD_H, WALL_TOP]) corners.push([x, y, z]);
  out += castShadow(corners, BOARD_H, boardTop(...BOARD, BOARD_H, 6));

  for (let i = 0; i < DOOR_COUNT; i++) {
    const inner = room(i) + (i === s.carDoor ? car(doorY(i)) : goat(doorY(i)));
    out += clipTo(opening(i), inner);
    out += clipTo(opening(i), act(`door-${i}`, leaf(i, s.door[i])));
  }

  // 벽 앞면: 구멍 셋을 뚫은 한 면
  const front = on(PX(WALL_X1), rectUV(WALL_Y0, BOARD_H, WALL_Y1, WALL_TOP));
  const holes = Array.from({ length: DOOR_COUNT }, (_, i) => pd(opening(i).slice().reverse())).join('');
  out += `<path d="${pd(front)}${holes}" fill="${tone([1, 0, 0], WALL)}" fill-rule="evenodd"/>`;
  out += ink(pd(front), 2.2);
  for (let i = 0; i < DOOR_COUNT; i++) {
    out += ink(pd(opening(i)), 1.7);
    out += tx(WALL_X1, doorY(i), OPEN_TOP + 15, String(i + 1), 13);
  }
  out += shape([[WALL_X0, WALL_Y0, WALL_TOP], [WALL_X1, WALL_Y0, WALL_TOP], [WALL_X1, WALL_Y1, WALL_TOP], [WALL_X0, WALL_Y1, WALL_TOP]], tone([0, 0, 1], WALL), 1);
  out += shape([[WALL_X0, WALL_Y1, BOARD_H], [WALL_X1, WALL_Y1, BOARD_H], [WALL_X1, WALL_Y1, WALL_TOP], [WALL_X0, WALL_Y1, WALL_TOP]], toneI([0, 1, 0], WALL), 1);
  out += hullInk(corners, 2.8);

  // 이름표: 다 열린 문의 상품, 그리고 고른 문
  for (let i = 0; i < DOOR_COUNT; i++) {
    if (s.door[i] < 1) continue;
    const car = i === s.carDoor;
    // 이름표는 문 구멍 안, 상품 바로 위에 둔다. 벽 위의 문 번호를 가리지 않는다.
    out += tag(prizeTop(s, i), 4, car ? -34 : -20, car ? '자동차' : '염소', car);
  }
  const fd = finalDoor(s);
  if (s.picked !== null) {
    const switched = fd !== null && fd !== s.picked;
    out += tag([WALL_X1, doorY(s.picked), BOARD_H], -14, 34, switched ? '처음 선택' : fd !== null ? '최종 선택' : '내 선택', fd === s.picked);
  }
  if (fd !== null && fd !== s.picked) out += tag([WALL_X1, doorY(fd), BOARD_H], -14, 34, '최종 선택', true);
  return out;
}
