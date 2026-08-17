'use client';

import { forwardRef } from 'react';
import { InteractiveCanvas, InteractiveCanvasHandle } from '@/components/topic/InteractiveCanvas';
import { LANE_HEIGHT, LANE_WIDTH } from './laneRenderer';
import type { SortCounters } from './sorting';
import styles from './SortingRace.module.css';

export interface SortLaneProps {
  label: string;
  complexity: string;
  counters: SortCounters;
  done: boolean;
  /** 리사이즈·첫 렌더 때 캔버스를 다시 그리는 함수. 부모가 현재 상태로 그린다. */
  draw: (ctx: CanvasRenderingContext2D) => void;
}

/**
 * 알고리즘 한 줄. 캔버스는 보조기술에 열리지 않으므로 횟수와 완료 여부는
 * 반드시 DOM 텍스트로도 존재해야 한다.
 */
export const SortLane = forwardRef<InteractiveCanvasHandle, SortLaneProps>(function SortLane(
  { label, complexity, counters, done, draw },
  ref,
) {
  return (
    <section className={styles.lane} aria-label={label}>
      <header className={styles.laneHead}>
        <h3 className={styles.laneTitle}>
          {label}
          {done && <span className={styles.doneBadge}>정렬 완료</span>}
        </h3>
        <p className={styles.complexity}>{complexity}</p>
      </header>

      <InteractiveCanvas
        ref={ref}
        logicalWidth={LANE_WIDTH}
        logicalHeight={LANE_HEIGHT}
        draw={draw}
        ariaLabel={`${label}의 배열 상태 막대그래프. 수치는 아래 표기를 참고하세요.`}
      />

      <dl className={styles.counters}>
        <div className={styles.counter}>
          <dt>비교</dt>
          <dd>{counters.compares.toLocaleString('ko-KR')}회</dd>
        </div>
        <div className={styles.counter}>
          <dt>이동</dt>
          <dd>{counters.writes.toLocaleString('ko-KR')}회</dd>
        </div>
      </dl>
    </section>
  );
});
