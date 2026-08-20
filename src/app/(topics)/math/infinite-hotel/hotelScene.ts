import { type Rule, freedRooms, guestMoves } from './hotel';
import { VISIBLE_ROOMS, type HotelScene } from './hotelRenderer';

/**
 * 풀이 단계와 화면 상태의 대응.
 *
 * 단계는 **인덱스가 아니라 id 로** 식별한다. `steps.tsx` 의 배열 순서와 여기의
 * 분기를 인덱스로 묶으면, 단계를 하나 끼워 넣을 때 화면이 조용히 어긋난다.
 *
 * 여기서 계산하는 것은 전부 화면에 보이는 `1..VISIBLE_ROOMS` 구간이다.
 * 규칙 자체는 무한히 많은 방에 정의되지만, 그릴 수 있는 것은 유한 구간뿐이다.
 */

export const HOTEL_STEP_IDS = [
  /** 만실. 아무도 움직이지 않는다. */
  'full',
  /** 한 칸씩 밀기 (n → n+1). */
  'shift',
  /** 1번 방에 새 손님 입실. */
  'board',
  /** 두 배 방으로 (n → 2n). */
  'double',
  /** 홀수 방에 버스 손님 입실. */
  'odds',
  /** 결론. 마지막 화면을 유지한다. */
  'conclusion',
] as const;

export type HotelStepId = (typeof HOTEL_STEP_IDS)[number];

/** `SolutionStepper` 가 돌려주는 `step.id` 를 좁힌다. */
export function isHotelStepId(id: string): id is HotelStepId {
  return (HOTEL_STEP_IDS as readonly string[]).includes(id);
}

const STAY: Rule = { kind: 'stay' };
const SHIFT_ONE: Rule = { kind: 'shift', k: 1 };
const DOUBLE: Rule = { kind: 'double' };

/** 그 단계에서 손님들이 따르는 규칙. 화면 읽기값과 캔버스가 같은 값을 쓴다. */
export function ruleForStep(stepId: HotelStepId): Rule {
  switch (stepId) {
    case 'full':
      return STAY;
    case 'shift':
    case 'board':
      return SHIFT_ONE;
    default:
      return DOUBLE;
  }
}

/** 그 단계의 규칙이 만드는 빈 방. 만실 단계에서는 없다. */
export function freedForStep(stepId: HotelStepId): number[] {
  return freedRooms(ruleForStep(stepId), VISIBLE_ROOMS);
}

/** 단계별 애니메이션 길이(ms). 정적인 단계는 첫 프레임에 최종 상태로 끝난다. */
export function durationForStep(stepId: HotelStepId): number {
  switch (stepId) {
    case 'shift':
      return 1600;
    case 'board':
      return 900;
    case 'double':
      return 2000;
    case 'odds':
      return 900;
    default:
      // 0 을 넘기면 훅의 progress 계산이 NaN 이 된다. 1ms 는 첫 프레임에 곧장 끝난다.
      return 1;
  }
}

/** 레거시가 쓰던 ease-out. 훅이 아니라 호출자가 적용한다 (§5.2). */
function easeOut(p: number): number {
  const clamped = Math.min(1, Math.max(0, p));
  return clamped * (2 - clamped);
}

/**
 * 단계와 진행도로 캔버스 장면을 만든다.
 *
 * `progress` 는 훅이 주는 0~1 원본이고 easing 은 이 함수가 건다.
 * `prefers-reduced-motion` 이면 훅이 `progress = 1` 로 한 번만 부르므로,
 * 모든 단계가 곧바로 최종 상태로 그려진다 (§3.4 — 움직이지 않되 내용은 남는다).
 */
export function sceneForStep(stepId: HotelStepId, progress: number): HotelScene {
  const eased = easeOut(progress);
  const settled = progress >= 1;

  switch (stepId) {
    case 'shift':
      return {
        moves: guestMoves(SHIFT_ONE, VISIBLE_ROOMS),
        progress: eased,
        arrivals: [],
        arrivalProgress: 0,
        waitingLabel: '로비에 새 손님 1명',
        waitingCount: 1,
        // 이동이 끝나야 1번 방이 빈다. 미리 강조하면 원인과 결과가 뒤집힌다.
        emptyHighlight: settled ? freedRooms(SHIFT_ONE, VISIBLE_ROOMS) : [],
      };

    case 'board':
      return {
        moves: guestMoves(SHIFT_ONE, VISIBLE_ROOMS),
        progress: 1,
        arrivals: freedRooms(SHIFT_ONE, VISIBLE_ROOMS),
        arrivalProgress: eased,
        waitingLabel: '입실 중',
        waitingCount: 0,
        emptyHighlight: settled ? [] : freedRooms(SHIFT_ONE, VISIBLE_ROOMS),
      };

    case 'double':
      return {
        moves: guestMoves(DOUBLE, VISIBLE_ROOMS),
        progress: eased,
        arrivals: [],
        arrivalProgress: 0,
        waitingLabel: '버스에서 손님이 끝없이 내립니다',
        waitingCount: 3,
        emptyHighlight: settled ? freedRooms(DOUBLE, VISIBLE_ROOMS) : [],
      };

    case 'odds':
      return {
        moves: guestMoves(DOUBLE, VISIBLE_ROOMS),
        progress: 1,
        arrivals: freedRooms(DOUBLE, VISIBLE_ROOMS),
        arrivalProgress: eased,
        waitingLabel: '입실 중',
        waitingCount: 0,
        emptyHighlight: settled ? [] : freedRooms(DOUBLE, VISIBLE_ROOMS),
      };

    case 'conclusion':
      // 두 번째 입실이 끝난 화면을 그대로 둔다. 결론을 읽는 동안 근거가 눈앞에 남는다.
      return {
        moves: guestMoves(DOUBLE, VISIBLE_ROOMS),
        progress: 1,
        arrivals: freedRooms(DOUBLE, VISIBLE_ROOMS),
        arrivalProgress: 1,
        waitingLabel: '모두 입실했습니다',
        waitingCount: 0,
        emptyHighlight: [],
      };

    default:
      // 만실. 아무도 움직이지 않고 빈 방도 없다.
      return {
        moves: guestMoves(STAY, VISIBLE_ROOMS),
        progress: 1,
        arrivals: [],
        arrivalProgress: 0,
        waitingCount: 0,
        emptyHighlight: [],
      };
  }
}
