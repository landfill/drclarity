'use client';

import { ColorFigure } from '@/components/topic/ColorFigure';
import type { ProblemScene } from '@/components/topic/ProblemFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { PRESET_LABEL, choosePreset, derive, figureLabel, formatTokens, nextAction, printedTotal, statusText, type LedgerState } from './ledger';
import { LEDGER_SIZE, ledgerScene } from './ledgerScene';

/** 퀴즈 전 첫 장면: 같은 병과 영수증 기계. 영수증은 비어 있고 수치를 적지 않는다. */
export const ledgerProblem = (state: LedgerState): ProblemScene => ({
  title: '문맥 병과 사용량 영수증',
  materials: ['문맥이 담긴 계량 병', '새 메시지 쪽지', '빈 영수증 기계'],
  size: LEDGER_SIZE,
  scene: () => ledgerScene(state, { problem: true }),
});

interface LedgerFigureProps {
  state: LedgerState;
  /** 세밀 조절 패널과 같은 상태를 쓰므로 바깥(CursorContextCostClient)이 useFigureState 로 갖는다. */
  dispatch: (action: (s: LedgerState) => LedgerState) => void;
}

/** 문맥 병과 사용량 영수증: 병(한 번의 크기)은 그대로이고, 영수증(여러 번의 합)이 호출마다 한 줄씩 길어진다. */
export function LedgerFigure({ state, dispatch }: LedgerFigureProps) {
  const next = nextAction(state);
  const d = derive(state);

  return (
    <ColorFigure
      size={LEDGER_SIZE}
      view={FRONT_VIEW}
      crispText
      labelPx={14}
      fig="01"
      title="문맥 병과 사용량 영수증"
      hint="병 하나가 창 200K 입니다. 영수증은 호출마다 한 줄씩, 같은 200K 자로 찍습니다"
      label={figureLabel(state)}
      scene={() => ledgerScene(state)}
      actionsLabel="호출 횟수 비교"
      actions={(['one', 'four'] as const).map((p) => ({
        label: PRESET_LABEL[p],
        onClick: () => dispatch((s) => choosePreset(s, p)),
        primary: next === p,
        group: 'calls',
      }))}
      stats={[
        { label: '요청 전 문맥', value: formatTokens(d.context), small: true },
        { label: '호출', value: `${state.calls}번`, small: true },
        { label: '입력·출력 누계', value: formatTokens(printedTotal(state)), small: true },
      ]}
      status={statusText(state)}
    />
  );
}
