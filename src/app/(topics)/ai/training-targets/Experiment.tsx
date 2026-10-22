'use client';

import { MaskFigure } from './MaskFigure';
import styles from './Training.module.css';

/** 입력과 다음 토큰 정답 만들기 조작과 관찰 결과를 표시한다. 조작과 관찰은 가림 상자 figure 가 맡는다. */
export default function Experiment() {
  return (
    <section className={styles.stage} aria-labelledby="targets-experiment">
      <h2 id="targets-experiment">조작 · 정답 자리를 한 칸씩 옮겨 보세요</h2>
      <p>원문: 오늘은 따뜻한 차를 마신다.</p>
      <p className={styles.note}>이해를 위해 임의로 나눈 조각입니다. 실제 토큰 경계와 다를 수 있습니다.</p>
      <MaskFigure />
    </section>
  );
}
