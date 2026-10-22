'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { formatProbabilityPercent, pairCount } from './birthday';
import { BATCHES, advanceCalendar, clearTally, gather, initialCalendar, isSettled, nextAction, sharedPercent, theory } from './calendar';
import { CALENDAR_SIZE, calendarScene } from './calendarScene';

const randomSeed = () => Math.floor(Math.random() * 2 ** 32);
const count = (v: number) => v.toLocaleString('ko-KR');

/**
 * 생일 달력판. 인원은 바깥 슬라이더가 정하고, 바뀌면 바깥에서 `key` 로 새로 마운트한다
 * (다른 인원의 집계를 이어 쓰면 막대와 이론값이 서로 다른 분포를 가리킨다).
 * 첫 그림은 서버와 같도록 고정 씨앗으로 시작하고, 처음 모을 때 씨앗을 새로 뽑는다.
 */
export function CalendarFigure({ people }: { people: number }) {
  const [st, dispatch] = useFigureState(() => initialCalendar(people), advanceCalendar, isSettled);
  const next = nextAction(st);
  const measured = sharedPercent(st);

  return (
    <ColorFigure
      size={CALENDAR_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="생일 달력판"
      hint={`${people}명이 모일 때마다 생일 칸에 스티커를 붙입니다`}
      label={`한 해 달력판과 집계 막대. ${people}명씩 ${count(st.groups)}번 모였고 그중 ${count(st.shared)}번 같은 생일이 있었습니다. 이론값은 ${formatProbabilityPercent(theory(people))} 입니다.`}
      scene={() => calendarScene(st)}
      actionsLabel="모아보기"
      actions={[
        ...BATCHES.map((k) => ({
          label: `${count(k)}번 모아보기`,
          onClick: () => dispatch((s) => gather(s.groups === 0 && s.queue === 0 ? { ...s, seed: randomSeed() } : s, k)),
          primary: next === k,
        })),
        { label: '집계 비우기', onClick: () => dispatch(clearTally) },
      ]}
      stats={[
        { label: '비교되는 쌍', value: `${count(pairCount(people))}쌍`, small: true },
        { label: '같은 생일 (모은 결과)', value: measured ? `${measured}%` : '—', small: true },
        { label: '이론값', value: formatProbabilityPercent(theory(people)), small: true },
      ]}
      status={st.note}
    />
  );
}
