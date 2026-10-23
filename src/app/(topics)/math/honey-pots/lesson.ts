import { ANT_BITS, ANT_LABELS, ANT_COUNT, POT_COUNT, decodeDeadAnts, toBinary5 } from './binary';

export type LessonMode = 'grid' | 'groups' | 'codes' | 'signature' | 'encoding' | 'simulation' | 'summary';

export interface LessonState {
  antCount: number;
  group: number;
  note: string;
}

export const initialLesson = (): LessonState => ({ antCount: 1, group: 0, note: '' });
/** 새 장면들은 정적인 비교 그림이다. 시간을 흘려도 상태는 변하지 않는다. */
export const advanceLesson = (s: LessonState): LessonState => s;
export const lessonIsSettled = (): boolean => true;
/** 결과 세기에서 지금 받아들일 수 있는 다음 버튼. */
export const nextAction = (s: LessonState): 'add' | 'reset' => s.antCount < ANT_COUNT ? 'add' : 'reset';

/** 개미 한 마리를 더해 가능한 생사 결과를 두 배로 늘린다. */
export function addAnt(s: LessonState): LessonState {
  if (s.antCount >= ANT_COUNT) return { ...s, note: '다섯 마리까지 모았습니다. 처음으로 돌아가 다시 비교할 수 있습니다.' };
  return { ...s, antCount: s.antCount + 1, note: '' };
}

/** 그룹 선택은 서로 겹치지 않는 연속된 다섯 통을 가리킨다. */
export const groupPots = (group: number): number[] => Array.from({ length: 5 }, (_, i) => group * 5 + i + 1);
/** n마리의 모든 결과를 생존=0, 사망=1의 이름표로 나열한다. */
export const outcomeCodes = (n: number): string[] => Array.from({ length: 2 ** n }, (_, i) => i.toString(2).padStart(n, '0'));

/** 판독 번호가 1~25 범위에 있을 때만 실제 꿀통을 지목한다. */
export function readResult(deadBits: readonly number[]) {
  const sum = decodeDeadAnts(deadBits);
  const pot = sum >= 1 && sum <= POT_COUNT ? sum : null;
  const code = toBinary5(sum);
  const expression = ANT_BITS.filter(bit => deadBits.includes(bit)).join(' + ') || '0';
  const note = pot !== null
    ? `${expression} = ${sum}. 이름표 ${code}에 해당하는 ${pot}번 꿀통이 가짜입니다.`
    : sum === 0
      ? '모두 생존한 00000입니다. 현재 1~25번 배정에서는 모든 꿀통을 적어도 한 마리가 마시므로 나오지 않는 결과입니다.'
      : `${code} = ${sum}입니다. 이 문제에는 25번까지만 있으므로 나오지 않는 결과입니다.`;
  return { sum, pot, code, note };
}

/** 컵과 이름표를 설명할 때 같은 A~E 순서를 쓴다. */
export const antNamesFor = (pot: number): string => ANT_BITS.flatMap((bit, i) => pot & bit ? [ANT_LABELS[i]] : []).join('·');
