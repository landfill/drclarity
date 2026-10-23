/*
 * 꿀통 수업의 정적인 비교 장면. 꿀통과 이름표는 같은 나무판 위에 놓인다.
 * 앞 단계에서는 가짜를 표시하지 않는다. 그룹은 다섯 통의 후보만 보여 주며,
 * 판독에서는 1~25에 해당할 때만 꿀통을 지목한다. 실제 배분 동작은 기존 dropperScene이 맡는다.
 */
import {
  BOARD, CERAMIC, CLEAR, DARK, PALS, WOOD, board, box, byDepth, cyl,
  ellUV, ink, line, on, pd, PZ, shape, tone, tx, type Mat, type Vec3,
} from '@/lib/colorfigures/core';
import { koreanLabels } from '@/lib/colorfigures/fonts';
import { ANT_BITS, ANT_LABELS, POT_COUNT, potsForAnt, toBinary5 } from './binary';
import { groupPots, outcomeCodes, readResult, type LessonMode, type LessonState } from './lesson';

export const GRID_SIZE: Vec3 = [190, 164, 24];
export const LABEL_SIZE: Vec3 = [58, 164, 38];
export const OUTCOMES_SIZE: Vec3 = [240, 164, 24];
const H = 3;

/** 번호가 앞면에 쓰인 꿀통. 강조는 후보·선택을 뜻하며 가짜라는 뜻은 아니다. */
function honeyPot(x: number, y: number, number: number, selected: boolean): string {
  const mat = selected ? PALS.mustard : CERAMIC;
  return cyl(x, y, H, 14, 7, mat, tone, 1)
    + cyl(x, y, 14, 16, 5.5, mat, tone, 0.8)
    + tx(x + 7, y, 6.5, String(number), 6);
}

/** 작은 개미. 몸과 다리는 받침 위에 있고, 사망 상태에서는 머리에 X를 쓴다. */
function ant(x: number, y: number, dead = false): string {
  let out = '';
  for (const side of [-1, 1]) {
    for (const d of [-2, 0, 2]) out += line([[x + d, y, 5], [x + d * 1.6, y + side * 3, 5], [x + d * 2, y + side * 4.5, H]], 0.8);
  }
  out += shape(on(PZ(6), ellUV(x + 4, y, 3.4, 2.6)), DARK.m);
  out += cyl(x, y, 4, 7, 1.6, DARK);
  out += cyl(x - 4, y, 4, 8, 2.3, DARK);
  for (const side of [-1, 1]) out += line([[x - 5, y + side, 7], [x - 8, y + side * 3, 8]], 0.8);
  if (dead) {
    out += line([[x - 6, y - 2, 9], [x - 2, y + 2, 9]], 1);
    out += line([[x - 6, y + 2, 9], [x - 2, y - 2, 9]], 1);
  }
  return out;
}

/** 컵별 보기의 혼합 컵. 선택한 컵에만 꿀을 그려 배분 대상과 대응시킨다. */
function mixingCup(x: number, y: number, active: boolean, name: string): string {
  let out = `<g opacity=".6">${cyl(x, y, H, 17, 6, CLEAR, tone)}</g>`;
  if (active) out += shape(on(PZ(5), ellUV(x, y, 4.5, 4.5)), PALS.mustard.l);
  out += ink(pd(on(PZ(17), ellUV(x, y, 6, 6))), 1);
  out += tx(x + 6, y, 8, name, 4.8);
  return out;
}

/** 5×5 꿀통. 그룹 보기의 행 구획과 컵별 보기의 혼합 컵도 같은 판 위에 놓는다. */
function potScene(mode: LessonMode, group: number, activeAntBit: number | null): string {
  const groupSet = new Set(groupPots(group));
  let out = board(0, 0, 190, 164, H, 5, WOOD);
  if (mode === 'groups') {
    for (let row = 0; row < 5; row++) {
      out += box(5 + row * 34, 5, H, 35 + row * 34, 159, H + 0.6, row === group ? PALS.mustard : BOARD);
    }
  }
  out += byDepth(Array.from({ length: POT_COUNT }, (_, i) => {
    const pot = i + 1;
    const x = 18 + Math.floor(i / 5) * 34;
    const y = 144 - (i % 5) * 30;
    const active = mode === 'groups' ? groupSet.has(pot) : mode === 'encoding' && activeAntBit !== null && (pot & activeAntBit) !== 0;
    return { at: [x, y, H] as Vec3, svg: honeyPot(x, y, pot, active) };
  }));
  for (let i = 0; i < 5; i++) {
    const y = 144 - i * 30;
    if (mode === 'groups') {
      const x = 18 + i * 34;
      out += ant(x, 158);
      out += tx(x + 8, 158, 10, ANT_LABELS[i], 4.5);
    } else if (mode === 'encoding') out += mixingCup(177, y, activeAntBit === ANT_BITS[i], ANT_LABELS[i]);
    else out += ant(177, y);
  }
  return out;
}

/** 물리적인 이름표 다섯 장. A~E를 비트 순서로 놓고 자릿값도 따로 새긴다. */
function labelScene(pot: number, deadBits: readonly number[] | null): string {
  let out = board(0, 0, 58, 164, H, 5, WOOD);
  const code = deadBits === null ? toBinary5(pot) : readResult(deadBits).code;
  for (let i = 0; i < 5; i++) {
    const y = 144 - i * 30;
    const included = code[i] === '1';
    out += box(18, y - 11, H, 21, y + 11, 35, included ? PALS.mustard : CERAMIC);
    out += tx(21, y, 28, ANT_LABELS[i], 5.5);
    out += tx(21, y, 16, code[i], 9);
    out += tx(21, y, 7, deadBits === null ? String(ANT_BITS[i]) : included ? '사망' : '생존', 4);
    out += ant(43, y, deadBits !== null && included);
  }
  return out;
}

/** 결과 이름표를 한 장씩 센다. 정리에서는 1~25에 배정한 것만 겨자색으로 표시한다. */
function outcomesScene(n: number, assigned: boolean): string {
  let out = board(0, 0, 240, 164, H, 5, WOOD);
  const cards = outcomeCodes(n);
  out += byDepth(cards.map((code, i) => {
    const x = 14 + Math.floor(i / 4) * 30;
    const y = 141 - (i % 4) * 39;
    const used = assigned && i >= 1 && i <= POT_COUNT;
    const material: Mat = used ? PALS.mustard : CERAMIC;
    return { at: [x, y, H] as Vec3, svg: box(x - 1, y - 16, H, x + 1, y + 16, 13, material)
      + tx(x + 1, y, 5, code, 6.2) };
  }));
  return out;
}

/** 단계에 해당하는 장면. 글자는 ColorFigure의 crispText 층에서 그린다. */
export function lessonScene(mode: LessonMode, s: LessonState, pot: number, activeAntBit: number | null, deadBits: readonly number[]): string {
  if (mode === 'codes' || mode === 'summary') return outcomesScene(mode === 'summary' ? 5 : s.antCount, mode === 'summary');
  if (mode === 'signature' || mode === 'simulation') return koreanLabels(labelScene(pot, mode === 'simulation' ? deadBits : null));
  return potScene(mode, s.group, activeAntBit);
}

/** 선택한 컵에 들어가는 여러 꿀통의 수. */
export const mixtureCount = (bit: number | null): number => bit === null ? 0 : potsForAnt(bit).length;
