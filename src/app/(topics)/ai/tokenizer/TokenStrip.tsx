'use client';

import { decode, tokenDisplay, type Token } from './tokenizer';
import styles from './Tokenizer.module.css';

export interface TokenStripProps {
  tokens: Token[];
  /** 비어 있을 때 보여줄 문구. */
  emptyLabel?: string;
}

/** 공백은 블록 안에서 눈에 보이지 않으므로 가운뎃점으로 대신 보인다. */
function visibleText(text: string): string {
  return text.replace(/ /g, '·').replace(/\n/g, '⏎');
}

/**
 * 토큰을 색 블록으로 늘어놓는다.
 *
 * 색은 경계를 빠르게 훑기 위한 보조 수단일 뿐이고, 무엇이 한 토큰인지는
 * 블록 안의 글자와 아래 순번으로도 읽힌다. 색만으로 정보를 전달하지 않는다.
 */
export function TokenStrip({ tokens, emptyLabel = '입력하면 여기에 토큰이 나타납니다.' }: TokenStripProps) {
  if (tokens.length === 0) {
    return <p className={styles.emptyStrip}>{emptyLabel}</p>;
  }

  return (
    <ol className={styles.strip}>
      {tokens.map((token, index) => {
        const { text, isBytes } = tokenDisplay(token);

        return (
          <li
            key={`${index}-${token.join('-')}`}
            className={`${styles.token} ${isBytes ? styles.byteToken : ''} ${
              styles[`tone${index % 4}`]
            }`}
          >
            <span className={styles.tokenText}>
              {isBytes ? text : visibleText(text)}
            </span>
            <span className={styles.tokenIndex} aria-hidden="true">
              {index + 1}
            </span>
            <span className={styles.srOnly}>
              {isBytes
                ? `${index + 1}번째 토큰: 글자가 되지 않는 바이트 조각 ${text}`
                : `${index + 1}번째 토큰: ${decode([token])}`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
