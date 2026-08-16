'use client';

import { DOOR_COUNT, resolveRound } from './montyHall';
import styles from './MontyHall.module.css';

/** 어떤 열을 강조할지. 풀이 단계에 따라 바뀐다. */
export type CaseHighlight = 'none' | 'pick' | 'stay' | 'switch';

const ASSUMED_PICK = 0;

/**
 * "참가자가 1번 문을 골랐다"로 고정하고 자동차 위치 3가지를 모두 늘어놓은 표.
 *
 * 일반성을 잃지 않는다 — 문 번호는 이름표일 뿐이므로 어느 문을 골라도 같은 그림이 된다.
 * 사회자가 열 문이 둘인 경우(자동차와 첫 선택이 같을 때)는 표를 안정적으로 유지하려고
 * 항상 앞쪽 문을 열게 고정했다. 승패는 이 선택과 무관하다.
 */
const CASES = Array.from({ length: DOOR_COUNT }, (_, carDoor) =>
  resolveRound(carDoor, ASSUMED_PICK, () => 0),
);

export function CaseBoard({ highlight }: { highlight: CaseHighlight }) {
  return (
    <div className={styles.caseBoard}>
      <p className={styles.caseCaption}>
        내가 <strong>1번 문</strong>을 골랐을 때 일어날 수 있는 경우는 셋뿐이고, 셋은 똑같이 1/3씩입니다.
      </p>

      <table className={styles.caseTable}>
        <thead>
          <tr>
            <th scope="col">자동차 위치</th>
            <th scope="col" className={highlight === 'pick' ? styles.caseColActive : undefined}>
              내 선택
            </th>
            <th scope="col">사회자가 연 문</th>
            <th scope="col" className={highlight === 'stay' ? styles.caseColActive : undefined}>
              유지하면
            </th>
            <th scope="col" className={highlight === 'switch' ? styles.caseColActive : undefined}>
              바꾸면
            </th>
          </tr>
        </thead>
        <tbody>
          {CASES.map((trial) => (
            <tr key={trial.carDoor}>
              <th scope="row">{trial.carDoor + 1}번 🚗</th>
              <td className={highlight === 'pick' ? styles.caseColActive : undefined}>
                {trial.pickedDoor + 1}번
              </td>
              <td>{trial.openedDoor + 1}번 🐐</td>
              <td
                className={[
                  highlight === 'stay' ? styles.caseColActive : '',
                  trial.stayWins ? styles.caseWin : styles.caseLose,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {trial.stayWins ? '자동차' : '염소'}
              </td>
              <td
                className={[
                  highlight === 'switch' ? styles.caseColActive : '',
                  trial.switchWins ? styles.caseWin : styles.caseLose,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {trial.switchWins ? '자동차' : '염소'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>
              자동차를 얻는 경우
            </th>
            <td className={highlight === 'stay' ? styles.caseColActive : undefined}>
              <strong>1 / 3</strong>
            </td>
            <td className={highlight === 'switch' ? styles.caseColActive : undefined}>
              <strong>2 / 3</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
