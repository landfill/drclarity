/*
 * 무한 호텔 figure 의 장면. 복도를 따라 방문이 오른쪽 안쪽으로 줄지어 있고, 손님은 저마다 자기 방문 앞에 선다.
 * 그리는 방은 1번부터 VISIBLE_ROOMS 번까지다. 그 너머는 흐린 방 하나와 "…" 로만 잇고, 끝 벽은 그리지 않는다
 * (본문: "화면에 그려진 방은 12개뿐", "마지막 방은 없습니다").
 *
 * 그리는 순서: 복도 바닥 → 건물 정면과 문 → 흐린 다음 방 → 손님들(가까운 것이 나중) → 이름표.
 */
import {
  CERAMIC,
  INK,
  P,
  PALS,
  WOOD,
  castShadow,
  depthOf,
  labelScale,
  fill,
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
  type Mat,
  type Vec3,
  type View,
} from '@/lib/colorfigures/core';
import type { HotelScene } from './hotelScene';
import { VISIBLE_ROOMS } from './hotelScene';

/** 방 한 칸의 너비(y 방향). */
const ROOM_W = 14;
/** 1번 방 왼쪽 끝의 y. 방 번호가 커질수록 보는 사람의 오른쪽(−y)으로 간다. */
const Y_LEFT = 196;
/** 마지막으로 그리는 방(VISIBLE_ROOMS 번)의 오른쪽 끝. */
const Y_LAST = Y_LEFT - VISIBLE_ROOMS * ROOM_W;
/** 흐린 다음 방이 끝나는 자리. 그 너머는 "…" 뿐이다. */
const Y_GHOST = Y_LAST - ROOM_W;
/** 손님이 이 y 보다 오른쪽으로 가면 흐려지기 시작해 Y_GHOST 에서 사라진다. */
const FADE_START = Y_LAST;

/** 건물 정면 x, 높이. */
const FACADE_X = 10;
const FACADE_H = 30;
/** 문 높이와 반폭. */
const DOOR_H = 19;
const DOOR_HALF = 4.6;
/** 손님이 서는 x (문 앞), 옮길 때 복도로 비켜서는 거리. */
const STAND_X = 18;
const STEP_OUT = 6;
/** 로비: 1번 방 앞 복도 바깥쪽. */
const LOBBY_X = 29;
/** 복도 바닥의 바깥 끝. */
const FLOOR_X = 35;

/**
 * 보는 방향. 기본 시점(방위 25°)이면 방 열두 칸이 비스듬히 솟아 그림이 작아진다. 방위를 줄여
 * 복도를 거의 가로로 눕히고 문이 정면에 가깝게 보이게 한다.
 */
export const HOTEL_VIEW: View = { az: 12, el: 28 };

/** 장면의 경계 상자 [W, D, H]. */
export const HOTEL_FIGURE_SIZE: Vec3 = [FLOOR_X, Y_LEFT + 4, FACADE_H + 2];

const WALL: Mat = CERAMIC;
const DOOR: Mat = WOOD;
const EMPTY_DOOR: Mat = PALS.mustard;
const GUEST: Mat = PALS.cobalt;
const NEW_GUEST: Mat = PALS.mustard;
const CARPET: Mat = PALS.blush;

/** n 번 방 문의 가운데 y. n 이 VISIBLE_ROOMS 를 넘어도 같은 식으로 오른쪽에 계속 놓인다. */
export const roomY = (room: number) => Y_LEFT - (room - 0.5) * ROOM_W;

/** 로비에 줄 선 i 번째 손님의 y. */
const lobbyY = (i: number) => Y_LEFT + 2 - i * 8;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * 방 번호와 손님 번호의 글자 배율. 작은 화면에서 이름표처럼 키우되, 두 자리 번호가 이웃 칸과
 * 겹치지 않는 1.15 배에서 멈춘다 (390px 화면에서 "10 11 12" 가 붙지 않는 값).
 */
const NUMBER_SCALE_MAX = 1.15;
const numberSize = (base: number) => base * Math.min(NUMBER_SCALE_MAX, labelScale());

/** 오른쪽 끝을 넘어가는 손님의 불투명도. 호텔이 그 너머로 이어진다는 표시다. */
export const guestOpacity = (y: number) => (y >= FADE_START ? 1 : clamp01((y - Y_GHOST) / (FADE_START - Y_GHOST)));

/** 복도 바닥. 오른쪽 끝은 닫지 않는다 — 바닥이 끝나는 선을 그리면 마지막 방이 생긴다. */
function floor(): string {
  const pts: Vec3[] = [[0, Y_GHOST, 0], [FLOOR_X, Y_GHOST, 0], [FLOOR_X, Y_LEFT + 4, 0], [0, Y_LEFT + 4, 0]];
  let s = fill(pd(pts), CARPET.l, 'opacity=".55"');
  s += line([[FLOOR_X, Y_GHOST, 0], [FLOOR_X, Y_LEFT + 4, 0], [0, Y_LEFT + 4, 0]], 1.4);
  return s;
}

/** 문 하나와 그 위 번호판. */
function door(room: number, empty: boolean): string {
  const y = roomY(room);
  const m = empty ? EMPTY_DOOR : DOOR;
  const q = on(PX(FACADE_X + 0.05), rectUV(y - DOOR_HALF, 0, y + DOOR_HALF, DOOR_H));
  let s = shape(q, tone([1, 0, 0], m), 1.1);
  // 손잡이
  s += `<circle cx="${P(FACADE_X + 0.1, y - DOOR_HALF + 1.6, DOOR_H * 0.48)[0].toFixed(1)}" cy="${P(FACADE_X + 0.1, y - DOOR_HALF + 1.6, DOOR_H * 0.48)[1].toFixed(1)}" r="0.9" fill="${INK}"/>`;
  s += tx(FACADE_X + 0.1, y, DOOR_H + 6.5, String(room), numberSize(8));
  return `<g data-room="${room}"${empty ? ' data-empty="1"' : ''}>${s}</g>`;
}

/** 건물 정면: 1번 방 왼쪽 끝부터 VISIBLE_ROOMS 번 방 오른쪽 끝까지. 오른쪽 옆면은 이 시점에서 보이지 않는다. */
function facade(empty: Set<number>): string {
  const x0 = 0;
  const x1 = FACADE_X;
  const y0 = Y_LAST;
  const y1 = Y_LEFT;
  let s = shape([[x1, y0, 0], [x1, y1, 0], [x1, y1, FACADE_H], [x1, y0, FACADE_H]], tone([1, 0, 0], WALL), 1.2);
  s += shape([[x0, y0, FACADE_H], [x1, y0, FACADE_H], [x1, y1, FACADE_H], [x0, y1, FACADE_H]], tone([0, 0, 1], WALL), 1);
  s += shape([[x0, y1, 0], [x1, y1, 0], [x1, y1, FACADE_H], [x0, y1, FACADE_H]], toneI([0, 1, 0], WALL), 1.2);
  for (let room = 1; room <= VISIBLE_ROOMS; room++) s += door(room, empty.has(room));
  return s;
}

/** VISIBLE_ROOMS 너머의 흐린 다음 방. 외곽을 닫지 않아 벽 끝처럼 보이지 않는다. */
function ghost(): string {
  const x1 = FACADE_X;
  const y = roomY(VISIBLE_ROOMS + 1);
  let s = fill(pd([[x1, Y_GHOST, 0], [x1, Y_LAST, 0], [x1, Y_LAST, FACADE_H], [x1, Y_GHOST, FACADE_H]]), tone([1, 0, 0], WALL));
  s += fill(pd([[0, Y_GHOST, FACADE_H], [x1, Y_GHOST, FACADE_H], [x1, Y_LAST, FACADE_H], [0, Y_LAST, FACADE_H]]), tone([0, 0, 1], WALL));
  s += fill(pd(on(PX(x1 + 0.05), rectUV(y - DOOR_HALF, 0, y + DOOR_HALF, DOOR_H))), tone([1, 0, 0], DOOR));
  s += line([[x1, Y_GHOST, 0], [x1, Y_LAST, 0]], 1);
  s += line([[x1, Y_GHOST, FACADE_H], [x1, Y_LAST, FACADE_H]], 1);
  return `<g opacity=".35">${s}</g>`;
}

/** 손님 한 명: 몸통, 머리, 머리 위 번호(온 방). */
function guest(x: number, y: number, z: number, m: Mat, label: string, opacity: number): string {
  if (opacity <= 0) return '';
  let s = castShadow([[x - 2, y - 2, z], [x + 2, y + 2, z], [x, y, z + 14]], 0);
  s += rod([x, y, z + 0.5], [x, y, z + 9.5], 2.7, m, toneI, 1);
  const [X, Y] = P(x, y, z + 12.8);
  const R = 3;
  s += `<circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="${R}" fill="${m.m}"/>`;
  s += `<circle cx="${(X - R * 0.25).toFixed(1)}" cy="${(Y - R * 0.3).toFixed(1)}" r="${(R * 0.55).toFixed(1)}" fill="${m.l}"/>`;
  s += `<circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="${R}" fill="none" stroke="${INK}" stroke-width="1.1"/>`;
  if (label) {
    const [LX, LY] = P(x, y, z + 18.6);
    s += `<text x="${LX.toFixed(1)}" y="${LY.toFixed(1)}" font-size="${numberSize(6.4).toFixed(1)}" text-anchor="middle" font-weight="800" fill="${INK}">${label}</text>`;
  }
  return opacity < 1 ? `<g opacity="${opacity.toFixed(2)}">${s}</g>` : s;
}

interface Placed {
  depth: number;
  svg: string;
}

/** 장면 전체. */
export function hotelFigure(scene: HotelScene): string {
  const empty = new Set(scene.emptyHighlight);
  let out = floor();
  out += ghost();
  out += facade(empty);

  const placed: Placed[] = [];
  const p = clamp01(scene.progress);
  for (const mv of scene.moves) {
    const moving = mv.from !== mv.to;
    const y = roomY(mv.from) + (roomY(mv.to) - roomY(mv.from)) * p;
    // 옮기는 동안 복도로 한 걸음 비켜선다. 제자리에서 미끄러지면 누가 어디로 가는지 따라가기 어렵다.
    const x = STAND_X + (moving ? STEP_OUT * Math.sin(Math.PI * p) : 0);
    const pos: Vec3 = [x, y, 0];
    placed.push({ depth: depthOf(pos), svg: guest(x, y, 0, GUEST, String(mv.from), guestOpacity(y)) });
  }

  const a = clamp01(scene.arrivalProgress);
  if (a > 0) {
    scene.arrivals
      .filter((room) => room <= VISIBLE_ROOMS)
      .forEach((room, i) => {
        const y0 = lobbyY(i);
        const y = y0 + (roomY(room) - y0) * a;
        const x = LOBBY_X + (STAND_X - LOBBY_X) * a;
        placed.push({ depth: depthOf([x, y, 0]), svg: guest(x, y, 0, NEW_GUEST, '새', 1) });
      });
  }

  for (let i = 0; i < scene.waitingCount; i++) {
    const y = lobbyY(i);
    placed.push({ depth: depthOf([LOBBY_X, y, 0]), svg: guest(LOBBY_X, y, 0, NEW_GUEST, '', 1) });
  }

  placed.sort((m, n) => m.depth - n.depth);
  out += placed.map((g) => g.svg).join('');

  // 이름표: 로비, 처음 빈 방, 이어지는 쪽. 셋을 넘지 않는다.
  if (scene.waitingLabel && scene.waitingCount > 0) {
    out += tag([LOBBY_X, lobbyY(0), 12], 30, 26, scene.waitingLabel);
  }
  const firstEmpty = scene.emptyHighlight.find((room) => room <= VISIBLE_ROOMS);
  if (firstEmpty !== undefined) {
    out += tag([FACADE_X, roomY(firstEmpty), DOOR_H], -10, -34, '빈 방', true);
  }
  const [cx, cy] = P(FACADE_X + 4, Y_GHOST - 2, 4);
  out += `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="11" font-weight="800" fill="${INK}" text-anchor="middle">…</text>`;
  out += tag([FACADE_X, Y_GHOST + 2, FACADE_H], 20, -26, '계속');
  out += ink(pd([[FACADE_X, Y_LEFT, 0], [FACADE_X, Y_LAST, 0]]), 1.6);
  return out;
}
