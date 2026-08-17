import { palette } from '@/styles/palette';

/** 레인 하나의 논리 좌표계. InteractiveCanvas 에 그대로 넘긴다. */
export const LANE_WIDTH = 520;
export const LANE_HEIGHT = 120;

export interface LaneRenderOptions {
  /** 지금 이 순간의 배열. 제너레이터가 제자리에서 바꾸는 그 배열이다. */
  values: number[];
  /** 직전 스텝이 건드린 자리. 비워두면 강조가 없다. */
  active: readonly number[];
  done: boolean;
}

/**
 * 막대 그래프 한 줄을 그린다. 전역 상태를 읽지 않는 순수 함수다.
 * 매 호출이 스스로 clearRect 로 시작한다 (IMPLEMENTATION_SPEC §5.1).
 */
export function drawLane(ctx: CanvasRenderingContext2D, options: LaneRenderOptions): void {
  const { values, active, done } = options;

  ctx.clearRect(0, 0, LANE_WIDTH, LANE_HEIGHT);

  const n = values.length;
  if (n === 0) return;

  const slot = LANE_WIDTH / n;
  // 막대가 아주 많아지면 간격을 없애 한 픽셀이라도 더 확보한다.
  const gap = slot > 4 ? 1 : 0;
  const barWidth = Math.max(1, slot - gap);
  const activeSet = new Set(active);

  for (let index = 0; index < n; index += 1) {
    const value = values[index];
    const height = Math.max(1, (value / n) * LANE_HEIGHT);

    if (done) {
      ctx.fillStyle = palette.success;
    } else if (activeSet.has(index)) {
      ctx.fillStyle = palette.accent;
    } else {
      ctx.fillStyle = palette['blue-soft'];
    }

    ctx.fillRect(index * slot, LANE_HEIGHT - height, barWidth, height);
  }
}
