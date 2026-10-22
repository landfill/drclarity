'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import {
  advanceRace,
  initialRace,
  isSettled,
  newArray,
  nextAction,
  stepOnce,
  toggleRun,
} from './race';
import { RACE_SIZE, raceScene } from './raceScene';
import type { InputPattern } from './sorting';

const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

/**
 * 정렬 선반 figure. 원소 수와 입력 패턴은 바깥의 선택기가 정하고, 바뀌면 바깥에서 `key` 로 새로 마운트한다.
 * 첫 배열은 서버와 같도록 고정 씨앗으로 만들고, "새 배열" 을 누를 때 씨앗을 새로 뽑는다.
 */
export function RaceFigure({ size, pattern }: { size: number; pattern: InputPattern }) {
  const [st, dispatch] = useFigureState(() => initialRace(size, pattern), advanceRace, isSettled);
  const next = nextAction(st);

  return (
    <ColorFigure
      size={RACE_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="정렬 선반"
      hint="세 칸에 같은 배열, 같은 빠르기"
      label={`선반 세 칸에 같은 배열 ${size}개가 막대로 놓여 있습니다. 위에서부터 버블, 병합, 퀵 정렬입니다. ${st.lanes
        .map((l) => `${l.label} 비교 ${l.compares.toLocaleString('ko-KR')}회, 이동 ${l.writes.toLocaleString('ko-KR')}회`)
        .join(', ')}.`}
      scene={() => raceScene(st)}
      actionsLabel="정렬하기"
      actions={[
        // 글자가 출발 ↔ 멈춤으로 바뀌어도 같은 버튼으로 남도록 id 를 준다 (키보드 포커스를 지킨다).
        { id: 'run', label: st.running ? '멈춤' : '출발', onClick: () => dispatch(toggleRun), primary: next === 'start' },
        { label: '한 스텝', onClick: () => dispatch(stepOnce) },
        { label: '새 배열', onClick: () => dispatch((s) => newArray(s, randomSeed())), primary: next === 'reset' },
      ]}
      // 좁은 화면에서는 선반 모서리 글자가 작으므로, 줄마다 비교 횟수를 머리줄에도 적는다.
      stats={st.lanes.map((l) => ({
        label: `${l.label} 비교`,
        value: `${l.compares.toLocaleString('ko-KR')}${l.pos >= l.trace.length ? ' 완료' : ''}`,
        small: true,
      }))}
      status={st.note}
    />
  );
}
