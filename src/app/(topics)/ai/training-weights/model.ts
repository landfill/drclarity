/** Two-candidate teaching model: score(맑다)=weight*x; score(흐리다)=0. */
export const INITIAL_WEIGHT = -1;
export const INPUT = 1;
export const LEARNING_RATE = 1;
export function probability(weight: number, x = INPUT): number {
  return 1 / (1 + Math.exp(-weight * x));
}
/** Cross entropy for the fixed target 맑다 (label=1), stably evaluated. */
export function loss(weight: number, x = INPUT): number {
  const z = -weight * x;
  return Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z)));
}
/** One exact stochastic gradient descent update on this single example. */
export function step(weight: number, rate = LEARNING_RATE, x = INPUT): number {
  return weight - rate * (probability(weight, x) - 1) * x;
}
