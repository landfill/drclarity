'use client';

import { useState } from 'react';
import { nextTokenLoss } from './loss';
import styles from './Training.module.css';

export default function Experiment() {
  const [percent, setPercent] = useState(50);
  const loss = nextTokenLoss(percent / 100);
  return (
    <section className={styles.stage} aria-labelledby="loss-experiment">
      <h2 id="loss-experiment">조작 · 원문의 조각에 준 확률을 바꿔 보세요</h2>
      <p>입력: 비가 내려서 나는 → 원문의 다음 조각: <strong>우산을</strong></p>
      <p className={styles.note}>직접 정한 가상 확률입니다. 실제 모델의 측정값이 아니며 학습도 실행하지 않습니다. 나머지 후보의 확률 합계는 {100 - percent}%입니다.</p>
      <label htmlFor="correct-probability">정답 ‘우산을’에 준 확률: {percent}%</label>
      <input id="correct-probability" type="range" min={0} max={100} step={1} value={percent} onChange={event => setPercent(Number(event.target.value))} />
      <div className={styles.controls} role="group" aria-label="확률 빠르게 비교">
        {[10, 50, 90].map(value => <button key={value} type="button" aria-pressed={percent === value} onClick={() => setPercent(value)}>{value}%로 보기</button>)}
      </div>
      <div className={styles.observation} aria-live="polite">
        <p>정답 한 조각의 손실: <strong>{Number.isFinite(loss) ? loss.toFixed(3) : '∞ (무한대)'}</strong></p>
        <p>{percent === 0 ? '정답에 정확히 0의 확률을 주면 이 수식의 손실은 무한대입니다. 실제 계산은 보통 로그 확률을 안정적으로 계산하며, 이 화면의 끝값은 수학적 경계를 보여 줍니다.' : percent === 100 ? '정답에 100%를 주면 이 한 조각의 손실은 0입니다. 다른 문장에서도 잘한다는 뜻은 아닙니다.' : '정답 확률이 커질수록 이 조각의 손실은 작아집니다. 낮은 확률에서 더 낮아질 때 손실이 가파르게 커지는지도 보세요.'}</p>
      </div>
      <div className={styles.comparison} aria-label="정답 확률별 손실 비교">
        {[10, 50, 90].map(value => <div key={value}>정답 확률 {value}%<br />손실 {nextTokenLoss(value / 100).toFixed(3)}</div>)}
      </div>
    </section>
  );
}
