'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { toBinary5 } from './binary';
import { advanceDropper, emptyCups, initialDropper, isSettled, nextAction, startDropping, type DropperState } from './dropper';
import { DROPPER_SIZE, dropperScene } from './dropperScene';

/** 꿀 한 방울씩 나누기 figure. 꿀통은 바깥의 선택기가 정하고, 바뀌면 컵을 비우고 다시 시작한다. */
export function DropperFigure({ pot }: { pot: number }) {
  // 꿀통이 바뀌면 새로 마운트해 첫 화면부터 새 꿀통으로 그린다.
  return <DropperStage key={pot} pot={pot} />;
}

/** 꿀통 하나에 대한 figure 본체. 상태는 마운트될 때 그 꿀통으로 시작한다. */
function DropperStage({ pot }: { pot: number }) {
  const [st, dispatch] = useFigureState<DropperState>(() => initialDropper(pot), advanceDropper, isSettled);
  const next = nextAction(st);

  return (
    <ColorFigure
      size={DROPPER_SIZE}
      fig="01"
      title="꿀 한 방울씩 나누기"
      hint="이름표가 1인 개미의 컵에만 넣습니다"
      label={`나무판 위의 ${st.pot}번 꿀통과 개미 A부터 E까지 다섯 마리, 개미마다 혼합 컵이 하나씩 있다. 이름표는 ${toBinary5(st.pot)}.`}
      scene={() => dropperScene(st)}
      actionsLabel="꿀 나누기"
      actions={[
        { label: '한 방울씩 나누기', onClick: () => dispatch(startDropping), primary: next === 'drop' },
        { label: '컵 비우기', onClick: () => dispatch(emptyCups), primary: next === 'empty' },
      ]}
      stats={[
        { label: '꿀통', value: `${st.pot}번` },
        { label: '이름표', value: toBinary5(st.pot) },
      ]}
      status={st.note}
    />
  );
}
