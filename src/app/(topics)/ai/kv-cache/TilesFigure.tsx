'use client';

import { ColorFigure } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { compare, gridAlt, nextAction, readouts, rewind, statusText, stepOnce, togglePlay, type KvState } from './tiles';
import { TILES_SIZE, tilesScene } from './tilesScene';

interface TilesFigureProps {
  /** 세밀 조절 패널과 함께 쓰는 상태 (KvCacheClient 의 useFigureState). */
  state: KvState;
  dispatch: (action: (s: KvState) => KvState) => void;
}

/** 타일 판과 메모 상자: 줄마다 새로 만든 K·V(+)와 메모에서 다시 쓴 K·V(↶), 그리고 쌓이는 메모를 본다. */
export function TilesFigure({ state: st, dispatch }: TilesFigureProps) {
  const next = nextAction(st);
  const r = readouts(st);
  const atEnd = st.step >= st.length;

  return (
    <ColorFigure
      size={TILES_SIZE}
      view={FRONT_VIEW}
      crispText
      labelPx={14}
      fig="01"
      title="타일 판과 메모 상자"
      hint="줄 하나가 처리 단계 하나입니다. + 는 새로 만든 K·V, ↶ 는 메모 상자에서 꺼내 다시 쓴 K·V 입니다"
      label={gridAlt(st)}
      scene={() => tilesScene(st)}
      actionsLabel="같은 토큰 수로 캐시 비교"
      actions={[
        { label: '1. 캐시 없이', onClick: () => dispatch((s) => compare(s, false)), primary: next === 'off', group: 'compare' },
        { label: '2. 캐시 켜고', onClick: () => dispatch((s) => compare(s, true)), primary: next === 'on', group: 'compare' },
        { id: 'play', label: st.playing ? '일시정지' : atEnd ? '처음부터 재생' : '재생', onClick: () => dispatch(togglePlay), primary: next === 'pause' },
        { label: '한 토큰 더', onClick: () => dispatch(stepOnce) },
        { label: '처음으로', onClick: () => dispatch(rewind) },
      ]}
      stats={[
        { label: '새로 계산한 칸', value: r.computed.toLocaleString('ko-KR'), small: true },
        { label: '다시 읽은 칸', value: r.reused.toLocaleString('ko-KR'), small: true },
        { label: '적어둔 메모', value: r.memos.toLocaleString('ko-KR'), small: true },
        { label: 'K·V 생성 횟수 비율', value: r.ratio, small: true },
      ]}
      status={statusText(st)}
    />
  );
}
