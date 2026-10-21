'use client';

import { useEffect } from 'react';
import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { DOOR_COUNT } from './montyHall';
import {
  advanceStage,
  decide,
  describeDoor,
  hostOpens,
  initialStage,
  isSettled,
  newRound,
  nextAction,
  pickDoor,
  type StageState,
} from './stage';
import { STAGE_SIZE, stageScene } from './stageScene';
import PlayLog from './content/play-log.mdx';
import styles from './MontyHall.module.css';

/** 서버와 첫 화면은 같은 상태로 그린다. 상품 자리는 문이 닫혀 있는 동안 브라우저에서 다시 뽑는다. */
const firstStage = () => initialStage(() => 0);

/** 무대 위 문 세 개 figure. 상태는 stage.ts, 그림은 stageScene.ts 가 맡고 여기서는 버튼과 숫자를 잇는다. */
export function StageFigure() {
  const [st, dispatch] = useFigureState<StageState>(firstStage, advanceStage, isSettled);
  const next = nextAction(st);

  useEffect(() => {
    dispatch(() => initialStage());
  }, [dispatch]);

  const doors = Array.from({ length: DOOR_COUNT }, (_, i) => i);

  return (
    <>
    <ColorFigure
      size={STAGE_SIZE}
      fig="01"
      title="무대 위 문 세 개"
      hint="문을 고르고, 사회자가 문을 연 뒤에 정하세요"
      label={`무대 위 벽에 문 세 개. ${doors.map((i) => describeDoor(st, i)).join(', ')}.`}
      scene={() => stageScene(st)}
      actionsLabel="한 판 하기"
      actions={[
        ...doors.map((i) => ({
          label: `${i + 1}번 문`,
          group: 'pick',
          onClick: () => dispatch((s) => pickDoor(s, i)),
          primary: next === 'pick',
        })),
        { label: '사회자가 문 열기', onClick: () => dispatch(hostOpens), primary: next === 'host' },
        { label: '바꾸기', group: 'decide', onClick: () => dispatch((s) => decide(s, 'switch')), primary: next === 'decide' },
        { label: '유지하기', group: 'decide', onClick: () => dispatch((s) => decide(s, 'stay')), primary: next === 'decide' },
        { label: '한 판 더', onClick: () => dispatch((s) => newRound(s)), primary: next === 'again' },
      ]}
      onAct={(name) => {
        const m = /^door-(\d)$/.exec(name);
        if (m) dispatch((s) => pickDoor(s, Number(m[1])));
      }}
      stats={[
        { label: '판', value: String(st.tally.rounds) },
        { label: '바꿔서 자동차', value: String(st.tally.switchWins) },
        { label: '유지해서 자동차', value: String(st.tally.stayWins) },
      ]}
      status={st.note}
    />
    {st.tally.rounds > 0 && (
      <div className={styles.playLog}>
        <PlayLog rounds={st.tally.rounds} switchWins={st.tally.switchWins} stayWins={st.tally.stayWins} />
      </div>
    )}
    </>
  );
}
