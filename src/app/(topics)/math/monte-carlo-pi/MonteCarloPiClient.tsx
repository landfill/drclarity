'use client';

import { useCallback, useMemo } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { InteractiveCanvas } from '@/components/topic/InteractiveCanvas';
import { QuizGate } from '@/components/topic/QuizGate';
import { TrialRunner, type TrialBucket } from '@/components/topic/TrialRunner';
import { BOARD_SIZE, drawBoard } from './dartBoard';
import { INSIDE_RATE, estimatePi, errorFromPi, throwDart, type Dart } from './pi';
import meta from './meta';
import styles from './MonteCarloPi.module.css';

const TRIAL_BUCKETS: TrialBucket[] = [
  { id: 'inside', label: '원 안', theoretical: INSIDE_RATE, tone: 'primary' },
  { id: 'outside', label: '원 밖', theoretical: 1 - INSIDE_RATE, tone: 'secondary' },
];

export default function MonteCarloPiClient() {
  const runTrial = useCallback(() => throwDart(Math.random), []);

  const bucketsOf = useCallback((dart: Dart) => (dart.inside ? 'inside' : 'outside'), []);

  const renderProgress = useCallback((darts: Dart[]) => <Board darts={darts} />, []);

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/math/monte-carlo-pi"
      title={<>점을 뿌려서 <Highlight>π</Highlight> 구하기</>}
      subtitle="원의 넓이 공식을 쓰지 않고, 무작위로 던진 점을 세기만 해서 π 에 도달합니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>던져보기 전에</h2>
            <p>
              한 변이 2인 정사각형 안에 반지름 1인 원이 꼭 맞게 들어 있습니다.
              점을 <strong>완전히 무작위로</strong> 던질 때, 원 안에 떨어질 확률은?
            </p>
          </>
        }
        choices={[
          { id: 'half', label: '약 50% — 원이 정사각형의 절반쯤이니까' },
          { id: 'pi4', label: '약 79% — 넓이의 비만큼' },
          { id: 'unknown', label: '점을 던져 보기 전에는 알 수 없다' },
        ]}
        correctId="pi4"
        feedback={{
          pi4: (
            <p>
              그렇습니다. 확률은 <strong>넓이의 비</strong>입니다. 정사각형 넓이는 4, 원 넓이는 π
              이므로 π/4 ≈ 0.785 입니다. 이 식을 뒤집으면 π 를 <strong>세어서</strong> 구할 수 있습니다.
            </p>
          ),
          half: (
            <p>
              원이 정사각형을 꽤 채워 보여서 자주 나오는 답입니다. 실제로는 네 모서리만
              남으므로 원이 차지하는 몫이 절반보다 훨씬 큽니다. 아래에서 직접 세어 보세요.
            </p>
          ),
          unknown: (
            <p>
              점 하나의 결과는 예측할 수 없지만, <strong>비율</strong>은 던지기 전부터 정해져
              있습니다. 그 값이 바로 넓이의 비입니다.
            </p>
          ),
        }}
      >
        <ExplanationBox variant="note">
          <p>
            한 변이 2인 정사각형의 넓이는 <strong>4</strong>, 반지름 1인 원의 넓이는{' '}
            <strong>π</strong> 입니다. 그러니 무작위로 던진 점이 원 안에 들어갈 확률은{' '}
            <Highlight>π / 4</Highlight> 입니다.
          </p>
          <p>
            이 식에는 π 가 이미 들어 있습니다. 확률을 <strong>세어서</strong> 알아내면
            거꾸로 π 를 얻습니다 — <strong>π ≈ 4 × (원 안 / 전체)</strong>.
          </p>
        </ExplanationBox>

        <section className={styles.simSection} aria-label="시뮬레이션">
          <h2 className={styles.sectionTitle}>직접 던져보기</h2>
          <p className={styles.sectionLead}>
            주황색은 원 안, 파란색은 원 밖입니다. 시행을 늘릴수록 막대가 이론값
            눈금에 붙고, 추정값이 3.14 쪽으로 좁혀집니다.
          </p>
          <TrialRunner
            runTrial={runTrial}
            bucketsOf={bucketsOf}
            buckets={TRIAL_BUCKETS}
            presets={[10, 100, 1000, 5000]}
            renderProgress={renderProgress}
            labels={{ run: '개 던지기', reset: '판 비우기', total: '던진 점' }}
          />
        </section>

        <ExplanationBox title="왜 딱 떨어지지 않을까">
          <p>
            같은 횟수를 던져도 결과가 매번 다릅니다. 이 방법이 주는 것은 정확한 값이 아니라
            <strong> 정확해지는 경향</strong>입니다. 오차는 시행 수의 제곱근에 반비례해서
            줄어듭니다 — 자릿수 하나를 더 얻으려면 시행을 <strong>100배</strong>로 늘려야 합니다.
          </p>
          <p>
            느린 방법입니다. 그래도 쓰는 이유는, 넓이를 적분으로 구하기 어려운 모양에도
            <strong> 똑같은 절차가 그대로 통하기 때문</strong>입니다. 던지고, 세고, 비율을 봅니다.
          </p>
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}

/** 점판과 현재 추정값. TrialRunner 가 회차마다 다시 부른다. */
function Board({ darts }: { darts: Dart[] }) {
  const inside = useMemo(() => darts.reduce((n, d) => n + (d.inside ? 1 : 0), 0), [darts]);
  const draw = useCallback((ctx: CanvasRenderingContext2D) => drawBoard(ctx, darts), [darts]);

  const estimate = estimatePi(inside, darts.length);
  const hasEstimate = Number.isFinite(estimate);

  return (
    <div className={styles.board}>
      <InteractiveCanvas
        logicalWidth={BOARD_SIZE}
        logicalHeight={BOARD_SIZE}
        draw={draw}
        ariaLabel={`정사각형에 던진 점 ${darts.length}개 중 ${inside}개가 원 안에 있습니다.`}
        className={styles.canvas}
      />
      <dl className={styles.readouts}>
        <div className={styles.readout}>
          <dt>원 안 / 전체</dt>
          <dd>
            {inside} / {darts.length}
          </dd>
        </div>
        <div className={styles.readout}>
          <dt>π 추정값</dt>
          <dd className={styles.estimate}>{hasEstimate ? estimate.toFixed(4) : '—'}</dd>
        </div>
        <div className={styles.readout}>
          <dt>실제 π 와의 차이</dt>
          <dd>{hasEstimate ? errorFromPi(estimate).toFixed(4) : '—'}</dd>
        </div>
      </dl>
    </div>
  );
}
