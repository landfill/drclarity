'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { useAnimationFrame } from '@/hooks/useAnimationFrame';
import { InteractiveCanvasHandle } from '@/components/topic/InteractiveCanvas';
import { ParameterPanel, ParameterDefinition } from '@/components/topic/ParameterPanel';
import { SortLane } from './SortLane';
import { drawLane } from './laneRenderer';
import {
  ALGORITHMS,
  makeInput,
  writesOf,
  type AlgorithmId,
  type InputPattern,
  type SortCounters,
  type SortGenerator,
} from './sorting';
import NoteRules from './content/note-rules.mdx';
import WhyDifference, { title as whyTitle } from './content/why-difference.mdx';
import meta from './meta';
import styles from './SortingRace.module.css';

/**
 * 한 프레임에 진행할 스텝 수. **세 알고리즘 모두 같은 값을 쓴다.**
 * 그래야 걸리는 시간이 스텝 수에 그대로 비례해, 화면의 속도 차이가
 * 곧 알고리즘의 일량 차이가 된다.
 */
const STEPS_PER_FRAME = 60;
/** 카운터를 새로 그리는 주기(프레임). 매 프레임 갱신하면 숫자가 읽히지 않는다. */
const COUNTER_REFRESH_FRAMES = 6;

const SIZE_OPTIONS = [10, 50, 200];

const PATTERN_LABELS: Record<InputPattern, string> = {
  random: '무작위',
  'nearly-sorted': '거의 정렬됨',
  reversed: '역순',
};

const PATTERN_NOTES: Record<InputPattern, React.ReactNode> = {
  random: (
    <>
      가장 흔한 상황입니다. 버블 정렬이 나머지 둘에 견줄 수 없이 뒤처지는 것을 보게 됩니다.
    </>
  ),
  'nearly-sorted': (
    <>
      <strong>반전이 일어나는 설정입니다.</strong> 버블 정렬은 한 번 훑는 동안 교환이 없으면 멈추므로,
      거의 정렬된 배열에서는 비교 몇 번으로 끝납니다. 병합 정렬은 입력이 어떻든 늘 같은 일을 하므로
      여기서는 오히려 버블에 집니다.
    </>
  ),
  reversed: (
    <>
      <strong>퀵 정렬이 무너지는 설정입니다.</strong> 여기 구현은 맨 뒤 원소를 피벗으로 씁니다.
      역순 배열에서는 그 피벗이 항상 최솟값이라 분할이 한쪽으로만 쏠려, 평균 O(n log n)이던 퀵이
      버블과 같은 O(n²)로 떨어집니다.
    </>
  ),
};

interface LaneState {
  id: AlgorithmId;
  values: number[];
  generator: SortGenerator;
  counters: SortCounters;
  active: number[];
  done: boolean;
}

function createLanes(size: number, pattern: InputPattern): LaneState[] {
  // 세 알고리즘이 **같은 입력**을 받아야 비교가 성립한다.
  const input = makeInput(size, pattern);

  return ALGORITHMS.map((spec) => {
    const values = [...input];
    return {
      id: spec.id,
      values,
      generator: spec.sort(values),
      counters: { compares: 0, writes: 0 },
      active: [],
      done: false,
    };
  });
}

/** 레인 하나를 한 스텝 진행한다. 끝났으면 done 을 세운다. */
function stepLane(lane: LaneState): void {
  if (lane.done) return;

  const next = lane.generator.next();
  if (next.done) {
    lane.done = true;
    lane.active = [];
    return;
  }

  const step = next.value;
  if (step.kind === 'compare') lane.counters.compares += 1;
  lane.counters.writes += writesOf(step);
  lane.active = step.indices;
}

export default function SortingRaceClient() {
  const [size, setSize] = useState(50);
  const [pattern, setPattern] = useState<InputPattern>('random');
  const [running, setRunning] = useState(false);
  const [counters, setCounters] = useState<SortCounters[]>(() =>
    ALGORITHMS.map(() => ({ compares: 0, writes: 0 })),
  );
  const [doneFlags, setDoneFlags] = useState<boolean[]>(() => ALGORITHMS.map(() => false));
  const [announcement, setAnnouncement] = useState('');

  const lanesRef = useRef<LaneState[]>(createLanes(50, 'random'));
  const frameCountRef = useRef(0);
  const canvasRefs = useRef<(InteractiveCanvasHandle | null)[]>([]);

  const drawAll = useCallback(() => {
    lanesRef.current.forEach((lane, index) => {
      const ctx = canvasRefs.current[index]?.getContext();
      if (!ctx) return;
      drawLane(ctx, { values: lane.values, active: lane.active, done: lane.done });
    });
  }, []);

  /** 화면에 보이는 수치를 refs 의 실제 상태와 맞춘다. */
  const syncReadouts = useCallback(() => {
    setCounters(lanesRef.current.map((lane) => ({ ...lane.counters })));
    setDoneFlags(lanesRef.current.map((lane) => lane.done));
  }, []);

  const finish = useCallback(() => {
    setRunning(false);
    const summary = lanesRef.current
      .map((lane, index) => {
        const spec = ALGORITHMS[index];
        return `${spec.label} 비교 ${lane.counters.compares.toLocaleString('ko-KR')}회`;
      })
      .join(', ');
    setAnnouncement(`정렬이 모두 끝났습니다. ${summary}.`);
  }, []);

  const advance = useCallback((steps: number) => {
    for (let i = 0; i < steps; i += 1) {
      for (const lane of lanesRef.current) stepLane(lane);
    }
    return lanesRef.current.every((lane) => lane.done);
  }, []);

  const reset = useCallback(
    (nextSize: number, nextPattern: InputPattern) => {
      lanesRef.current = createLanes(nextSize, nextPattern);
      frameCountRef.current = 0;
      setRunning(false);
      setAnnouncement('');
      syncReadouts();
      drawAll();
    },
    [drawAll, syncReadouts],
  );

  const tick = useCallback(
    (_elapsedMs: number, progress: number) => {
      // 'infinite' 모드에서 progress 는 늘 0이다. 1이 오는 경우는
      // prefers-reduced-motion 이라 훅이 콜백을 한 번만 부르는 상황뿐이다.
      // 그때는 애니메이션 없이 끝까지 돌리고 최종 상태만 보여준다.
      if (progress === 1) {
        while (!advance(STEPS_PER_FRAME)) {
          // 끝날 때까지 진행한다. 스텝 수는 유한하다.
        }
        drawAll();
        syncReadouts();
        finish();
        return;
      }

      const allDone = advance(STEPS_PER_FRAME);
      drawAll();

      frameCountRef.current += 1;
      if (allDone || frameCountRef.current % COUNTER_REFRESH_FRAMES === 0) {
        syncReadouts();
      }
      if (allDone) finish();
    },
    [advance, drawAll, finish, syncReadouts],
  );

  /*
   * 루프의 종료 조건은 시간이 아니라 스텝 소진이므로 duration 은 'infinite' 다.
   * 일시정지는 콜백을 null 로 내려 훅의 cleanup 이 rAF 를 취소하게 한다.
   * running 이 deps 에 없으면 재개할 때 루프가 다시 시작되지 않는다.
   */
  useAnimationFrame(running ? tick : null, 'infinite', [running, tick]);

  const handleStep = useCallback(() => {
    setRunning(false);
    const allDone = advance(1);
    drawAll();
    syncReadouts();
    if (allDone) finish();
  }, [advance, drawAll, finish, syncReadouts]);

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'select',
        id: 'size',
        label: '원소 개수',
        value: String(size),
        options: SIZE_OPTIONS.map((option) => ({ value: String(option), label: `${option}개` })),
      },
      {
        kind: 'select',
        id: 'pattern',
        label: '입력 패턴',
        value: pattern,
        options: (Object.keys(PATTERN_LABELS) as InputPattern[]).map((id) => ({
          value: id,
          label: PATTERN_LABELS[id],
        })),
      },
    ],
    [pattern, size],
  );

  const handleParamChange = useCallback(
    (id: string, value: number | boolean | string) => {
      if (id === 'size') {
        const nextSize = Number(value);
        setSize(nextSize);
        reset(nextSize, pattern);
        return;
      }
      const nextPattern = value as InputPattern;
      setPattern(nextPattern);
      reset(size, nextPattern);
    },
    [pattern, reset, size],
  );

  const allDone = doneFlags.every(Boolean);

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/cs/sorting-race"
      title={<>같은 배열, <Highlight>다른 속도</Highlight></>}
      subtitle="O(n²)와 O(n log n)의 차이를 말이 아니라 속도로 봅니다."
    >
      <ExplanationBox variant="note">
        <NoteRules />
      </ExplanationBox>

      <section className={styles.controlSection} aria-label="입력 설정">
        <ParameterPanel params={params} onChange={handleParamChange} />

        <div className={styles.buttons}>
          {/* 버튼 노드를 조건부로 갈아끼우지 않는다. 라벨만 바꿔 포커스를 지킨다. */}
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              // 끝난 뒤에 disabled 로 만들면 버튼을 누른 사람의 포커스가 사라진다.
              // 비활성화 대신 새 배열로 다시 출발하는 역할을 준다.
              if (allDone) {
                reset(size, pattern);
                setRunning(true);
                return;
              }
              setRunning((prev) => !prev);
            }}
          >
            {allDone ? '새 배열로 다시' : running ? '일시정지' : '시작'}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={handleStep}>
            한 스텝
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => reset(size, pattern)}
          >
            새 배열로 초기화
          </button>
        </div>

        <p className={styles.patternNote}>{PATTERN_NOTES[pattern]}</p>
      </section>

      <div className={styles.laneList}>
        {ALGORITHMS.map((spec, index) => (
          <SortLane
            key={spec.id}
            ref={(handle) => {
              canvasRefs.current[index] = handle;
            }}
            label={spec.label}
            complexity={spec.complexity}
            counters={counters[index]}
            done={doneFlags[index]}
            draw={(ctx) => {
              const lane = lanesRef.current[index];
              drawLane(ctx, { values: lane.values, active: lane.active, done: lane.done });
            }}
          />
        ))}
      </div>

      {/* 캔버스는 보조기술에 열리지 않는다. 완료 시점에 한 번만 결과를 알린다. */}
      <p role="status" aria-live="polite" className={styles.srOnly}>
        {announcement}
      </p>

      <ExplanationBox title={whyTitle} variant="note" collapsible defaultOpen={false}>
        <WhyDifference />
      </ExplanationBox>
    </TopicLayout>
  );
}
