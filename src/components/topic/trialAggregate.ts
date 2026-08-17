/**
 * TrialRunner 의 집계 로직. 컴포넌트에서 떼어내 테스트 가능하게 둔다.
 *
 * 한 번의 시행이 여러 버킷에 동시에 해당할 수 있다는 것이 이 모듈의 핵심이다.
 * 예: 몬티 홀 한 판은 '바꾸기 승'과 '유지 패'를 함께 결정하므로,
 * 두 전략을 비교하려고 시행을 따로 돌릴 필요가 없다.
 */

export type BucketCounts = Record<string, number>;

/** 시행 결과 하나가 속하는 버킷 키. 여러 개면 배열. */
export type BucketsOf<R> = (result: R) => string | string[];

/** 결과 목록을 버킷별 증분으로 환원한다. knownIds 에 없는 키는 버린다. */
export function countBuckets<R>(
  results: readonly R[],
  bucketsOf: BucketsOf<R>,
  knownIds?: readonly string[],
): BucketCounts {
  const allowed = knownIds ? new Set(knownIds) : null;
  const counts: BucketCounts = {};

  for (const result of results) {
    const keys = bucketsOf(result);
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const key of keyList) {
      if (allowed && !allowed.has(key)) continue;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  return counts;
}

/** 누적 집계에 증분을 더한다. 원본은 건드리지 않는다. */
export function mergeBucketCounts(previous: BucketCounts, delta: BucketCounts): BucketCounts {
  const merged: BucketCounts = { ...previous };
  for (const [key, value] of Object.entries(delta)) {
    merged[key] = (merged[key] ?? 0) + value;
  }
  return merged;
}

/**
 * 시행 횟수 표기. 로케일을 고정한다.
 *
 * toLocaleString() 을 인자 없이 쓰면 서버와 브라우저의 로케일이 달라
 * 천 단위 구분자가 엇갈리고(10,000 vs 10.000), 프리렌더링된 버튼 문구가
 * 하이드레이션 불일치를 낸다.
 */
export function formatCount(value: number): string {
  return value.toLocaleString('ko-KR');
}

/** 비율을 백분율 문자열로. 시행이 0회면 '—'. */
export function formatRate(count: number, total: number): string {
  if (total === 0) return '—';
  return `${((count / total) * 100).toFixed(1)}%`;
}
