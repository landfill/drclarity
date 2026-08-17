'use client';

import { DOOR_COUNT, type MontyHallTrial, type Strategy } from './montyHall';
import styles from './MontyHall.module.css';

export type PlayPhase = 'picking' | 'opened' | 'resolved';

export interface DoorStageProps {
  phase: PlayPhase;
  /** 다음 판을 시작할 때 포커스를 되돌려줄 수 있게 첫 문을 내준다. */
  firstDoorRef?: React.Ref<HTMLButtonElement>;
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
  finalStrategy: Strategy | null,
): { open: boolean; content: string; note: string; prize: string } {
  if (phase === 'picking' || !trial) {
    return { open: false, content: '?', note: '', prize: '' };
  }

  const isOpenedByHost = door === trial.openedDoor;
  const isPicked = door === trial.pickedDoor;

  if (phase === 'opened') {
    return {
      open: isOpenedByHost,
      content: isOpenedByHost ? '🐐' : '?',
      note: isOpenedByHost ? '사회자가 열었습니다' : isPicked ? '내가 고른 문' : '',
      // 열린 문의 상품은 그림문자로만 보이고 그 span 은 aria-hidden 이다.
      // 읽어줄 수 있는 곳은 접근성 이름뿐이므로 여기에 담는다.
      prize: isOpenedByHost ? '염소' : '',
    };
  }

  // 실제로 바꿨는지에 따라 남은 문의 설명이 달라진다. note 는 aria-label 로도 쓰이므로
  // 사용자가 택하지 않은 쪽의 가정법을 읽어주면 안 된다.
  const switched = finalStrategy === 'switch';
  const remainingNote = switched ? '바꿔서 고른 문' : '바꿨다면 이 문';
  const pickedNote = switched ? '처음 고른 문' : '유지한 문';

  return {
    open: true,
    content: door === trial.carDoor ? '🚗' : '🐐',
    note: isPicked ? pickedNote : isOpenedByHost ? '사회자가 열었습니다' : remainingNote,
    prize: door === trial.carDoor ? '자동차' : '염소',
  };
}

export function DoorStage({ phase, trial, finalStrategy, onPick, firstDoorRef }: DoorStageProps) {
  return (
    <div className={styles.doorStage}>
      <ul className={styles.doorRow}>
        {Array.from({ length: DOOR_COUNT }, (_, door) => {
          const { open, content, note, prize } = doorState(door, phase, trial, finalStrategy);
          const isPicked = trial?.pickedDoor === door;
          const isFinal =
            phase === 'resolved' &&
            trial !== null &&
            finalStrategy !== null &&
            door === (finalStrategy === 'switch' ? trial.switchDoor : trial.pickedDoor);

          return (
            <li key={door} className={styles.doorCell}>
              <button
                ref={door === 0 ? firstDoorRef : undefined}
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
                aria-label={[DOOR_LABELS[door], prize, note].filter(Boolean).join(' — ')}
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
