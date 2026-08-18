/**
 * 색 섞기 비유. 각 성분은 0~1 이다.
 *
 * 8비트 정수(0~255)로 들고 있으면 섞을 때마다 반올림이 끼어들어 섞는 순서에 따라
 * 값이 어긋난다. 이 비유의 전부가 "순서가 달라도 같은 색에 도달한다"는 것이므로
 * 계산은 실수로 하고 반올림은 화면에 그릴 때 한 번만 한다.
 */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * 두 색을 섞는다. 성분별 곱셈이다 — 물감을 섞듯 어두워지는 감산 혼합.
 *
 * 평균((a+b)/2)이 아니라 곱셈인 것이 핵심이다. 평균은 교환법칙은 만족하지만
 * 결합법칙이 깨진다: mix(mix(base, a), b) 는 b 를 절반이나 반영하는 반면
 * mix(mix(base, b), a) 는 a 를 절반 반영해서, 두 사람이 서로 다른 색에 도달한다.
 * 곱셈은 base·a·b 로 순서에 무관하게 같은 곳에 도달한다.
 */
export function mix(a: Rgb, b: Rgb): Rgb {
  return { r: a.r * b.r, g: a.g * b.g, b: a.b * b.b };
}

/** 0~1 성분을 CSS 색 문자열로. 반올림은 여기서만 일어난다. */
export function toCssColor(color: Rgb): string {
  const channel = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return `rgb(${channel(color.r)}, ${channel(color.g)}, ${channel(color.b)})`;
}

/**
 * 스와치 위에 올릴 글자색. 밝은 색에는 어두운 글자, 어두운 색에는 흰 글자.
 * 곱셈 혼합은 섞을수록 어두워져서 고정 글자색으로는 대비가 무너진다.
 */
export function readableTextColor(color: Rgb): string {
  // ITU-R BT.709 상대 휘도. 감마 보정은 생략한다 — 여기서는 밝고 어두움의
  // 갈림만 정하면 되고, 경계에 걸치는 색을 쓰지 않는다.
  const luminance = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  return luminance > 0.55 ? '#2d3436' : '#ffffff';
}

/**
 * 도청자가 자기가 들은 색만으로 공유 색을 되계산한다.
 *
 * 도청자는 공개 색 P, 앨리스가 보낸 P·a, 밥이 보낸 P·b 를 안다. 셋을 곱하고
 * 나누면 (P·a)(P·b)/P = P·a·b 로 공유 색이 그대로 나온다. 즉 **색 섞기 비유는
 * 실제로는 안전하지 않다**. 이 함수는 그 사실을 화면에서 직접 보여주기 위한
 * 것이고, 그래서 진짜 안전성이 왜 모듈러 거듭제곱에서 와야 하는지가 성립한다.
 *
 * base 의 성분이 0 이면 나눌 수 없다. 공개 색은 성분이 모두 0 보다 크도록
 * 골라 두었지만, 방어적으로 0 을 만나면 그 성분은 0 으로 둔다.
 */
export function eavesdropperRecovery(base: Rgb, sentByA: Rgb, sentByB: Rgb): Rgb {
  const divide = (numerator: number, denominator: number) =>
    denominator === 0 ? 0 : Math.min(1, numerator / denominator);

  const combined = mix(sentByA, sentByB);
  return {
    r: divide(combined.r, base.r),
    g: divide(combined.g, base.g),
    b: divide(combined.b, base.b),
  };
}

/** 모두가 보는 공개 색. 성분이 모두 0 보다 커야 한다 (eavesdropperRecovery 참고). */
export const PUBLIC_COLOR: Rgb = { r: 1, g: 0.898, b: 0.588 };

export interface SecretColorOption {
  id: string;
  label: string;
  color: Rgb;
}

/**
 * 고를 수 있는 비밀 색. 곱셈 혼합은 섞을수록 어두워지므로 밝은 색만 둔다.
 * 어두운 색을 넣으면 세 번 섞은 결과가 검정에 가까워져 구분이 되지 않는다.
 */
export const SECRET_COLORS: SecretColorOption[] = [
  { id: 'sky', label: '하늘색', color: { r: 0.529, g: 0.808, b: 1 } },
  { id: 'rose', label: '분홍색', color: { r: 1, g: 0.651, b: 0.749 } },
  { id: 'lime', label: '연둣빛', color: { r: 0.702, g: 0.949, b: 0.549 } },
  { id: 'lilac', label: '연보라', color: { r: 0.784, g: 0.706, b: 1 } },
];

/** id 로 비밀 색을 찾는다. 없으면 첫 번째를 돌려준다 — 화면이 비는 것보다 낫다. */
export function findSecretColor(id: string): SecretColorOption {
  return SECRET_COLORS.find(option => option.id === id) ?? SECRET_COLORS[0];
}
