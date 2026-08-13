'use client';

import {
  POT_COUNT,
  MAX_POTS,
  toBinary5,
  ANT_BITS,
  ANT_LABELS,
  decodeDeadAnts
} from './binary';
import styles from './BinaryEncodingBoard.module.css';

export interface BinaryEncodingBoardProps {
  mode: 'grid' | 'encoding' | 'simulation';
  activeAntBit?: number | null;
  onActiveAntBitChange?: (bit: number | null) => void;
  deadAntBits?: readonly number[];
  onToggleAntDead?: (bit: number) => void;
}

export function BinaryEncodingBoard({
  mode,
  activeAntBit,
  onActiveAntBitChange,
  deadAntBits = [],
  onToggleAntDead
}: BinaryEncodingBoardProps) {
  const pots = Array.from({ length: POT_COUNT }, (_, i) => i + 1);

  const deadSum = decodeDeadAnts(deadAntBits);
  const decodedPot = mode === 'simulation' && deadSum >= 1 && deadSum <= POT_COUNT ? deadSum : null;

  const getPotState = (pot: number) => {
    if (mode === 'encoding') {
      return activeAntBit && (pot & activeAntBit) !== 0 ? styles.highlighted : '';
    }
    if (mode === 'simulation') {
      return pot === decodedPot ? styles.selected : '';
    }
    return '';
  };

  return (
    <div className={styles.board}>
      {mode === 'encoding' && (
        <div className={styles.antBar}>
          <div className={styles.antBarTitle}>각 개미가 마실 꿀통 확인:</div>
          <div className={styles.antTiles}>
            {ANT_BITS.map((bit, idx) => (
              <button
                key={bit}
                type="button"
                className={`${styles.antTile} ${activeAntBit === bit ? styles.antActive : ''}`}
                onMouseEnter={() => onActiveAntBitChange?.(bit)}
                onMouseLeave={() => onActiveAntBitChange?.(null)}
                onFocus={() => onActiveAntBitChange?.(bit)}
                onBlur={() => onActiveAntBitChange?.(null)}
                onClick={() => onActiveAntBitChange?.(bit === activeAntBit ? null : bit)}
                aria-pressed={activeAntBit === bit}
                aria-label={`개미 ${ANT_LABELS[idx]}, 자릿값 ${bit}`}
              >
                <span className={styles.antTileName}>개미 {ANT_LABELS[idx]}</span>
                <span className={styles.antTileBit}>{bit}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'simulation' && (
        <div className={styles.antBar}>
          <div className={styles.antBarTitle}>1시간 뒤 개미들의 상태:</div>
          <div className={styles.antTiles}>
            {ANT_BITS.map((bit, idx) => {
              const isDead = deadAntBits.includes(bit);
              return (
                <button
                  key={bit}
                  type="button"
                  className={`${styles.antTile} ${styles.antStateTile} ${isDead ? styles.dead : styles.alive}`}
                  onClick={() => onToggleAntDead?.(bit)}
                  aria-pressed={isDead}
                  aria-label={`개미 ${ANT_LABELS[idx]}, 자릿값 ${bit}, ${isDead ? '사망' : '생존'}`}
                >
                  <span className={styles.antTileName}>개미 {ANT_LABELS[idx]}</span>
                  <span className={styles.antTileBit}>{bit}</span>
                  <span className={styles.antTileStatus}>{isDead ? '사망' : '생존'}</span>
                </button>
              );
            })}
          </div>
          <p className={styles.antBarHelp}>
            개미를 눌러 <strong>사망/생존</strong>을 바꿔보세요. 그 결과가 몇 번 꿀통을 가리키는지 아래에서 확인할 수 있습니다.
          </p>
        </div>
      )}

      <div className={styles.grid} role="list">
        {pots.map((pot) => (
          <div
            key={pot}
            role="listitem"
            className={`${styles.potTile} ${getPotState(pot)}`}
            aria-current={pot === decodedPot ? 'true' : undefined}
          >
            <span className={styles.potNumber}>{pot}</span>
            <span className={styles.potBinary}>{toBinary5(pot)}</span>
          </div>
        ))}
      </div>

      {mode === 'simulation' && (
        <div className={styles.simulationResult} aria-live="polite">
          <div className={styles.decodeBox}>
            <p>죽은 개미들의 자릿값 합산:</p>
            <p className={styles.decodeSum}>
              {deadAntBits.length > 0
                ? ANT_BITS.filter((bit) => deadAntBits.includes(bit)).join(' + ')
                : '0'}{' '}
              = <strong>{deadSum}</strong>
            </p>
            {decodedPot !== null ? (
              <p className={styles.decodeConclusion}>
                결과: <strong>{decodedPot}번 꿀통</strong>({toBinary5(decodedPot)})이 가짜입니다!
              </p>
            ) : deadSum === 0 ? (
              <p className={styles.decodeNote}>
                모두 살아남았다면 합계는 0입니다. 하지만 1~25번 꿀통은 모두 최소 한 마리가 마시므로,
                <strong> 실제로는 나올 수 없는 결과</strong>입니다.
              </p>
            ) : (
              <p className={styles.decodeNote}>
                합계 {deadSum}은 개미 5마리로 표현할 수 있는 번호({MAX_POTS}번까지)지만,
                이 문제의 꿀통은 <strong>{POT_COUNT}통뿐</strong>이라 나올 수 없는 결과입니다.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
