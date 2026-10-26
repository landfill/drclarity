import type { ReactNode } from 'react';
import styles from './AfterStage.module.css';

/**
 * 피겨 카드(`SplitStage`) 아래에 전체 폭으로 이어지는 실험과 설명.
 *
 * 넓은 화면의 옆 칸에는 퀴즈와 피겨를 움직이는 조작만 둔다. 옆 칸에 따로 도는 실험과
 * 긴 설명까지 넣으면 그 길이만큼 그림 아래가 비고, 두 칸짜리 실험도 351px 에 끼어
 * 좁아진다. 그런 것은 여기로 옮긴다. 좁은 화면은 어차피 그림 → 본문 순서로 쌓이므로
 * 읽는 순서가 바뀌지 않는다.
 */
export function AfterStage({ children }: { children: ReactNode }) {
  return <div className={styles.root}>{children}</div>;
}
