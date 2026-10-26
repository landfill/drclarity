'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './SplitStage.module.css';

export interface SplitStageProps {
  stage: ReactNode;
  children: ReactNode;
  className?: string;
  /** 넓은 화면에서 그림 칸을 본문 칸보다 넓게 (3:2). 가로로 넓은 figure 에 쓴다. */
  wideStage?: boolean;
  /**
   * 넓은 화면에서 그림 칸을 2:1 로 더 넓힌다. 그림 속 글자가 3:2 에서 너무 작아지는 figure 에 쓴다.
   * 전체 폭 배치는 두지 않는다. 그림은 높이에 막혀 넓혀도 글자가 거의 커지지 않고 양옆만 빈다.
   */
  stageRatio?: '2:1';
  /** 다른 sticky 실험이 있으면 바깥 피겨의 고정을 해제한다. */
  sticky?: boolean;
}

/** SplitStage.module.css 가 그림과 본문을 좌우로 놓는 폭. */
const SIDE_BY_SIDE = '(min-width: 1100px)';

/** Shared stage/content layout and the viewport-safe mobile sticky gate. */
export function SplitStage({ stage, children, className = '', wideStage = false, stageRatio, sticky = true }: SplitStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageCanStick, setStageCanStick] = useState(false);

  useEffect(() => {
    const stageElement = stageRef.current;
    if (!stageElement) return;

    const updateStageStickiness = () => {
      const rootStyles = getComputedStyle(document.documentElement);
      const headerHeight = Number.parseFloat(rootStyles.getPropertyValue('--header-h')) || 0;
      // 좁은 화면은 그림 아래 본문을 읽고 조작할 공간도 남아야 sticky 를 켠다.
      // 넓은 화면은 본문이 옆 칸에 있으므로 그림만 화면에 들어가면 된다.
      const reserve = window.matchMedia(SIDE_BY_SIDE).matches ? 32 : 160;
      const availableHeight = window.innerHeight - headerHeight - reserve;
      setStageCanStick(stageElement.getBoundingClientRect().height <= availableHeight);
    };

    updateStageStickiness();
    window.addEventListener('resize', updateStageStickiness);
    const resizeObserver = new ResizeObserver(updateStageStickiness);
    resizeObserver.observe(stageElement);

    return () => {
      window.removeEventListener('resize', updateStageStickiness);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div data-figure-stage className={`${styles.root} ${wideStage ? styles.wideStage : ''} ${stageRatio === '2:1' ? styles.extraWideStage : ''} ${className}`.replace(/\s+/g, ' ').trim()}>
      <div ref={stageRef} className={`${styles.stage} ${sticky && stageCanStick ? styles.stageSticky : ''}`}>
        {stage}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
