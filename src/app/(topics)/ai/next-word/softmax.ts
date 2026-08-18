/**
 * 다음 단어 후보 하나.
 *
 * logit 은 모델이 정규화하기 전에 내놓는 점수다. 값 자체에는 의미가 없고
 * 후보들 사이의 차이만 의미가 있다 — 전부 같은 수를 더해도 확률은 변하지 않는다.
 */
export interface Candidate {
  word: string;
  logit: number;
}

export interface Prompt {
  id: string;
  /** 화면에 보여줄 문장 앞부분. */
  text: string;
  /** 이 문맥이 왜 흥미로운지 한 줄. */
  note: string;
  candidates: Candidate[];
}

/**
 * temperature 를 적용한 softmax.
 *
 * `p_i = exp(logit_i / T) / Σ exp(logit_j / T)`
 *
 * T 가 작으면 큰 logit 이 지수적으로 더 커져 1등이 독식하고, T 가 크면 차이가
 * 눌려 분포가 평평해진다. T → 0 은 argmax, T → ∞ 는 균등분포가 극한이다.
 */
export function applyTemperature(logits: number[], temperature: number): number[] {
  if (logits.length === 0) return [];

  // T <= 0 이면 나눗셈이 정의되지 않는다. 극한값(argmax 독식)으로 대체한다.
  // 최댓값이 여럿이면 그들끼리 균등하게 나눈다 — 하나를 임의로 고르면 순서에
  // 따라 결과가 달라진다.
  if (temperature <= 0) {
    const max = Math.max(...logits);
    const winners = logits.filter(l => l === max).length;
    return logits.map(l => (l === max ? 1 / winners : 0));
  }

  const scaled = logits.map(l => l / temperature);
  // exp 오버플로 방지. 모든 항에서 같은 수를 빼도 softmax 결과는 바뀌지 않는다.
  const max = Math.max(...scaled);
  const exps = scaled.map(s => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

/**
 * 확률 분포에서 하나를 뽑는다.
 *
 * 난수를 인자로 받는다. 내부에서 Math.random 을 부르면 테스트가 불가능해지고,
 * 같은 화면을 두 번 그릴 때 결과가 달라진다.
 *
 * @param r [0, 1) 범위의 난수
 */
export function sampleFrom(probs: number[], r: number): number {
  let acc = 0;
  for (let i = 0; i < probs.length; i += 1) {
    acc += probs[i];
    if (r < acc) return i;
  }
  // 누적합이 부동소수점 오차로 1 에 미치지 못한 경우. 마지막 후보로 보낸다.
  return probs.length - 1;
}

/**
 * 분포가 얼마나 퍼져 있는지를 비트로 잰다 (섀넌 엔트로피).
 *
 * 0 비트면 답이 하나로 정해진 상태, log2(n) 비트면 n 개가 완전히 균등한 상태다.
 * temperature 를 올릴 때 "평평해진다"는 말을 숫자로 확인하는 용도다.
 * 꿀통 문제(math/honey-pots)의 정보량과 같은 단위다.
 */
export function entropyBits(probs: number[]): number {
  return -probs.reduce((sum, p) => (p > 0 ? sum + p * Math.log2(p) : sum), 0);
}

/** 예시 문맥. 실제 모델을 호출하지 않고 손으로 정한 값이다. */
export const PROMPTS: Prompt[] = [
  {
    id: 'weather',
    text: '오늘 날씨가 정말',
    note: '여러 답이 다 자연스러운 문맥입니다. 후보가 넓게 퍼져 있습니다.',
    candidates: [
      { word: '좋다', logit: 3.1 },
      { word: '춥다', logit: 2.7 },
      { word: '덥다', logit: 2.4 },
      { word: '이상하다', logit: 1.8 },
      { word: '포근하다', logit: 1.2 },
      { word: '맑다', logit: 0.9 },
    ],
  },
  {
    id: 'arithmetic',
    text: '1 + 1 =',
    note: '답이 사실상 하나뿐인 문맥입니다. temperature 를 올려야 비로소 흔들립니다.',
    candidates: [
      { word: '2', logit: 8.0 },
      { word: '3', logit: 1.1 },
      { word: '11', logit: 0.8 },
      { word: '0', logit: 0.2 },
    ],
  },
  {
    id: 'story',
    text: '깊은 숲속에서 그는 낡은 문을',
    note: '이야기를 여는 문맥입니다. 어느 쪽으로 가도 말이 됩니다.',
    candidates: [
      { word: '열었다', logit: 2.9 },
      { word: '발견했다', logit: 2.8 },
      { word: '두드렸다', logit: 2.5 },
      { word: '지나쳤다', logit: 1.9 },
      { word: '바라보았다', logit: 1.7 },
      { word: '밀었다', logit: 1.4 },
    ],
  },
];
