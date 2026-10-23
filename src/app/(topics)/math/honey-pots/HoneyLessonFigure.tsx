'use client';

import { ColorFigure, useFigureState, type FigureAction, type FigureStat } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { ANT_BITS, ANT_LABELS, POT_COUNT, toBinary5 } from './binary';
import { addAnt, advanceLesson, antNamesFor, groupPots, initialLesson, lessonIsSettled, nextAction, readResult, type LessonMode } from './lesson';
import { GRID_SIZE, LABEL_SIZE, OUTCOMES_SIZE, lessonScene, mixtureCount } from './lessonScene';
import styles from './BinaryEncodingBoard.module.css';

const TITLES: Record<LessonMode, string> = {
  grid: '25통 가운데 가짜는 하나', groups: '다섯 그룹으로 나누면?', codes: '개미가 늘면 결과는 두 배',
  signature: '꿀통에 개미 그룹 이름표 붙이기', encoding: '한 컵에 모이는 여러 꿀통',
  simulation: '생사 결과로 이름표 읽기', summary: '32가지 결과에 25통 배정하기',
};
const FIGURES: Record<LessonMode, string> = { grid: '01', groups: '02', codes: '03', signature: '04', encoding: '06', simulation: '07', summary: '08' };

/** 기존 5번의 배분 장면을 앞뒤 단계의 관찰·비교·판독 장면으로 잇는다. */
export function HoneyLessonFigure({ mode, pot, activeAntBit, deadAntBits }: {
  mode: LessonMode; pot: number; activeAntBit: number | null; deadAntBits: readonly number[];
}) {
  const [st, dispatch] = useFigureState(initialLesson, advanceLesson, lessonIsSettled);
  const result = readResult(deadAntBits);
  const actions: FigureAction[] = [];
  let stats: FigureStat[] = [];
  let status = '';

  switch (mode) {
    case 'grid':
      stats = [{ label: '꿀통', value: '25통' }, { label: '가짜', value: '1통' }];
      status = '25통과 개미 다섯 마리입니다. 아직 어느 꿀통이 가짜인지는 모릅니다.';
      break;
    case 'groups': {
      const candidates = groupPots(st.group);
      stats = [{ label: '그룹', value: ANT_LABELS[st.group] }, { label: '남은 후보', value: '5통' }];
      status = `${ANT_LABELS[st.group]}가 ${candidates[0]}~${candidates[4]}번을 섞어 먹고 죽었다면, 이 다섯 통 중 하나가 가짜입니다. 어느 통인지는 구별되지 않습니다.`;
      break;
    }
    case 'codes':
      actions.push({ label: '개미 한 마리 추가', primary: nextAction(st) === 'add', onClick: () => dispatch(addAnt) },
        { label: '처음부터 세기', primary: nextAction(st) === 'reset', onClick: () => dispatch(initialLesson) });
      stats = [{ label: '개미', value: `${st.antCount}마리` }, { label: '생사 결과', value: `${2 ** st.antCount}가지` }];
      status = st.note || `${st.antCount}마리의 결과는 2${st.antCount === 1 ? '' : `의 ${st.antCount}제곱`}, ${2 ** st.antCount}가지입니다. 0은 생존, 1은 사망을 뜻합니다.${st.antCount === 5 ? ' 25통에 서로 다른 결과를 배정할 수 있습니다.' : ''}`;
      break;
    case 'signature':
      stats = [{ label: '꿀통', value: `${pot}번` }, { label: '이름표', value: toBinary5(pot) }];
      status = `${pot}번에 이름표 ${toBinary5(pot)}를 붙입니다. 1이 적힌 ${antNamesFor(pot)}가 이 꿀을 받을 개미 그룹입니다. 아래 작은 숫자는 각 자리의 값입니다.`;
      break;
    case 'encoding': {
      const index = ANT_BITS.findIndex(bit => bit === activeAntBit);
      stats = [{ label: '혼합 컵', value: index < 0 ? '미선택' : ANT_LABELS[index] }, { label: '섞는 꿀통', value: `${mixtureCount(activeAntBit)}통` }];
      status = index < 0 ? '위에서 개미의 혼합 컵을 골라 보세요. 그 컵에 들어가는 꿀통들이 강조됩니다.'
        : `${ANT_LABELS[index]}의 자릿값은 ${activeAntBit}입니다. 이름표의 이 자리가 1인 ${mixtureCount(activeAntBit)}통에서 한 방울씩 섞습니다. 강조된 꿀통이 모두 가짜라는 뜻은 아닙니다.`;
      break;
    }
    case 'simulation':
      stats = [{ label: '생사 이름표', value: result.code }, { label: result.pot === null ? '배정된 꿀통' : '가짜 꿀통', value: result.pot === null ? '없음' : `${result.pot}번` }];
      status = result.note;
      break;
    case 'summary':
      stats = [{ label: '생사 결과', value: '32가지' }, { label: '배정', value: `${POT_COUNT}통` }];
      status = '겨자색 이름표 00001~11001을 1~25번에 배정했습니다. 00000과 11010~11111, 총 7가지는 쓰지 않습니다. 일반적으로 n마리면 2ⁿ가지 결과를 구별할 수 있습니다.';
      break;
  }

  const size = mode === 'signature' || mode === 'simulation' ? LABEL_SIZE : mode === 'codes' || mode === 'summary' ? OUTCOMES_SIZE : GRID_SIZE;
  return <>
    {mode === 'groups' && (
      <fieldset className={styles.antPicker}>
        <legend>관찰할 그룹</legend>
        <div className={styles.antChoices}>
          {ANT_LABELS.map((name, i) => {
            const candidates = groupPots(i);
            return <button type="button" key={name} aria-pressed={i === st.group}
              aria-label={`${name} 그룹, ${candidates[0]}~${candidates[4]}번 꿀통`}
              onClick={() => dispatch(s => ({ ...s, group: i }))}>
              <strong>{name}</strong><span>{candidates[0]}~{candidates[4]}번</span>
            </button>;
          })}
        </div>
      </fieldset>
    )}
    <ColorFigure size={size} view={FRONT_VIEW} crispText fig={FIGURES[mode]} title={TITLES[mode]}
      label={`${TITLES[mode]}. ${status}`} scene={() => lessonScene(mode, st, pot, activeAntBit, deadAntBits)}
      actions={actions} actionsLabel="결과 세기" stats={stats} status={status} />
  </>;
}
