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
  /** 글자 크기 실측에 따라 더 넓은 그림 칸 또는 전체 폭을 선택한다. */
  stageRatio?: '2:1' | 'full';
  /** 다른 sticky 실험이 있으면 바깥 피겨의 고정을 해제한다. */
  sticky?: boolean;
}

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
      // 그림 아래 본문을 읽고 조작할 공간도 남아야 sticky 를 켠다.
      const availableHeight = window.innerHeight - headerHeight - 160;
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
    <div className={`${styles.root} ${wideStage ? styles.wideStage : ''} ${stageRatio === '2:1' ? styles.extraWideStage : ''} ${stageRatio === 'full' ? styles.fullStage : ''} ${className}`.replace(/\s+/g, ' ').trim()}>
      <div ref={stageRef} className={`${styles.stage} ${sticky && stageCanStick ? styles.stageSticky : ''}`}>
        {stage}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
