import { DIFFICULTIES, type DifficultyLevel } from '@/content/difficulty';
import styles from './DifficultyGuide.module.css';

export function DifficultyGuide() {
  return <details className={styles.guide}>
    <summary>난이도 기준</summary>
    <p>이 페이지의 핵심 체험에 필요한 배경지식과 추론을 기준으로 정했습니다. 접힌 추가 설명은 포함하지 않습니다.</p>
    <dl>{([1,2,3] as DifficultyLevel[]).map(level => <div key={level}><dt>{level}/3 · {DIFFICULTIES[level].label}</dt><dd>{DIFFICULTIES[level].description}</dd></div>)}</dl>
  </details>;
}
