import { describe, expect, it } from 'vitest';
import { STANDING_X, arrivalPos, guestOpacity, hotelFigure, roomY } from './hotelFigure';
import { HOTEL_STEP_IDS, VISIBLE_ROOMS, sceneForStep } from './hotelScene';

const rooms = (svg: string) => [...svg.matchAll(/data-room="(\d+)"/g)].map((m) => Number(m[1]));
const emptyRooms = (svg: string) => [...svg.matchAll(/data-room="(\d+)" data-empty="1"/g)].map((m) => Number(m[1]));

describe('hotelFigure', () => {
  it('모든 단계를 숫자 오류 없이 그린다', () => {
    for (const id of HOTEL_STEP_IDS) {
      for (const p of [0, 0.3, 0.5, 1]) {
        expect(hotelFigure(sceneForStep(id, p))).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('문은 1번부터 VISIBLE_ROOMS 번까지만 그린다 — 본문 "화면에 그려진 방은 12개뿐"', () => {
    for (const id of HOTEL_STEP_IDS) {
      expect(rooms(hotelFigure(sceneForStep(id, 1)))).toEqual(Array.from({ length: VISIBLE_ROOMS }, (_, i) => i + 1));
    }
  });

  it('빈 방으로 칠한 문은 그 순간의 빈 방과 같다', () => {
    for (const id of HOTEL_STEP_IDS) {
      for (const p of [0.5, 1]) {
        const scene = sceneForStep(id, p);
        const expected = scene.emptyHighlight.filter((r) => r <= VISIBLE_ROOMS);
        expect(emptyRooms(hotelFigure(scene))).toEqual(expected);
      }
    }
  });

  it('그린 방 안의 손님은 또렷하고, 그린 방을 지나간 손님은 흐려지다 사라진다', () => {
    for (let r = 1; r <= VISIBLE_ROOMS; r++) expect(guestOpacity(roomY(r))).toBe(1);
    const next = guestOpacity(roomY(VISIBLE_ROOMS + 1));
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
    expect(guestOpacity(roomY(VISIBLE_ROOMS + 2))).toBe(0);
    expect(guestOpacity(roomY(2 * VISIBLE_ROOMS))).toBe(0);
  });

  it('새 손님은 걸어오는 동안 문 앞에 선 손님과 겹치지 않는다', () => {
    // 몸 반지름 2.7 두 개에 여유를 조금 더한 거리.
    const MIN_GAP = 6;
    for (const id of ['board', 'odds'] as const) {
      const scene = sceneForStep(id, 1);
      const standing = scene.moves.filter((m) => m.to <= VISIBLE_ROOMS).map((m) => [STANDING_X, roomY(m.to)]);
      const arrivals = scene.arrivals.filter((r) => r <= VISIBLE_ROOMS);
      for (let k = 0; k <= 100; k++) {
        const a = k / 100;
        arrivals.forEach((room, i) => {
          const [x, y] = arrivalPos(i, room, a);
          for (const [sx, sy] of standing) {
            expect(Math.hypot(x - sx, y - sy), `${id} ${room}번 방 손님, 진행도 ${a}`).toBeGreaterThanOrEqual(MIN_GAP);
          }
        });
      }
    }
  });
});
