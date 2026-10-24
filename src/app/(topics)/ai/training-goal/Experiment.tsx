'use client';
import { SplitStage } from '@/components/topic/SplitStage';

import styles from './Training.module.css';
import { GuessFigure } from './GuessFigure';

/** 다음 조각 예측 조작과 관찰 결과를 표시한다. 조작과 관찰은 가림 쪽지 figure 가 맡는다. */
export default function Experiment({ children }: { children?: React.ReactNode }) {
  return (
    <SplitStage wideStage stage={<GuessFigure />}><section className={styles.stage} aria-labelledby="goal-experiment">
      <h2 id="goal-experiment">조작 · 다음에 올 조각을 골라 보세요</h2>
      <p className={styles.note}>직접 만든 원문 두 개입니다. 실제 AI 예측이나 토크나이저의 출력이 아닙니다.</p>

    </section>{children}</SplitStage>
  );
}
