'use client';

import { ColorFigure } from '@/components/topic/ColorFigure';
import { FRONT_VIEW } from '@/lib/colorfigures/core';
import { CONFIG_LABEL, nextAction, observation, rowAlt, rowSummary, type Config } from './shelf';
import { SHELF_SIZE, shelfScene, type Row } from './shelfScene';

interface ShelfFigureProps {
  /** 위 줄(지금 요청)과, 있으면 아래 줄(견줄 줄). */
  rows: Row[];
  /** 두 줄이 함께 쓰는 시간 눈금. */
  scale: number;
  /** 지금 값이 세 버튼 중 어느 것과 같은가. */
  active: Config | null;
  /** 이미 그 상태인 버튼을 다시 눌렀을 때의 안내 (바깥이 갖는다). */
  note: string;
  onConfig: (c: Config) => void;
}

/** 시간 선반: 읽기 판과 쓰기 막대를 같은 시간 자 위에 올려 첫 토큰과 끝을 견준다. 상태는 바깥(세밀 조절 패널과 함께)이 갖는다. */
export function ShelfFigure({ rows, scale, active, note, onConfig }: ShelfFigureProps) {
  const next = nextAction(active);
  const [top, bottom] = rows;
  const first = rowSummary(top.phases);

  return (
    <ColorFigure
      size={SHELF_SIZE}
      view={FRONT_VIEW}
      crispText
      labelPx={14}
      fig="01"
      title="시간 선반"
      hint="겨자색 판이 읽기, 파란 줄무늬 막대가 쓰기, 빨간 깃발이 첫 토큰입니다. 두 선반은 같은 시간 눈금입니다"
      label={rows.map((r) => `${rowAlt(r.label, r.phases)}${r.prompt ? ` 요청: ${r.prompt}.` : ''}`).join(' ')}
      scene={() => shelfScene(rows, scale)}
      actionsLabel="한 조건씩 비교"
      actions={(['input', 'output', 'quiz'] as const).map((c) => ({ label: CONFIG_LABEL[c], onClick: () => onConfig(c), primary: next === c }))}
      stats={[
        { label: '첫 토큰까지', value: Math.round(first.first).toLocaleString('ko-KR'), small: true },
        { label: '끝까지', value: Math.round(first.total).toLocaleString('ko-KR'), small: true },
      ]}
      status={note || observation(top.phases, bottom?.phases ?? [])}
    />
  );
}
