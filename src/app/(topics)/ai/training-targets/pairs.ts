/** 설명용 조각. 실제 토크나이저의 분할 결과가 아니다. */
export const PIECES = ['오늘은', '따뜻한', '차를', '마신다', '.'] as const;

/** 정답 위치 직전까지만 입력에 넣는다. 정답과 그 뒤 문맥은 제외한다. */
export function makeNextTokenPair(pieces: readonly string[], targetIndex: number) {
  if (!Number.isInteger(targetIndex) || targetIndex < 1 || targetIndex >= pieces.length) {
    throw new RangeError('정답 위치는 두 번째 조각부터 마지막 조각 사이여야 합니다.');
  }
  return { input: pieces.slice(0, targetIndex), target: pieces[targetIndex] };
}
