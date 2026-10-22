import { describe, expect, it } from 'vitest';
import { P, frameFor, withFrame } from '@/lib/colorfigures/core';
import { HOTEL_FIGURE_SIZE, HOTEL_VIEW, guestOpacity, guestPlacements, hotelFigure, roomY } from './hotelFigure';
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

  it('어느 단계 어느 순간에도 두 손님의 머리가 화면에서 겹치지 않는다', () => {
    // 머리는 화면 반지름 3 의 원이다. 두 머리 중심이 6 보다 가까우면 겹친다.
    const HEAD_Z = 12.8;
    const MIN_GAP = 6;
    const frame = frameFor(HOTEL_FIGURE_SIZE, 't', { view: HOTEL_VIEW });
    withFrame(frame, () => {
      for (const id of HOTEL_STEP_IDS) {
        for (let k = 0; k <= 50; k++) {
          const p = k / 50;
          const heads = guestPlacements(sceneForStep(id, p))
            .filter((g) => g.opacity > 0)
            .map((g) => ({ g, at: P(g.x, g.y, HEAD_Z) }));
          for (let i = 0; i < heads.length; i++) {
            for (let j = i + 1; j < heads.length; j++) {
              const d = Math.hypot(heads[i].at[0] - heads[j].at[0], heads[i].at[1] - heads[j].at[1]);
              const who = `${id} 진행도 ${p}: ${heads[i].g.kind} ${heads[i].g.label} 와 ${heads[j].g.kind} ${heads[j].g.label}`;
              expect(d, who).toBeGreaterThanOrEqual(MIN_GAP);
            }
          }
        }
      }
    });
  });
});
