'use client';
import { SplitStage } from '@/components/topic/SplitStage';

import { useState } from 'react';
import { nextTokenLoss } from './loss';
import { LossFigure } from './LossFigure';
import { REFERENCE_PERCENTS } from './lossScene';
import styles from './Training.module.css';

/** 정답 확률과 손실 비교 조작과 관찰 결과를 표시한다. 그림과 관찰은 확률 컵 figure 가 맡는다. */
export default function Experiment({ children }: { children?: React.ReactNode }) {
  const [percent, setPercent] = useState(50);
  return (
    <SplitStage wideStage stage={<LossFigure percent={percent} onPercent={setPercent} />}><section className={styles.stage} aria-labelledby="loss-experiment">
<label htmlFor="correct-probability">정답 ‘우산을’에 준 확률: {percent}%</label>
      <input id="correct-probability" type="range" min={0} max={100} step={1} value={percent} onChange={event => setPercent(Number(event.target.value))} />

      <h2 id="loss-experiment">조작 · 원문의 조각에 준 확률을 바꿔 보세요</h2>
      <p>입력: 비가 내려서 나는 → 원문의 다음 조각: <strong>우산을</strong></p>
      <p className={styles.note}>직접 정한 가상 확률입니다. 실제 모델의 측정값이 아니며 학습도 실행하지 않습니다. 나머지 후보의 확률 합계는 {100 - percent}%입니다.</p>
      

      <div className={styles.comparison} aria-label="정답 확률별 손실 비교">
        {REFERENCE_PERCENTS.map(value => <div key={value}>정답 확률 {value}%<br />손실 {nextTokenLoss(value / 100).toFixed(3)}</div>)}
      </div>
    </section>{children}</SplitStage>
  );
}
