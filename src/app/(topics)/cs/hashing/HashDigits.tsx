import styles from './Hashing.module.css';

export interface HashDigitsProps {
  /** 소문자 16진수 64자. */
  hash: string;
  /**
   * 자리별 강조 여부. 상대 해시와 다른 자리에 색을 입힌다.
   * 넘기지 않으면 전부 같은 색으로 그린다.
   */
  diff?: boolean[];
  /** 스크린 리더에 읽어 줄 이름. 해시 자체는 읽어도 의미가 없어 요약만 준다. */
  label: string;
}

/**
 * 해시 64자를 자리별로 나눠 그린다.
 *
 * 한 줄 문자열로 두면 두 해시를 나란히 놓아도 어디가 다른지 눈으로 찾을 수 없다.
 * 자리를 칸으로 끊고 다른 자리에만 색을 입혀야 "거의 전부 바뀌었다" 가 한눈에 보인다.
 */
export function HashDigits({ hash, diff, label }: HashDigitsProps) {
  return (
    <output className={styles.hash} aria-label={label}>
      {[...hash].map((digit, index) => (
        <span
          key={index}
          className={diff?.[index] ? `${styles.digit} ${styles.digitDiff}` : styles.digit}
        >
          {digit}
        </span>
      ))}
    </output>
  );
}
