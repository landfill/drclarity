'use client';

import { ColorFigure } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { OUTCOME_LABEL, SCENARIO_LABEL, SCENARIO_ORDER, chooseScenario, figureLabel, formatTokens, isSettled, nextAction, progress, statusText, summaryOf, type DrawerState } from './drawer';
import { DRAWER_SIZE, drawerScene } from './drawerScene';

interface DrawerFigureProps {
  /** 세밀 조절 패널과 같은 상태를 쓰므로 바깥(CursorAgentLoopCostClient)이 useFigureState 로 갖는다. */
  state: DrawerState;
  dispatch: (action: (s: DrawerState) => DrawerState) => void;
}

/** 범위 서랍장: 프롬프트가 정한 범위만큼 서랍이 열리고, 열린 칸마다 문맥에 남은 양이 막대로 남는다. */
export function DrawerFigure({ state, dispatch }: DrawerFigureProps) {
  const next = nextAction(state);
  const p = progress(state);
  const settled = isSettled(state);

  return (
    <ColorFigure
      size={DRAWER_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="범위 서랍장"
      hint="프롬프트가 정한 범위만큼 서랍이 열립니다. 아래가 짚어 준 파일, 위로 갈수록 넓은 범위입니다"
      label={figureLabel(state)}
      scene={() => drawerScene(state)}
      actionsLabel="탐색 시나리오 비교"
      actions={SCENARIO_ORDER.map((sc) => ({
        label: SCENARIO_LABEL[sc],
        onClick: () => dispatch((s) => chooseScenario(s, sc)),
        primary: next === sc,
        group: 'scenario',
      }))}
      stats={[
        { label: '탐색 호출', value: `${p.calls}번`, small: true },
        { label: '누적 사용량', value: formatTokens(p.tokens), small: true },
        { label: '찾기 결과', value: settled ? OUTCOME_LABEL[summaryOf(state).outcome] : '—', small: true },
      ]}
      status={statusText(state)}
    />
  );
}
