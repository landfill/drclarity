import { bytePosition, toBinary8, toHex, type EncodedChar } from './utf8';
import styles from './Utf8.module.css';

export interface ByteBoardProps {
  chars: EncodedChar[];
  /** 이진수 앞머리를 강조할지. '첫 바이트가 길이를 알려준다' 절에서 켠다. */
  showBinary: boolean;
}

/** 공백은 칸 안에서 보이지 않으므로 가운뎃점으로 대신 보인다 (`ai/tokenizer` 와 같은 표기). */
function visibleChar(char: string): string {
  if (char === ' ') return '·';
  if (char === '\n') return '⏎';
  return char;
}

/** 바이트 수에 따라 칸 색을 나눈다. 색만으로 읽히지 않게 칸 안에 숫자도 함께 적는다. */
function sizeClass(length: number): string {
  return styles[`size${Math.min(4, Math.max(1, length))}`] ?? '';
}

/**
 * 글자별 바이트 보드.
 *
 * `math/honey-pots/BinaryEncodingBoard` 를 재사용하려 했으나(#14) 그쪽은 꿀통 · 개미 ·
 * 혼합 컵 · 사망/생존에 통째로 묶여 있어 가져올 것이 없었다. 여기서 새로 만든다.
 */
export function ByteBoard({ chars, showBinary }: ByteBoardProps) {
  if (chars.length === 0) {
    return <p className={styles.emptyBoard}>문장을 입력하면 여기에 펼쳐집니다.</p>;
  }

  return (
    <ol className={styles.board}>
      {chars.map((item, index) => (
        <li key={`${index}-${item.codePoint}`} className={`${styles.cell} ${sizeClass(item.bytes.length)}`}>
          <span className={styles.cellChar} aria-hidden="true">
            {visibleChar(item.char)}
          </span>
          <span className={styles.cellSize} aria-hidden="true">
            {item.bytes.length}바이트
          </span>

          <ul className={styles.byteList} aria-hidden="true">
            {item.bytes.map((byte, byteIndex) => (
              <li
                key={byteIndex}
                className={`${styles.byte} ${
                  bytePosition(byte) === 'lead' ? styles.leadByte : styles.contByte
                }`}
              >
                {showBinary ? toBinary8(byte) : toHex(byte)}
              </li>
            ))}
          </ul>

          {/* 보이는 것과 읽히는 것이 겹치지 않도록 설명은 하나로 모은다. */}
          <span className={styles.srOnly}>
            {`${index + 1}번째 글자 ${item.char}, ${item.bytes.length}바이트, 16진수 ${item.bytes
              .map(toHex)
              .join(' ')}`}
          </span>
        </li>
      ))}
    </ol>
  );
}
