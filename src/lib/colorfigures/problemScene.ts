import { BOARD, CERAMIC, INK, PALS, PX, board, box, ellUV, on, rectUV, shape, tone, tx, type Vec3 } from './core';
import { PROBLEMS, type ProblemKind } from './problem';
import { koreanLabels } from './fonts';

export const PROBLEM_SIZE: Vec3 = [32, 150, 70];

/** 기존 실험의 재료만 놓은 닫힌 판. 결과·이론값·처리 순서는 아직 적지 않는다. */
export function problemScene(kind: ProblemKind): string {
  let out = board(0, 0, 32, 150, 3, 5, BOARD);
  const material = PROBLEMS[kind].materials;
  for (const [i, label] of material.entries()) {
    const y0 = 8 + i * 72, y1 = y0 + 62;
    out += box(8, y0, 3, 20, y1, 64, i === 0 ? PALS.mint : PALS.cobalt, tone);
    out += shape(on(PX(20.05), rectUV(y0 + 4, 10, y1 - 4, 57)), CERAMIC.l);
    out += tx(20.1, (y0 + y1) / 2, 49, label, 6.2, INK);
    if (kind === 'monteCarlo' && i === 0) {
      out += shape(on(PX(20.1), rectUV(y0 + 17, 12, y0 + 45, 40)), CERAMIC.l);
      out += shape(on(PX(20.2), ellUV(y0 + 31, 26, 14, 14, 48)), PALS.mustard.l);
    }
  }
  return koreanLabels(out);
}
