import styles from './Autoregressive.module.css';

export interface ContextStripProps {
  /** 지금 모델에게 들어가는 입력 토큰. */
  context: string[];
  /** 이번 바퀴에 새로 붙은 토큰의 위치. 없으면 -1. */
  freshIndex: number;
  /** 프롬프트가 끝나고 모델이 쓴 부분이 시작되는 위치. */
  promptLength: number;
  /** '전체를 읽는다' 단계에서 입력 전체를 밝힌다. */
  reading: boolean;
}

/**
 * 공백은 블록 안에서 보이지 않으므로 가운뎃점으로 대신 보인다.
 * `ai/tokenizer` 의 `TokenStrip` 과 같은 표기를 쓴다 — 시리즈에서 같은 것을 같게 보이려는 것이다.
 */
function visibleText(text: string): string {
  return text.replace(/ /g, '·').replace(/\n/g, '⏎');
}

/**
 * 입력 스트립.
 *
 * `ai/tokenizer` 의 `TokenStrip` 과 겉모습이 닮았지만 합치지 않았다. 저쪽은 BPE `Token[]`
 * 과 바이트 조각 표시에 묶여 있고, 이쪽이 칠하는 기준은 루프 위치(방금 붙은 것 · 읽는 중 ·
 * 모델이 쓴 부분)다. 하나로 합치면 두 주제의 특수 사정이 공용 컴포넌트 안에 모두 들어온다.
 * `IMPLEMENTATION_SPEC §2.1` 이 공용화를 "실제로 공유할 때만" 으로 묶어 둔 이유가 이것이다.
 */
export function ContextStrip({ context, freshIndex, promptLength, reading }: ContextStripProps) {
  if (context.length === 0) {
    return <p className={styles.emptyStrip}>입력이 비어 있습니다.</p>;
  }

  return (
    <ol className={`${styles.strip} ${reading ? styles.stripReading : ''}`.trim()}>
      {context.map((token, index) => {
        const isFresh = index === freshIndex;
        const isGenerated = index >= promptLength;

        return (
          <li
            key={`${index}-${token}`}
            className={[
              styles.token,
              isGenerated ? styles.generated : styles.prompted,
              isFresh ? styles.fresh : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {/* 보이는 글자와 아래 설명이 모두 읽히면 같은 내용이 두 번 나온다. 읽히는 쪽은 하나로 모은다. */}
            <span className={styles.tokenText} aria-hidden="true">
              {visibleText(token)}
            </span>
            <span className={styles.tokenIndex} aria-hidden="true">
              {index + 1}
            </span>
            <span className={styles.srOnly}>
              {`${index + 1}번째 조각 ${token}${isGenerated ? ', 모델이 쓴 것' : ', 내가 넣은 것'}${
                isFresh ? ', 방금 붙었습니다' : ''
              }`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
