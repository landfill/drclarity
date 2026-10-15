/** 정답 한 토큰의 음의 로그 확률. 자연로그를 사용하며 0은 +무한대다. */
export function nextTokenLoss(probability: number): number {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new RangeError('확률은 0과 1 사이의 유한한 수여야 합니다.');
  }
  return probability === 1 ? 0 : -Math.log(probability);
}
