import { describe, expect, it } from 'vitest';
import { VISIBLE_ROOMS } from './hotelRenderer';
import {
  HOTEL_STEP_IDS,
  durationForStep,
  freedForStep,
  isHotelStepId,
  ruleForStep,
  sceneForStep,
} from './hotelScene';

describe('isHotelStepId', () => {
  it('아는 단계만 통과시킨다 — steps.tsx 의 id 와 어긋나면 여기서 걸린다', () => {
    for (const id of HOTEL_STEP_IDS) {
      expect(isHotelStepId(id)).toBe(true);
    }
    expect(isHotelStepId('lobby')).toBe(false);
    expect(isHotelStepId('')).toBe(false);
  });
});

describe('ruleForStep', () => {
  it('만실 → 한 칸 밀기 → 두 배로 순서가 바뀌지 않는다', () => {
    expect(ruleForStep('full')).toEqual({ kind: 'stay' });
    expect(ruleForStep('shift')).toEqual({ kind: 'shift', k: 1 });
    expect(ruleForStep('board')).toEqual({ kind: 'shift', k: 1 });
    expect(ruleForStep('double')).toEqual({ kind: 'double' });
    expect(ruleForStep('odds')).toEqual({ kind: 'double' });
    expect(ruleForStep('conclusion')).toEqual({ kind: 'double' });
  });
});

describe('freedForStep', () => {
  it('만실 단계에는 빈 방이 없다', () => {
    expect(freedForStep('full')).toEqual([]);
  });

  it('한 칸 밀면 1번 방만 빈다', () => {
    expect(freedForStep('shift')).toEqual([1]);
  });

  it('두 배로 보내면 홀수 방이 빈다', () => {
    expect(freedForStep('double')).toEqual([1, 3, 5, 7, 9, 11]);
  });
});

describe('durationForStep', () => {
  it('모든 단계가 유한한 길이를 갖는다 — 끝나지 않는 루프를 만들지 않는다', () => {
    for (const id of HOTEL_STEP_IDS) {
      const duration = durationForStep(id);
      expect(duration).toBeGreaterThan(0);
      expect(Number.isFinite(duration)).toBe(true);
    }
  });
});

describe('sceneForStep', () => {
  it('만실 단계는 아무도 움직이지 않고 빈 방도 없다', () => {
    const scene = sceneForStep('full', 1);
    expect(scene.moves.every(move => move.from === move.to)).toBe(true);
    expect(scene.emptyHighlight).toEqual([]);
    expect(scene.arrivals).toEqual([]);
  });

  it('이동 중에는 빈 방을 강조하지 않는다 — 이동이 끝나야 방이 빈다', () => {
    expect(sceneForStep('shift', 0.5).emptyHighlight).toEqual([]);
    expect(sceneForStep('shift', 1).emptyHighlight).toEqual([1]);
  });

  it('입실 단계는 이동이 끝난 자리에서 시작한다', () => {
    const scene = sceneForStep('board', 0);
    expect(scene.progress).toBe(1);
    expect(scene.arrivals).toEqual([1]);
    expect(scene.arrivalProgress).toBe(0);
  });

  it('입실이 끝나면 빈 방 강조가 사라진다', () => {
    expect(sceneForStep('board', 1).emptyHighlight).toEqual([]);
    expect(sceneForStep('odds', 1).emptyHighlight).toEqual([]);
  });

  it('두 배 단계에서 홀수 방이 비고 그 방에 새 손님이 든다', () => {
    const moved = sceneForStep('double', 1);
    expect(moved.emptyHighlight).toEqual([1, 3, 5, 7, 9, 11]);
    expect(sceneForStep('odds', 1).arrivals).toEqual(moved.emptyHighlight);
  });

  it('결론 단계는 마지막 화면을 그대로 유지한다', () => {
    const scene = sceneForStep('conclusion', 1);
    expect(scene.progress).toBe(1);
    expect(scene.arrivalProgress).toBe(1);
    expect(scene.emptyHighlight).toEqual([]);
  });

  it('reduced-motion 처럼 progress=1 로 한 번만 불러도 각 단계의 결과가 남는다', () => {
    // 훅이 이 형태로 부른다 (§5.2). 최종 상태가 비어 있으면 내용이 전달되지 않는다.
    for (const id of HOTEL_STEP_IDS) {
      const scene = sceneForStep(id, 1);
      expect(scene.moves).toHaveLength(VISIBLE_ROOMS);
      expect(scene.progress).toBe(1);
    }
    expect(sceneForStep('board', 1).arrivalProgress).toBe(1);
    expect(sceneForStep('odds', 1).arrivalProgress).toBe(1);
  });

  it('진행도가 구간을 벗어나도 장면이 깨지지 않는다', () => {
    expect(sceneForStep('shift', -1).progress).toBe(0);
    expect(sceneForStep('shift', 5).progress).toBe(1);
  });
});
