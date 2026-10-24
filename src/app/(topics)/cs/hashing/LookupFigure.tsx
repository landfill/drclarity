'use client';

import { ColorFigure } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { ACTION_LABEL, TABLE, act, figureLabel, hits, nextAction, statusText, type LookupAction, type LookupState } from './lookup';
import { LOOKUP_SIZE, lookupScene } from './lookupScene';

interface LookupFigureProps {
  /** 위 칸의 소금 체크 상자와 같은 상태를 쓰므로 바깥(HashingClient)이 useFigureState 로 갖는다. */
  state: LookupState;
  dispatch: (action: (s: LookupState) => LookupState) => void;
}

/** 유출된 저장소와 미리 만든 표: 되돌리는 대신 표에서 찾는다. 소금을 섞으면 같은 표가 한 줄도 맞지 않는다. */
export function LookupFigure({ state, dispatch }: LookupFigureProps) {
  const next = nextAction(state);
  return (
    <ColorFigure
      size={LOOKUP_SIZE}
      view={FRONT_VIEW}
      crispText
      labelPx={14}
      fig="01"
      title="유출된 저장소와 미리 만든 표"
      hint="자가 표를 한 줄씩 내려가며, 저장소의 값과 같은 해시를 찾습니다"
      label={figureLabel(state)}
      scene={() => lookupScene(state)}
      actionsLabel="표에서 찾기"
      actions={(['scan', 'salt'] as LookupAction[]).map((a) => ({
        label: ACTION_LABEL[a],
        onClick: () => dispatch((s) => act(s, a)),
        primary: next === a,
        group: 'lookup',
      }))}
      stats={[
        { label: '훑은 줄', value: `${state.started ? state.scanned : 0} / ${TABLE.length}`, small: true },
        { label: '걸린 줄', value: `${hits(state)}`, small: true },
      ]}
      status={statusText(state)}
    />
  );
}
