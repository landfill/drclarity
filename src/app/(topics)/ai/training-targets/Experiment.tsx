'use client';

import { useState } from 'react';
import { makeNextTokenPair, PIECES } from './pairs';
import styles from './Training.module.css';

/** 입력과 다음 토큰 정답 만들기 조작과 관찰 결과를 표시한다. */
export default function Experiment() {
  const [position, setPosition] = useState(1);
  const pair = makeNextTokenPair(PIECES, position);
  return (
    <section className={styles.stage} aria-labelledby="targets-experiment">
      <h2 id="targets-experiment">조작 · 정답 자리를 한 칸씩 옮겨 보세요</h2>
      <p>원문: 오늘은 따뜻한 차를 마신다.</p>
      <p className={styles.note}>이해를 위해 임의로 나눈 조각입니다. 실제 토큰 경계와 다를 수 있습니다.</p>
      <label htmlFor="target-position">정답 위치: {position + 1}번째 조각 / {PIECES.length}개</label>
      <input id="target-position" type="range" min={1} max={PIECES.length - 1} step={1} value={position} onChange={event => setPosition(Number(event.target.value))} />
      <div className={styles.controls}>
        <button type="button" disabled={position === 1} onClick={() => setPosition(position - 1)}>이전 칸</button>
        <button type="button" disabled={position === PIECES.length - 1} onClick={() => setPosition(position + 1)}>다음 칸</button>
      </div>
      <div className={styles.observation} aria-live="polite">
        <p><strong>모델에게 보여 주는 입력</strong></p>
        <div className={styles.pieces}>{pair.input.map((piece, i) => <span key={i} className={styles.piece}>{piece}</span>)}</div>
        <p>비교할 정답: <strong className={`${styles.piece} ${styles.target}`}>{pair.target}</strong></p>
        <p>입력 {pair.input.length}개 다음의 조각 한 개가 정답입니다. 정답과 그 뒤의 조각은 이 예측의 입력에서 제외했습니다.</p>
      </div>
    </section>
  );
}
