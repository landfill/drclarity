'use client';

import { 
  POT_COUNT, 
  toBinary5, 
  ANT_BITS, 
  ANT_LABELS, 
  antsForPot, 
  decodeDeadAnts 
} from './binary';
import styles from './BinaryEncodingBoard.module.css';

export interface BinaryEncodingBoardProps {
  mode: 'grid' | 'encoding' | 'simulation';
  selectedPot: number | null;
  onSelectPot: (pot: number | null) => void;
  activeAntBit?: number | null;
  onActiveAntBitChange?: (bit: number | null) => void;
}

export function BinaryEncodingBoard({ 
  mode, 
  selectedPot, 
  onSelectPot, 
  activeAntBit, 
  onActiveAntBitChange 
}: BinaryEncodingBoardProps) {
  const pots = Array.from({ length: POT_COUNT }, (_, i) => i + 1);

  const getPotState = (pot: number) => {
    if (mode === 'grid') return '';
    if (mode === 'encoding') {
      if (activeAntBit && (pot & activeAntBit) !== 0) return styles.highlighted;
      return '';
    }
    if (mode === 'simulation') {
      return pot === selectedPot ? styles.selected : '';
    }
    return '';
  };

  const deadAnts = selectedPot !== null ? antsForPot(selectedPot) : [];
  const decodedPot = decodeDeadAnts(deadAnts);

  return (
    <div className={styles.board}>
      {mode === 'encoding' && (
        <div className={styles.antBar}>
          <div className={styles.antBarTitle}>각 개미가 마실 꿀통 확인:</div>
          <div className={styles.antButtons}>
            {ANT_BITS.map((bit, idx) => (
              <button
                key={bit}
                className={`${styles.antButton} ${activeAntBit === bit ? styles.antActive : ''}`}
                onMouseEnter={() => onActiveAntBitChange?.(bit)}
                onMouseLeave={() => onActiveAntBitChange?.(null)}
                onClick={() => onActiveAntBitChange?.(bit === activeAntBit ? null : bit)}
                aria-pressed={activeAntBit === bit}
              >
                개미 {ANT_LABELS[idx]} (자릿값: {bit})
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'simulation' && (
        <div className={styles.simulationHeader}>
          <p>아래에서 <strong>가짜 꿀통</strong>이라고 의심되는 번호를 하나 클릭해보세요!</p>
        </div>
      )}

      <div className={styles.grid}>
        {pots.map((pot) => (
          <button
            key={pot}
            className={`${styles.potTile} ${getPotState(pot)}`}
            onClick={() => {
              if (mode === 'simulation') onSelectPot(pot);
            }}
            disabled={mode !== 'simulation'}
            aria-pressed={selectedPot === pot}
            aria-label={`${pot}번 꿀통, 2진수 ${toBinary5(pot)}`}
          >
            <span className={styles.potNumber}>{pot}</span>
            <span className={styles.potBinary}>{toBinary5(pot)}</span>
          </button>
        ))}
      </div>

      {mode === 'simulation' && selectedPot !== null && (
        <div className={styles.simulationResult} aria-live="polite">
          <h3>1시간 뒤...</h3>
          <div className={styles.antsResult}>
            {ANT_BITS.map((bit, idx) => {
              const isDead = deadAnts.includes(bit);
              return (
                <div key={bit} className={`${styles.antResult} ${isDead ? styles.dead : styles.alive}`}>
                  <div className={styles.antName}>개미 {ANT_LABELS[idx]}</div>
                  <div className={styles.antStatus}>{isDead ? `사망 (+${bit})` : '생존 (+0)'}</div>
                </div>
              );
            })}
          </div>
          <div className={styles.decodeBox}>
            <p>죽은 개미들의 자릿값 합산:</p>
            <p className={styles.decodeSum}>
              {deadAnts.length > 0 ? deadAnts.join(' + ') : '0'} = <strong>{decodedPot}</strong>
            </p>
            <p className={styles.decodeConclusion}>
              결과: <strong>{decodedPot}번 꿀통</strong>이 가짜입니다!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
