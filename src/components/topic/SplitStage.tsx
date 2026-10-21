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
}

/** Shared stage/content layout and the viewport-safe mobile sticky gate. */
export function SplitStage({ stage, children, className = '', wideStage = false }: SplitStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageCanStick, setStageCanStick] = useState(false);

  useEffect(() => {
    const stageElement = stageRef.current;
    if (!stageElement) return;

    const updateStageStickiness = () => {
      const rootStyles = getComputedStyle(document.documentElement);
      const headerHeight = Number.parseFloat(rootStyles.getPropertyValue('--header-h')) || 0;
      const availableHeight = window.innerHeight - headerHeight - 16;
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
    <div className={`${styles.root} ${wideStage ? styles.wideStage : ''} ${className}`.replace(/\s+/g, ' ').trim()}>
      <div ref={stageRef} className={`${styles.stage} ${stageCanStick ? styles.stageSticky : ''}`}>
        {stage}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
