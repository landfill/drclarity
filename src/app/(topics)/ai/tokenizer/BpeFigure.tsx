'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { advanceBpe, initialBpe, isSettled, mergeAll, mergeOnce, nextAction, planFor, retarget, statusText, tokensAt, unpack } from './bpe';
import { BPE_SIZE, bpeScene } from './bpeScene';

/**
 * 바이트 타일과 규칙표. 입력은 바깥(예시 버튼·입력 칸)이 정하고, figure 는 묶는 과정만 갖는다.
 * 입력이 바뀌면 그리는 중에 목표만 바꾼다 (effect 로 되돌리지 않으므로 이전 입력이 한 프레임 남지 않는다).
 */
export function BpeFigure({ text }: { text: string }) {
  const [st, dispatch] = useFigureState(() => initialBpe(text), advanceBpe, isSettled);
  if (st.text !== text) dispatch((s) => retarget(s, text));
  const plan = planFor(st.text);
  const pieces = tokensAt(plan, st.step).length;
  const next = nextAction(st);

  return (
    <ColorFigure
      size={BPE_SIZE}
      view={FRONT_VIEW}
      crispText
      fig="01"
      title="바이트 타일과 규칙표"
      hint="바이트에서 시작해 고정된 규칙표대로 한 쌍씩 합칩니다"
      label={`입력의 바이트 ${plan.bytes.length}개가 타일로 놓여 있고, 지금 묶음은 ${pieces}개입니다. ${statusText(st)}`}
      scene={() => bpeScene(st)}
      actionsLabel="묶기"
      actions={[
        { label: '바이트로 풀기', onClick: () => dispatch(unpack), primary: next === 'unpack' },
        { label: '한 번 묶기', onClick: () => dispatch(mergeOnce), primary: next === 'once' },
        { label: '끝까지 묶기', onClick: () => dispatch(mergeAll) },
      ]}
      stats={[
        { label: '바이트', value: String(plan.bytes.length), small: true },
        { label: '묶음', value: String(pieces), small: true },
      ]}
      status={statusText(st)}
    />
  );
}
