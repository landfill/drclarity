/**
 * 정렬 알고리즘을 제너레이터로 쪼갠 순수 로직.
 *
 * 한 스텝씩 뽑아 쓸 수 있어야 일시정지·단계 진행이 공짜로 얻어지고,
 * 렌더링 없이 끝까지 돌려 비교/이동 횟수를 세는 테스트가 가능해진다.
 *
 * 제너레이터는 넘겨받은 배열을 **제자리에서** 바꾼다. 스텝마다 배열 사본을
 * 만들면 n=200 버블 정렬에서만 수만 개의 사본이 생기므로, 화면은 살아 있는
 * 배열을 그대로 읽는다.
 */

export type SortStepKind = 'compare' | 'swap' | 'overwrite';

export interface SortStep {
  kind: SortStepKind;
  /** 이번 스텝에서 건드린 자리. 화면에서 강조한다. */
  indices: number[];
}

export type SortGenerator = Generator<SortStep, void, void>;
export type SortAlgorithm = (arr: number[]) => SortGenerator;

export interface SortCounters {
  compares: number;
  /** 배열에 실제로 값을 쓴 횟수. 교환 1회는 쓰기 2회로 센다. */
  writes: number;
}

/** 스텝 하나가 더하는 쓰기 횟수. */
export function writesOf(step: SortStep): number {
  if (step.kind === 'swap') return 2;
  if (step.kind === 'overwrite') return 1;
  return 0;
}

function swap(arr: number[], i: number, j: number): void {
  const temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;
}

/**
 * 버블 정렬. **조기 종료가 있는 형태**다.
 *
 * 한 번 훑는 동안 교환이 하나도 없으면 이미 정렬된 것이므로 멈춘다.
 * 이 최적화가 없으면 어떤 입력에서도 Θ(n²)이라, "거의 정렬된 배열에서는
 * 버블이 이긴다"는 이 주제의 반전이 성립하지 않는다.
 */
export function* bubbleSort(arr: number[]): SortGenerator {
  for (let end = arr.length - 1; end > 0; end -= 1) {
    let swapped = false;

    for (let i = 0; i < end; i += 1) {
      yield { kind: 'compare', indices: [i, i + 1] };
      if (arr[i] > arr[i + 1]) {
        swap(arr, i, i + 1);
        swapped = true;
        yield { kind: 'swap', indices: [i, i + 1] };
      }
    }

    if (!swapped) return;
  }
}

/**
 * 병합 정렬. 재귀 대신 **상향식(bottom-up)** 으로 짠다.
 *
 * 재귀 제너레이터를 yield* 로 이으면 스텝 하나를 꺼낼 때마다 중첩된 제너레이터
 * 전체를 통과해야 한다. 상향식은 그런 중첩이 없고 폭 1부터 두 배씩 넓혀갈 뿐이다.
 *
 * 보조 버퍼로 병합한 뒤 원래 배열에 되쓴다. 쓰기 횟수는 화면에 보이는 배열에
 * 실제로 값이 들어간 횟수만 센다.
 */
export function* mergeSort(arr: number[]): SortGenerator {
  const n = arr.length;
  const buffer = new Array<number>(n);

  for (let width = 1; width < n; width *= 2) {
    for (let left = 0; left < n - width; left += width * 2) {
      const middle = left + width;
      const right = Math.min(left + width * 2, n);

      let i = left;
      let j = middle;
      let out = left;

      while (i < middle && j < right) {
        yield { kind: 'compare', indices: [i, j] };
        if (arr[i] <= arr[j]) {
          buffer[out] = arr[i];
          i += 1;
        } else {
          buffer[out] = arr[j];
          j += 1;
        }
        out += 1;
      }

      while (i < middle) {
        buffer[out] = arr[i];
        i += 1;
        out += 1;
      }
      while (j < right) {
        buffer[out] = arr[j];
        j += 1;
        out += 1;
      }

      for (let k = left; k < right; k += 1) {
        arr[k] = buffer[k];
        yield { kind: 'overwrite', indices: [k] };
      }
    }
  }
}

/**
 * 퀵 정렬. **마지막 원소를 피벗으로 쓰는 Lomuto 분할**이다.
 *
 * 피벗을 이렇게 고르면 이미 정렬된 입력과 역순 입력에서 분할이 한쪽으로만
 * 쏠려 Θ(n²)이 된다. 중앙값이나 무작위 피벗을 쓰면 역순은 최악이 아니게 되므로,
 * 이 주제가 보여주려는 "역순에서 퀵이 무너진다"는 장면도 사라진다.
 *
 * 재귀 대신 명시적 스택을 쓴다. 역순 n=200이면 재귀 깊이가 200까지 가는데,
 * 그만큼 제너레이터가 중첩되면 스텝 하나 꺼내는 비용이 그 깊이에 비례한다.
 */
export function* quickSort(arr: number[]): SortGenerator {
  const stack: [number, number][] = [[0, arr.length - 1]];

  while (stack.length > 0) {
    const [low, high] = stack.pop() as [number, number];
    if (low >= high) continue;

    const pivot = arr[high];
    let boundary = low;

    for (let i = low; i < high; i += 1) {
      yield { kind: 'compare', indices: [i, high] };
      if (arr[i] < pivot) {
        if (i !== boundary) {
          swap(arr, i, boundary);
          yield { kind: 'swap', indices: [i, boundary] };
        }
        boundary += 1;
      }
    }

    if (boundary !== high) {
      swap(arr, boundary, high);
      yield { kind: 'swap', indices: [boundary, high] };
    }

    // 큰 쪽을 먼저 쌓아 작은 쪽부터 처리한다. 스택이 깊어지는 것을 줄인다.
    stack.push([low, boundary - 1]);
    stack.push([boundary + 1, high]);
  }
}

export type AlgorithmId = 'bubble' | 'merge' | 'quick';

export interface AlgorithmSpec {
  id: AlgorithmId;
  label: string;
  complexity: string;
  sort: SortAlgorithm;
}

export const ALGORITHMS: AlgorithmSpec[] = [
  { id: 'bubble', label: '버블 정렬', complexity: '평균 O(n²)', sort: bubbleSort },
  { id: 'merge', label: '병합 정렬', complexity: '항상 O(n log n)', sort: mergeSort },
  { id: 'quick', label: '퀵 정렬', complexity: '평균 O(n log n) · 최악 O(n²)', sort: quickSort },
];

export type InputPattern = 'random' | 'nearly-sorted' | 'reversed';

export type Rng = () => number;

/** 정렬할 배열을 만든다. 값은 항상 1..n 이라 막대 높이 비교가 일관된다. */
export function makeInput(n: number, pattern: InputPattern, rng: Rng = Math.random): number[] {
  const arr = Array.from({ length: n }, (_, index) => index + 1);
  // 원소가 둘 미만이면 어떤 패턴이든 결과가 같고, 자리를 뒤섞을 수도 없다.
  if (n < 2) return arr;

  if (pattern === 'reversed') return arr.reverse();

  if (pattern === 'nearly-sorted') {
    // 전체의 5% 정도만 어긋뜨린다. 버블의 조기 종료가 살아나는 구간이다.
    const swaps = Math.max(1, Math.round(n * 0.05));
    for (let k = 0; k < swaps; k += 1) {
      const i = Math.min(n - 2, Math.floor(rng() * (n - 1)));
      swap(arr, i, i + 1);
    }
    return arr;
  }

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    swap(arr, i, j);
  }
  return arr;
}

/** 제너레이터를 끝까지 돌려 최종 배열과 횟수를 얻는다. 테스트와 즉시 실행용. */
export function runToCompletion(
  algorithm: SortAlgorithm,
  input: number[],
): { sorted: number[]; counters: SortCounters } {
  const arr = [...input];
  const counters: SortCounters = { compares: 0, writes: 0 };

  for (const step of algorithm(arr)) {
    if (step.kind === 'compare') counters.compares += 1;
    counters.writes += writesOf(step);
  }

  return { sorted: arr, counters };
}
