'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import { ColorFigure, useFigureState } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { advanceLens, cellsInLens, clampFocus, initialLens, isSettled, pictureAt, retarget } from './lens';
import { LENS_SIZE, lensScene } from './lensScene';
import { FOCUS_PRESETS, type Rgb } from './scene';

interface LensFigureProps {
  cells: Rgb[];
  gridSize: number;
  zoom: number;
  showLines: boolean;
  /** 돋보기가 설 자리. 아래 도형 견주기 화면과 함께 쓰므로 바깥이 갖는다. */
  focus: { x: number; y: number };
  onFocus: (focus: { x: number; y: number }) => void;
  /** 고른 칸의 색 (#rrggbb). */
  focusHex: string;
}

const nums = (v: string | null) => (v ?? '').split(' ').map(Number);

/**
 * 타일 벽화와 돋보기. 배율·해상도·줄눈은 바깥의 조절판이, 돋보기 자리는 바깥의 초점이 정한다.
 * figure 는 돋보기를 그 자리로 옮겨 가는 움직임만 갖는다. 초점이 바뀌면 그리는 중에 목표만 바꾼다
 * (effect 로 되돌리지 않으므로 이전 목표가 한 프레임 남지 않는다).
 */
export function LensFigure({ cells, gridSize, zoom, showLines, focus, onFocus, focusHex }: LensFigureProps) {
  const [st, dispatch] = useFigureState(() => initialLens(focus), advanceLens, isSettled);
  if (st.tx !== focus.x || st.ty !== focus.y) dispatch((s) => retarget(s, focus));

  /** 벽화나 렌즈를 누른 자리를 그림 좌표로 풀어 초점으로 삼는다. */
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button) return;
    const el = (event.target as Element).closest('[data-act="picture"], [data-act="lens"]');
    const svg = el?.closest('svg');
    const ctm = svg?.getScreenCTM();
    if (!el || !svg || !ctm) return;
    const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    const [a0, a1] = nums(el.getAttribute('data-a'));
    const [b0, b1] = nums(el.getAttribute('data-b'));
    const [c0, c1] = nums(el.getAttribute('data-c'));
    const [x, y, w, h] = nums(el.getAttribute('data-pic'));
    onFocus(clampFocus(pictureAt([pt.x, pt.y], [a0, a1], [b0, b1], [c0, c1], { x, y, w, h })));
  };

  const inLens = cellsInLens(st.x, st.y, zoom, gridSize);
  const zoomText = `${zoom < 10 ? zoom.toFixed(1) : Math.round(zoom)}배`;

  return (
    <div onPointerDown={handlePointerDown}>
      <ColorFigure
        size={LENS_SIZE}
        view={FRONT_VIEW}
        crispText
        fig="01"
        title="타일 벽화와 돋보기"
        hint="벽화나 렌즈를 누르면 돋보기가 그 자리로 갑니다"
        label={`타일 ${gridSize} × ${gridSize}칸으로 만든 벽화 앞에 돋보기가 있습니다. ${zoomText}로 보는 렌즈 안에 칸 ${inLens}개가 보입니다.`}
        scene={() => lensScene({ cells, gridSize, zoom, showLines, lens: { x: st.x, y: st.y } })}
        actionsLabel="돋보기 옮기기"
        actions={FOCUS_PRESETS.map((p) => ({ label: p.label, onClick: () => onFocus({ x: p.x, y: p.y }) }))}
        stats={[
          { label: '렌즈 배율', value: zoomText, small: true },
          { label: '렌즈에 보이는 칸', value: inLens.toLocaleString('ko-KR'), small: true },
          { label: '고른 칸의 색', value: focusHex, small: true },
        ]}
        status={
          inLens <= 4
            ? `${zoomText}: 렌즈에 칸이 ${inLens}개뿐입니다. 더 당겨도 이 칸들이 커질 뿐, 칸 안쪽에 새로 보이는 것은 없습니다.`
            : `${zoomText}: 렌즈에 칸 ${inLens.toLocaleString('ko-KR')}개가 보입니다. 배율을 올려 칸이 드러나는 순간을 찾아 보세요.`
        }
      />
    </div>
  );
}
