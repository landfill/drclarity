'use client';

import { ColorFigure } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import type { WindowState } from './conversation';
import { PRESETS, nextAction, observation, type Preset } from './rail';
import { RAIL_SIZE, railScene } from './railScene';

interface RailFigureProps {
  /** 지금 대화를 창에 담은 결과 (fitToWindow). */
  state: WindowState;
  /** 지금 값이 세 버튼 중 어느 것과 같은가. */
  active: Preset | null;
  /** 이미 그 상태인 버튼을 다시 눌렀을 때의 안내 (바깥이 갖는다). */
  note: string;
  onPreset: (p: Preset) => void;
}

/** 메시지 레일: 대화 블록을 오래된 것부터 놓고, 이번 입력의 틀이 최근 메시지부터 통째로 담는다. 상태는 바깥(세밀 조절 패널과 함께)이 갖는다. */
export function RailFigure({ state, active, note, onPreset }: RailFigureProps) {
  const next = nextAction(active);
  return (
    <ColorFigure
      size={RAIL_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="메시지 레일"
      hint="왼쪽이 오래된 메시지, 오른쪽이 최근 메시지입니다. 블록 폭은 토큰 수, 파란 틀이 이번 입력입니다"
      label={`메시지 ${state.turns.length}개(질문 포함)가 레일에 있습니다. 이번 입력에는 최근 메시지부터 ${state.used}토큰을 담았고, 창은 ${state.limit}토큰입니다. ${
        state.droppedCount === 0 ? '모든 메시지가 입력 안에 있습니다.' : `오래된 메시지 ${state.droppedCount}개는 입력 밖이지만 기록에는 그대로 있습니다.`
      } 이름이 든 첫 메시지는 ${state.remembersName ? '입력 안' : '입력 밖'}입니다.`}
      scene={() => railScene(state)}
      actionsLabel="대화와 입력 창 비교"
      actions={(['short', 'long', 'wide'] as const).map((p) => ({ label: PRESETS[p].label, onClick: () => onPreset(p), primary: next === p }))}
      stats={[
        { label: '이번 입력', value: `${state.used} / ${state.limit}`, small: true },
        { label: '입력 밖', value: `${state.droppedCount}개`, small: true },
      ]}
      status={note || observation(state)}
    />
  );
}
