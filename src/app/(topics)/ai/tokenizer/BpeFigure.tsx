'use client';

import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { prefersReducedMotion } from '@/lib/reducedMotion';
import { advanceBpe, isSettled, mergeAll, mergeOnce, nextAction, openBpe, planFor, statusText, tokensAt, unpack } from './bpe';
import { BPE_SIZE, bpeScene } from './bpeScene';

/**
 * 바이트 타일과 규칙표. 입력은 바깥(예시 버튼·입력 칸)이 정하고, 바뀌면 바깥이 key 로 새로 마운트한다.
 * animate 면 바이트로 풀어 처음부터 묶는다 (움직임 줄이기 설정이면 끝 모습으로 연다).
 */
export function BpeFigure({ text, animate }: { text: string; animate: boolean }) {
  const [st, dispatch] = useFigureState(() => openBpe(text, animate, animate && prefersReducedMotion()), advanceBpe, isSettled);
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
