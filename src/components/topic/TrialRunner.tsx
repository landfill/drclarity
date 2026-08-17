'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import {
  countBuckets,
  formatCount,
  formatRate,
  mergeBucketCounts,
  type BucketCounts,
  type BucketsOf,
} from './trialAggregate';
import styles from './TrialRunner.module.css';

/** 집계 막대 하나. 이론값을 주면 실측과 나란히 비교된다. */
export interface TrialBucket {
  /** bucketsOf 가 돌려주는 키와 같아야 한다. */
  id: string;
  label: string;
  /** 0~1. 주면 막대 위에 이론값 눈금과 오차가 표시된다. */
  theoretical?: number;
  /** 강조 색. 기본은 secondary. */
  tone?: 'primary' | 'secondary';
}

export interface TrialRunnerProps<R> {
  /** 1회 시행. 순수 함수로 유지해 테스트 가능하게 한다. */
  runTrial: () => R;
  /**
   * 결과를 집계 버킷 키로 환원한다.
   *
   * 배열을 돌려줄 수 있다. 한 번의 시행이 여러 버킷에 동시에 해당하는 경우
   * (예: 몬티 홀 한 판이 '바꾸기 승'과 '유지 패'를 함께 결정한다)
   * 시행을 따로 돌리지 않고 같은 표본을 공유하기 위해서다.
   */
  bucketsOf: BucketsOf<R>;
  /** 표시할 버킷. 여기에 없는 키는 집계에서 무시된다. */
  buckets: TrialBucket[];
  /** 실행 횟수 프리셋. */
  presets?: number[];
  /** 회차별 시각화가 필요한 주제를 위한 렌더 훅. 주면 개별 결과를 보관한다. */
  renderProgress?: (results: R[]) => React.ReactNode;
  labels?: { run?: string; reset?: string; total?: string };
}

const DEFAULT_PRESETS = [1, 10, 100, 1000];
/** 한 프레임에 처리할 시행 수. 1,000회를 17프레임 정도에 나눠 담는다. */
const TRIALS_PER_FRAME = 60;

export function TrialRunner<R>({
  runTrial,
  bucketsOf,
  buckets,
  presets = DEFAULT_PRESETS,
  renderProgress,
  labels,
}: TrialRunnerProps<R>) {
  const runLabel = labels?.run ?? '회 실행';
  const resetLabel = labels?.reset ?? '초기화';
  const totalLabel = labels?.total ?? '누적 시행';

  const [counts, setCounts] = useState<BucketCounts>({});
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<R[]>([]);
  /** 방금 끝난 실행의 요약. 실행 중에는 비워 두어 라이브 리전이 매 프레임 떠들지 않게 한다. */
  const [announcement, setAnnouncement] = useState('');

  /*
   * 남은 시행 수와 이번 실행의 총량은 state 가 아니라 ref 다. tick 이 state 를 읽으면
   * 매 프레임 tick 의 정체성이 바뀌어 useAnimationFrame 의 deps 가 흔들리고,
   * 훅이 프레임마다 rAF 를 취소·재등록하게 된다. remaining state 는 화면 표시 전용이다.
   */
  const remainingRef = useRef(0);
  const runCountRef = useRef(0);
  // 실행 루프가 항상 최신 콜백을 쓰도록 ref 로 넘긴다.
  const runTrialRef = useRef(runTrial);
  const bucketsOfRef = useRef(bucketsOf);
  const bucketIdsRef = useRef(buckets.map((bucket) => bucket.id));
  const collectResults = renderProgress != null;
  const collectResultsRef = useRef(collectResults);

  useEffect(() => {
    runTrialRef.current = runTrial;
    bucketsOfRef.current = bucketsOf;
    bucketIdsRef.current = buckets.map((bucket) => bucket.id);
    collectResultsRef.current = collectResults;
  }, [buckets, bucketsOf, collectResults, runTrial]);

  /** 시행 batchSize 회를 실제로 돌리고 집계 델타를 만든다. */
  const runBatch = useCallback((batchSize: number) => {
    const batchResults: R[] = [];
    for (let i = 0; i < batchSize; i += 1) {
      batchResults.push(runTrialRef.current());
    }

    const delta = countBuckets(batchResults, bucketsOfRef.current, bucketIdsRef.current);
    setCounts((prev) => mergeBucketCounts(prev, delta));
    setTotal((prev) => prev + batchSize);

    // 개별 결과는 렌더 훅이 있을 때만 보관한다. 누적 모드에서 전부 들고 있으면
    // 1,000회를 여러 번 돌릴수록 메모리만 먹는다.
    if (collectResultsRef.current && batchResults.length > 0) {
      setResults((prev) => [...prev, ...batchResults]);
    }
  }, []);

  const announce = useCallback(
    (runCount: number) => {
      setAnnouncement(`${formatCount(runCount)}회 실행을 마쳤습니다.`);
    },
    [],
  );

  /** 이번 실행을 끝내고 루프를 내린다. */
  const finish = useCallback(() => {
    remainingRef.current = 0;
    setRemaining(0);
    setIsRunning(false);
    announce(runCountRef.current);
  }, [announce]);

  const tick = useCallback(
    (_elapsedMs: number, progress: number) => {
      // 'infinite' 모드에서 progress 는 늘 0이다. 1이 오는 경우는
      // prefers-reduced-motion 이라 훅이 콜백을 한 번만 부르는 상황뿐이다.
      // 그때는 배치로 나누지 않고 남은 시행을 전부 돌린 뒤 최종 수치만 보여준다.
      if (progress === 1) {
        runBatch(remainingRef.current);
        finish();
        return;
      }

      const batchSize = Math.min(TRIALS_PER_FRAME, remainingRef.current);
      runBatch(batchSize);
      remainingRef.current -= batchSize;

      if (remainingRef.current > 0) {
        setRemaining(remainingRef.current);
      } else {
        finish();
      }
    },
    [finish, runBatch],
  );

  /*
   * 루프의 종료 조건은 시간이 아니라 시행 소진이므로 duration 은 'infinite' 다.
   * 정지는 콜백을 null 로 내려 훅의 cleanup 이 rAF 를 취소하게 한다.
   * isRunning 이 deps 에 없으면 다음 실행에서 루프가 다시 시작되지 않는다.
   */
  useAnimationFrame(isRunning ? tick : null, 'infinite', [isRunning, tick]);

  const start = useCallback(
    (runCount: number) => {
      if (isRunning) return;
      setAnnouncement('');
      runCountRef.current = runCount;

      // 한 프레임에 담기는 양이면 루프를 띄우지 않고 즉시 끝낸다.
      if (runCount <= TRIALS_PER_FRAME) {
        runBatch(runCount);
        remainingRef.current = 0;
        setRemaining(0);
        announce(runCount);
        return;
      }

      remainingRef.current = runCount;
      setRemaining(runCount);
      setIsRunning(true);
    },
    [announce, isRunning, runBatch],
  );

  const reset = useCallback(() => {
    // 실행 중에도 초기화 버튼은 열려 있다. 남은 시행을 함께 비우지 않으면
    // 다음 실행이 이전 실행의 잔량을 물려받는다.
    remainingRef.current = 0;
    runCountRef.current = 0;
    setIsRunning(false);
    setCounts({});
    setTotal(0);
    setRemaining(0);
    setResults([]);
    setAnnouncement('집계를 초기화했습니다.');
  }, []);

  return (
    <section className={styles.runner} aria-label="반복 시뮬레이션">
      <div className={styles.toolbar}>
        <div className={styles.presetGroup}>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={styles.runButton}
              onClick={() => start(preset)}
              disabled={isRunning}
            >
              {formatCount(preset)}
              {runLabel}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.resetButton}
          onClick={reset}
          disabled={total === 0 && !isRunning}
        >
          {resetLabel}
        </button>
      </div>

      {/* 실행 전에도 무엇을 재는지, 이론값이 얼마인지 알 수 있어야 한다. 갱신되지 않는
          정적 설명이므로 라이브 리전이 아니다. */}
      <p className={styles.srOnly}>
        {`측정 항목: ${buckets
          .map((bucket) =>
            bucket.theoretical === undefined
              ? bucket.label
              : `${bucket.label} (이론값 ${(bucket.theoretical * 100).toFixed(1)}%)`,
          )
          .join(', ')}.`}
      </p>

      <p className={styles.total} aria-hidden="true">
        {totalLabel} <strong>{formatCount(total)}</strong>회
        {isRunning && <span className={styles.progress}> · {formatCount(remaining)}회 남음</span>}
      </p>

      <ul className={styles.bucketList} aria-hidden="true">
        {buckets.map((bucket) => {
          const count = counts[bucket.id] ?? 0;
          const ratio = total === 0 ? 0 : count / total;

          return (
            <li key={bucket.id} className={styles.bucket}>
              <div className={styles.bucketHead}>
                <span className={styles.bucketLabel}>{bucket.label}</span>
                <span className={styles.bucketValue}>
                  {formatRate(count, total)}
                  <span className={styles.bucketCount}> ({formatCount(count)}회)</span>
                </span>
              </div>

              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${bucket.tone === 'primary' ? styles.primary : styles.secondary}`}
                  style={{ width: `${ratio * 100}%` }}
                />
                {bucket.theoretical !== undefined && (
                  // .barTrack 이 overflow:hidden 이므로 눈금이 양 끝에서 잘린다.
                  // 위치와 같은 비율로 되밀어 0%·100% 에서도 트랙 안에 남게 한다.
                  <span
                    className={styles.theoreticalMark}
                    style={{
                      left: `${bucket.theoretical * 100}%`,
                      transform: `translateX(-${bucket.theoretical * 100}%)`,
                    }}
                  />
                )}
              </div>

              {bucket.theoretical !== undefined && (
                <p className={styles.theoreticalNote}>
                  이론값 {(bucket.theoretical * 100).toFixed(1)}%
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/*
        위 막대 목록은 aria-hidden 이다. 매 프레임 갱신되는 수치를 그대로 읽히면
        스크린 리더가 밀리기 때문이다. 대신 실행이 끝났을 때 여기서 한 번만
        요약을 내보내되, 목록에만 있던 이론값도 함께 담아야 한다.
        실측만 읽어주면 "이론값에 수렴한다"는 이 컴포넌트의 요점이 사라진다.
      */}
      <p role="status" aria-live="polite" className={styles.srOnly}>
        {announcement && total > 0
          ? `${announcement} 누적 ${formatCount(total)}회. ${buckets
              .map((bucket) => {
                const observed = `${bucket.label} ${formatRate(counts[bucket.id] ?? 0, total)}`;
                if (bucket.theoretical === undefined) return observed;
                return `${observed} (이론값 ${(bucket.theoretical * 100).toFixed(1)}%)`;
              })
              .join(', ')}.`
          : announcement}
      </p>

      {renderProgress?.(results)}
    </section>
  );
}
