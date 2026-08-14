'use client';

import {
  POT_COUNT,
  MAX_NON_ZERO_CODE,
  toBinary5,
  ANT_BITS,
  ANT_LABELS,
  antsForPot,
  decodeDeadAnts
} from './binary';
import styles from './BinaryEncodingBoard.module.css';

export type HoneyBoardMode =
  | 'grid'
  | 'codes'
  | 'signature'
  | 'routing'
  | 'encoding'
  | 'simulation';

export interface BinaryEncodingBoardProps {
  mode: HoneyBoardMode;
  selectedPot?: number;
  onSelectPot?: (pot: number) => void;
  activeAntBit?: number | null;
  onActiveAntBitChange?: (bit: number | null) => void;
  deadAntBits?: readonly number[];
  onToggleAntDead?: (bit: number) => void;
}

export function BinaryEncodingBoard({
  mode,
  selectedPot = 21,
  onSelectPot,
  activeAntBit,
  onActiveAntBitChange,
  deadAntBits = [],
  onToggleAntDead
}: BinaryEncodingBoardProps) {
  const pots = Array.from({ length: POT_COUNT }, (_, i) => i + 1);
  const selectedBinary = toBinary5(selectedPot);
  const selectedAntBits = antsForPot(selectedPot);
  const selectedAntNames = ANT_BITS
    .filter((bit) => selectedAntBits.includes(bit))
    .map((bit) => ANT_LABELS[ANT_BITS.indexOf(bit)])
    .join('·');

  const deadSum = decodeDeadAnts(deadAntBits);
  const decodedPot = mode === 'simulation' && deadSum >= 1 && deadSum <= POT_COUNT ? deadSum : null;
  const potIsSelectable = mode === 'signature' || mode === 'routing';
  const showBinary = mode !== 'grid';

  const getPotState = (pot: number) => {
    if (mode === 'encoding') {
      return activeAntBit !== null && activeAntBit !== undefined && (pot & activeAntBit) !== 0
        ? styles.highlighted
        : '';
    }
    if (mode === 'simulation') {
      return pot === decodedPot ? styles.selected : '';
    }
    if (potIsSelectable) {
      return pot === selectedPot ? styles.chosen : '';
    }
    return '';
  };

  const renderSignature = () => (
    <section className={styles.bridgePanel} aria-labelledby="signature-title">
      <h3 id="signature-title" className={styles.bridgeTitle}>꿀통마다 고유한 ‘개미 그룹 이름표’를 붙입니다</h3>
      <div className={styles.signatureEquation}>
        <div className={styles.selectedPotBadge}>
          <span>선택한 꿀통</span>
          <strong>{selectedPot}번</strong>
        </div>
        <span className={styles.equality} aria-hidden="true">=</span>
        <div className={styles.binaryBadge}>
          <span>5자리 이름표</span>
          <strong>{selectedBinary}</strong>
        </div>
      </div>
      <div
        className={styles.bitMeaningGrid}
        role="group"
        aria-label={`${selectedPot}번 꿀통의 개미 그룹`}
      >
        {ANT_BITS.map((bit, idx) => {
          const included = selectedAntBits.includes(bit);
          return (
            <div key={bit} className={`${styles.bitMeaning} ${included ? styles.bitIncluded : ''}`}>
              <span>개미 {ANT_LABELS[idx]}</span>
              <strong>{selectedBinary[idx]}</strong>
              <small>{included ? '먹일 그룹' : '먹이지 않음'}</small>
            </div>
          );
        })}
      </div>
      <p className={styles.bridgeConclusion}>
        이진수와 개미가 원래 연결된 것이 아니라, <strong>이 이름표를 급여 지시서로 쓰기로 정한 것</strong>입니다.
      </p>
    </section>
  );

  const renderRouting = () => (
    <section className={styles.bridgePanel} aria-labelledby="routing-title">
      <h3 id="routing-title" className={styles.bridgeTitle}>
        {selectedPot}번 꿀 한 방울을 이름표가 1인 개미의 컵에 넣습니다
      </h3>
      <p className={styles.cupRule}>
        개미를 섞는 것이 아닙니다. <strong>개미마다 자기 혼합 컵이 하나씩</strong> 있고, 같은 꿀 샘플을 여러 컵에 나눠 넣습니다.
      </p>
      <div
        className={styles.routingGrid}
        role="group"
        aria-label={`${selectedPot}번 꿀의 급여 경로`}
      >
        {ANT_BITS.map((bit, idx) => {
          const included = selectedAntBits.includes(bit);
          return (
            <div
              key={`${selectedPot}-${bit}`}
              className={`${styles.routeLane} ${included ? styles.routeActive : styles.routeInactive}`}
            >
              <span className={styles.routeAnt}>개미 {ANT_LABELS[idx]}</span>
              <strong className={styles.routeBit}>{selectedBinary[idx]}</strong>
              <div className={styles.routeTrack} aria-hidden="true">
                {included && <span className={styles.sampleDrop} />}
              </div>
              <div className={styles.cupCard}>
                <strong>{ANT_LABELS[idx]}의 혼합 컵</strong>
                <span className={styles.cupStatus}>
                  {included ? `${selectedPot}번 한 방울` : '이번 꿀은 넣지 않음'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className={styles.bridgeConclusion}>
        {selectedPot}번이 가짜라면 <strong>{selectedAntNames}가 사망</strong>하고, 생사 결과가{' '}
        <strong>{selectedBinary}</strong>로 이름표를 그대로 복사합니다.
      </p>
    </section>
  );

  const renderSimulationResult = () => (
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
            현재 1~25번 배정에서는 모든 꿀통을 최소 한 마리가 마시므로,
            <strong> 모두 생존하는 결과는 나오지 않습니다.</strong>
          </p>
        ) : (
          <p className={styles.decodeNote}>
            합계 {deadSum}은 표현 가능한 코드({MAX_NON_ZERO_CODE}까지)이지만,
            이 문제에는 <strong>{POT_COUNT}번 꿀통까지만</strong> 있어 나오지 않는 결과입니다.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.board}>
      {mode === 'signature' && renderSignature()}
      {mode === 'routing' && renderRouting()}

      {mode === 'encoding' && (
        <div className={styles.antBar}>
          <div className={styles.antBarTitle}>개미 하나를 선택하면 그 개미의 혼합 컵에 들어갈 꿀통이 표시됩니다:</div>
          <div className={styles.antTiles}>
            {ANT_BITS.map((bit, idx) => (
              <button
                key={bit}
                type="button"
                className={`${styles.antTile} ${activeAntBit === bit ? styles.antActive : ''}`}
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
        <>
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
              개미를 눌러 <strong>사망/생존</strong>을 바꿔보세요. 합계와 꿀통 번호가 바로 바뀝니다.
            </p>
          </div>
          {renderSimulationResult()}
        </>
      )}

      <div
        className={styles.grid}
        role={potIsSelectable ? 'group' : 'list'}
        aria-label="1번부터 25번까지의 꿀통"
      >
        {pots.map((pot) => {
          const tileContent = (
            <>
              <span className={styles.potNumber}>{pot}</span>
              {showBinary && <span className={styles.potBinary}>{toBinary5(pot)}</span>}
            </>
          );

          return potIsSelectable ? (
            <button
              key={pot}
              type="button"
              className={`${styles.potTile} ${styles.potButton} ${getPotState(pot)}`}
              onClick={() => onSelectPot?.(pot)}
              aria-pressed={pot === selectedPot}
              aria-label={`${pot}번 꿀통, 이진수 ${toBinary5(pot)}`}
            >
              {tileContent}
            </button>
          ) : (
            <div
              key={pot}
              role="listitem"
              className={`${styles.potTile} ${getPotState(pot)}`}
              aria-current={pot === decodedPot ? 'true' : undefined}
            >
              {tileContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}
