'use client';

import { ANT_BITS, ANT_LABELS, POT_COUNT, toBinary5 } from './binary';
import { DropperFigure } from './DropperFigure';
import { HoneyLessonFigure } from './HoneyLessonFigure';
import type { LessonMode } from './lesson';
import styles from './BinaryEncodingBoard.module.css';

export type HoneyBoardMode = LessonMode | 'routing';

export interface BinaryEncodingBoardProps {
  mode: HoneyBoardMode;
  selectedPot?: number;
  onSelectPot?: (pot: number) => void;
  activeAntBit?: number | null;
  onActiveAntBitChange?: (bit: number | null) => void;
  deadAntBits?: readonly number[];
  onToggleAntDead?: (bit: number) => void;
}

const POTS = Array.from({ length: POT_COUNT }, (_, i) => i + 1);
const NO_DEAD_ANTS: readonly number[] = [];

/** 이름표 붙이기와 배분에서 같은 선택판을 쓰고 선택 번호를 부모 상태에 남긴다. */
function PotSelector({ pot, onSelect }: { pot: number; onSelect?: (pot: number) => void }) {
  return (
    <fieldset className={styles.potPicker}>
      <legend>꿀통 고르기</legend>
      <p className={styles.pickerHelp}>번호를 누르면 그림과 이름표가 함께 바뀝니다.</p>
      <div className={styles.potGrid}>
        {POTS.map(number => (
          <button type="button" key={number} className={styles.potChoice}
            aria-pressed={number === pot} aria-label={number + '번 꿀통, 이진수 ' + toBinary5(number)}
            onClick={() => onSelect?.(number)}>
            <strong>{number}</strong><span>{toBinary5(number)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** 단계별 손그림과 키보드로도 조작할 수 있는 선택판을 잇는다. */
export function BinaryEncodingBoard({ mode, selectedPot = 21, onSelectPot, activeAntBit,
  onActiveAntBitChange, deadAntBits = NO_DEAD_ANTS, onToggleAntDead }: BinaryEncodingBoardProps) {
  const selectingPot = mode === 'signature' || mode === 'routing';
  const selectingAnt = mode === 'encoding' || mode === 'simulation';

  return (
    <div className={styles.board}>
      {selectingPot && <PotSelector pot={selectedPot} onSelect={onSelectPot} />}
      {selectingAnt && (
        <fieldset className={styles.antPicker}>
          <legend>{mode === 'encoding' ? '혼합 컵 고르기' : '1시간 뒤 생사 결과 바꾸기'}</legend>
          <div className={styles.antChoices}>
            {ANT_BITS.map((bit, i) => {
              const pressed = mode === 'encoding' ? activeAntBit === bit : deadAntBits.includes(bit);
              return (
                <button type="button" key={bit} aria-pressed={pressed}
                  aria-label={mode === 'encoding' ? '개미 ' + ANT_LABELS[i] + '의 혼합 컵, 자릿값 ' + bit : '개미 ' + ANT_LABELS[i] + ', 자릿값 ' + bit + ', ' + (pressed ? '사망' : '생존')}
                  onClick={() => mode === 'encoding' ? onActiveAntBitChange?.(pressed ? null : bit) : onToggleAntDead?.(bit)}>
                  <strong>{ANT_LABELS[i]}</strong><span>자릿값 {bit}</span>
                  {mode === 'simulation' && <span>{pressed ? '사망 · 1' : '생존 · 0'}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {mode === 'routing' ? <DropperFigure pot={selectedPot} /> : (
        <HoneyLessonFigure key={mode} mode={mode} pot={selectedPot} activeAntBit={activeAntBit ?? null} deadAntBits={deadAntBits} />
      )}
    </div>
  );
}
