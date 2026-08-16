'use client';

import { DOOR_COUNT, type MontyHallTrial, type Strategy } from './montyHall';
import styles from './MontyHall.module.css';

export type PlayPhase = 'picking' | 'opened' | 'resolved';

export interface DoorStageProps {
  phase: PlayPhase;
  trial: MontyHallTrial | null;
  /** 최종 선택. resolved 단계에서만 채워진다. */
  finalStrategy: Strategy | null;
  onPick: (door: number) => void;
}

const DOOR_LABELS = ['1번 문', '2번 문', '3번 문'];

function doorState(
  door: number,
  phase: PlayPhase,
  trial: MontyHallTrial | null,
): { open: boolean; content: string; note: string } {
  if (phase === 'picking' || !trial) {
    return { open: false, content: '?', note: '' };
  }

  const isOpenedByHost = door === trial.openedDoor;
  const isPicked = door === trial.pickedDoor;

  if (phase === 'opened') {
    return {
      open: isOpenedByHost,
      content: isOpenedByHost ? '🐐' : '?',
      note: isOpenedByHost ? '사회자가 열었습니다' : isPicked ? '내가 고른 문' : '',
    };
  }

  return {
    open: true,
    content: door === trial.carDoor ? '🚗' : '🐐',
    note: isPicked ? '처음 고른 문' : isOpenedByHost ? '사회자가 열었습니다' : '바꿨다면 이 문',
  };
}

export function DoorStage({ phase, trial, finalStrategy, onPick }: DoorStageProps) {
  return (
    <div className={styles.doorStage}>
      <ul className={styles.doorRow}>
        {Array.from({ length: DOOR_COUNT }, (_, door) => {
          const { open, content, note } = doorState(door, phase, trial);
          const isPicked = trial?.pickedDoor === door;
          const isFinal =
            phase === 'resolved' &&
            trial !== null &&
            finalStrategy !== null &&
            door === (finalStrategy === 'switch' ? trial.switchDoor : trial.pickedDoor);

          return (
            <li key={door} className={styles.doorCell}>
              <button
                type="button"
                className={[
                  styles.door,
                  open ? styles.doorOpen : '',
                  isPicked ? styles.doorPicked : '',
                  isFinal ? styles.doorFinal : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onPick(door)}
                disabled={phase !== 'picking'}
                aria-label={`${DOOR_LABELS[door]}${note ? ` — ${note}` : ''}`}
              >
                <span className={styles.doorNumber}>{door + 1}</span>
                <span className={styles.doorContent} aria-hidden="true">
                  {content}
                </span>
              </button>
              <p className={styles.doorNote}>{note || ' '}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
