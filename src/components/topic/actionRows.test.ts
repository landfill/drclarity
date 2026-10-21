import { describe, expect, it } from 'vitest';
import { actionRows, type FigureAction } from './ColorFigure';

const a = (label: string, group?: string): FigureAction => ({ label, group, onClick: () => {} });

describe('actionRows', () => {
  it('이어진 같은 group 만 한 줄로 묶고, group 이 없으면 한 줄에 하나', () => {
    const rows = actionRows([a('1', 'pick'), a('2', 'pick'), a('열기'), a('바꾸기', 'd'), a('유지', 'd'), a('다시'), a('3', 'pick')]);
    expect(rows.map((r) => r.map((x) => x.label))).toEqual([['1', '2'], ['열기'], ['바꾸기', '유지'], ['다시'], ['3']]);
  });
});
