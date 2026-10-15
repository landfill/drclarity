export interface Example { id: string; text: string; rainy: boolean; label: 0 | 1 }
/** Author-created data. Label=1 means packing an umbrella; no real model measurement. */
export const TRAIN: readonly Example[] = [
  { id: 'train-1', text: '비 오는 월요일', rainy: true, label: 1 },
  { id: 'train-2', text: '비 오는 화요일', rainy: true, label: 1 },
  { id: 'train-3', text: '비 오지만 실내에서 쉬는 수요일', rainy: true, label: 0 },
  { id: 'train-4', text: '맑은 목요일', rainy: false, label: 0 },
  { id: 'train-5', text: '맑은 금요일', rainy: false, label: 0 },
  { id: 'train-6', text: '맑은 토요일', rainy: false, label: 0 },
];
export const HELD_OUT: readonly Example[] = [
  { id: 'eval-1', text: '비 오는 일요일', rainy: true, label: 1 },
  { id: 'eval-2', text: '비 오는 휴일', rainy: true, label: 1 },
  { id: 'eval-3', text: '맑은 봄날', rainy: false, label: 0 },
  { id: 'eval-4', text: '맑은 가을날', rainy: false, label: 0 },
];
export type Predictor = (example: Example) => 0 | 1;
/** Fit only the provided training set. Unseen text defaults to label 0. */
export function fitMemory(training: readonly Example[]): Predictor {
  const memory = new Map(training.map(e => [e.text, e.label]));
  return e => memory.get(e.text) ?? 0;
}
/** Fit majority label separately for rainy=true/false; ties default to 0. */
export function fitRule(training: readonly Example[]): Predictor {
  const majority = (rainy: boolean): 0 | 1 => {
    const group = training.filter(e => e.rainy === rainy);
    return group.reduce((sum, e) => sum + e.label, 0) > group.length / 2 ? 1 : 0;
  };
  const wet = majority(true), dry = majority(false);
  return e => e.rainy ? wet : dry;
}
export function score(predict: Predictor, examples: readonly Example[]): number {
  return examples.filter(e => predict(e) === e.label).length;
}
