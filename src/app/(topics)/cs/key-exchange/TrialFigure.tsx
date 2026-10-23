'use client';

import { ColorFigure } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { ACTION_LABEL, ACTION_ORDER, act, figureLabel, nextAction, statusText, triedCount, values, type TrialState } from './trial';
import { TRIAL_SIZE, trialScene } from './trialScene';

interface TrialFigureProps {
  /** 위 세밀 조절(공개 값 · 두 비밀)과 같은 상태를 쓰므로 바깥(RealMath)이 useFigureState 로 갖는다. */
  state: TrialState;
  dispatch: (action: (s: TrialState) => TrialState) => void;
}

/** 숫자 카드 탁자: 보낸 수는 통로를 지나 도청자에게도 보이고, 공유 비밀은 통로를 지나지 않는다. */
export function TrialFigure({ state, dispatch }: TrialFigureProps) {
  const next = nextAction(state);
  const v = values(state);
  return (
    <ColorFigure
      size={TRIAL_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="숫자 카드 탁자"
      hint="빨간 카드는 자리에 남고, 파란 카드만 통로를 건넙니다. 겨자색 카드는 두 사람이 따로 만듭니다"
      label={figureLabel(state)}
      scene={() => trialScene(state)}
      actionsLabel="키 교환 단계"
      actions={ACTION_ORDER.map((a) => ({ label: ACTION_LABEL[a], onClick: () => dispatch((s) => act(s, a)), primary: next === a, group: 'steps' }))}
      stats={[
        { label: '도청자가 넣어 본 수', value: state.tried === null ? '—' : `${triedCount(state)}번`, small: true },
        { label: '최대', value: `${v.p - 1}번`, small: true },
      ]}
      status={statusText(state)}
    />
  );
}
