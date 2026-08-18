'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { InteractiveCanvas } from '@/components/topic/InteractiveCanvas';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { TrialRunner, type TrialBucket } from '@/components/topic/TrialRunner';
import {
  DAYS_IN_YEAR,
  MAX_PEOPLE,
  drawBirthdays,
  formatProbabilityPercent,
  hasSharedBirthday,
  pairCount,
  sharedBirthdayProbability,
} from './birthday';
import { CURVE_HEIGHT, CURVE_WIDTH, MARKED_PEOPLE, drawProbabilityCurve } from './curveRenderer';
import meta from './meta';
import styles from './BirthdayProblem.module.css';

const DEFAULT_PEOPLE = MARKED_PEOPLE;

export default function BirthdayProblemClient() {
  const [people, setPeople] = useState(DEFAULT_PEOPLE);

  const probability = sharedBirthdayProbability(people);
  const pairs = pairCount(people);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => drawProbabilityCurve(ctx, people),
    [people],
  );

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'range',
        id: 'people',
        label: '모인 사람',
        min: 2,
        max: MAX_PEOPLE,
        step: 1,
        value: people,
        format: v => `${v}명`,
      },
    ],
    [people],
  );

  const runTrial = useCallback(
    () => hasSharedBirthday(drawBirthdays(people, Math.random)),
    [people],
  );

  const bucketsOf = useCallback((shared: boolean) => (shared ? 'shared' : 'none'), []);

  const buckets: TrialBucket[] = useMemo(
    () => [
      { id: 'shared', label: '같은 생일 있음', theoretical: probability, tone: 'primary' },
      { id: 'none', label: '전부 다른 날', theoretical: 1 - probability, tone: 'secondary' },
    ],
    [probability],
  );

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/math/birthday-problem"
      title={<>생일 문제 — <Highlight>23명이면 50%</Highlight></>}
      subtitle="365일 중 하루씩인데 스물세 명이면 절반을 넘습니다. 세야 할 것이 사람이 아니라 쌍이기 때문입니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>세어보기 전에</h2>
            <p>
              생일이 <strong>같은 사람이 적어도 한 쌍</strong> 있을 확률이 50% 를 넘으려면
              몇 명이 모여야 할까요? (생일은 365일에 고르게 흩어져 있다고 봅니다)
            </p>
          </>
        }
        choices={[
          { id: 'n183', label: '183명쯤 — 365의 절반' },
          { id: 'n60', label: '60명쯤 — 한 학년 두 반' },
          { id: 'n23', label: '23명쯤 — 한 반의 절반' },
        ]}
        correctId="n23"
        feedback={{
          n23: (
            <p>
              그렇습니다. 정확히는 <strong>23명</strong>에서 50.7% 가 됩니다. 365 에 비하면
              터무니없이 적은 수인데, 그 이유는 <strong>사람이 아니라 쌍을 세야 하기</strong>
              때문입니다. 아래에서 쌍의 개수와 함께 확인해 보세요.
            </p>
          ),
          n183: (
            <p>
              가장 많이 나오는 답입니다. 하지만 183은 <strong>&ldquo;나와 생일이 같은 사람&rdquo;</strong>을
              찾을 때의 감각입니다. 문제가 묻는 것은 <strong>누구든 두 사람</strong>이 겹치는
              경우입니다. 아래에서 그 차이를 재 보세요.
            </p>
          ),
          n60: (
            <p>
              방향은 맞습니다 — 생각보다 훨씬 적습니다. 실제로는 그보다도 적어서, 60명이면
              확률이 이미 <strong>99%</strong> 를 넘습니다. 곡선이 얼마나 가파른지 아래에서
              보세요.
            </p>
          ),
        }}
      >
        <ExplanationBox variant="note">
          <p>
            대부분 <strong>&ldquo;나와 생일이 같은 사람&rdquo;</strong>을 셉니다. 그러면 상대가
            n − 1 명뿐이라 확률이 좀처럼 오르지 않습니다.
          </p>
          <p>
            문제가 묻는 것은 <strong>아무 두 사람</strong>입니다. 그래서 세어야 하는 것은{' '}
            <Highlight>모든 쌍 — n(n−1)/2 개</Highlight>입니다. 23명이면 상대는 22명이지만
            쌍은 <strong>253개</strong>입니다. 이 전환이 이 주제의 전부입니다.
          </p>
        </ExplanationBox>

        <section className={styles.stage} aria-label="확률 곡선">
          <h2 className={styles.sectionTitle}>인원을 늘려 봅니다</h2>
          <p className={styles.sectionLead}>
            인원은 하나씩 느는데 확률은 계단이 아니라 절벽처럼 솟습니다. 함께 자라는{' '}
            <strong>쌍의 개수</strong>를 옆에서 보세요.
          </p>

          <ParameterPanel
            params={params}
            onChange={(_, value) => setPeople(Number(value))}
            onReset={() => setPeople(DEFAULT_PEOPLE)}
          />

          <InteractiveCanvas
            logicalWidth={CURVE_WIDTH}
            logicalHeight={CURVE_HEIGHT}
            draw={draw}
            ariaLabel={`${people}명이 모였을 때 생일이 같은 사람이 있을 확률은 ${formatProbabilityPercent(probability)} 입니다. 비교되는 쌍은 ${pairs}개입니다.`}
            className={styles.canvas}
          />

          <dl className={styles.readouts}>
            <div className={styles.readout}>
              <dt>모인 사람</dt>
              <dd>{people}명</dd>
            </div>
            <div className={styles.readout}>
              <dt>비교되는 쌍</dt>
              <dd>{pairs.toLocaleString('ko-KR')}쌍</dd>
            </div>
            <div className={styles.readout}>
              <dt>같은 생일이 있을 확률</dt>
              <dd className={styles.probability}>{formatProbabilityPercent(probability)}</dd>
            </div>
          </dl>

          <p className={styles.punchline}>
            사람이 2배가 되면 쌍은 <strong>약 4배</strong>가 됩니다. 확률이 이렇게 빨리 오르는
            이유가 이것입니다.
          </p>
        </section>

        <section className={styles.simSection} aria-label="시뮬레이션">
          <h2 className={styles.sectionTitle}>정말 그런지 돌려보기</h2>
          <p className={styles.sectionLead}>
            위에서 고른 <strong>{people}명</strong>의 생일을 매번 새로 뽑아 겹치는지 봅니다.
            시행을 늘릴수록 막대가 이론값 눈금에 붙습니다. 인원을 바꾸면 다른 분포의 표본이
            되므로 집계는 처음부터 다시 시작합니다.
          </p>
          <TrialRunner
            /*
             * 인원이 바뀌면 이론값이 통째로 달라진다. 이전 인원에서 쌓은 집계를
             * 그대로 이어가면 실측 막대와 눈금이 서로 다른 분포를 가리키게 되므로
             * key 로 다시 마운트해 비운다.
             */
            key={people}
            runTrial={runTrial}
            bucketsOf={bucketsOf}
            buckets={buckets}
            presets={[10, 100, 1000, 5000]}
            labels={{ run: '번 모아보기', reset: '집계 비우기', total: '모아본 횟수' }}
          />
        </section>

        <ExplanationBox title="왜 여사건으로 계산할까">
          <p>
            &ldquo;겹칠 확률&rdquo;을 쌍마다 더하면 안 됩니다. 세 사람이 같은 날인 경우가
            여러 번 세어져 확률이 1 을 넘어갑니다.
          </p>
          <p>
            그래서 <strong>아무도 안 겹칠 확률</strong>을 먼저 구합니다. 한 명씩 세우면서
            앞사람들이 쓰지 않은 날만 고르게 하면 됩니다 — {DAYS_IN_YEAR}/{DAYS_IN_YEAR} ×{' '}
            {DAYS_IN_YEAR - 1}/{DAYS_IN_YEAR} × {DAYS_IN_YEAR - 2}/{DAYS_IN_YEAR} × …. 여기에는
            중복이 없습니다. 답은 <strong>1 에서 이 값을 뺀 것</strong>입니다.
          </p>
          <p>
            사람이 366명이면 곱하는 항에 0 이 들어옵니다. 365개의 날에 366명을 서로 다르게
            앉힐 수 없으니 확률이 정확히 <strong>1</strong> 입니다 — 비둘기집 원리입니다.
          </p>
        </ExplanationBox>

        <ExplanationBox title="이 계산이 놓고 가는 것" collapsible>
          <p>
            여기서는 생일이 <strong>365일에 고르게</strong> 흩어져 있다고 봤고,{' '}
            <strong>윤년(2월 29일)은 다루지 않았습니다</strong>. 실제 출생일은 계절과 요일에
            따라 몰리는 편이라, 진짜 확률은 여기서 구한 값보다 <strong>조금 더 높습니다</strong>.
            쏠림은 겹칠 기회를 늘리기만 하기 때문입니다.
          </p>
          <p>
            즉 23명이라는 답은 <strong>가장 보수적인 쪽의 답</strong>입니다. 현실에서는 더 적은
            인원으로도 절반을 넘습니다.
          </p>
        </ExplanationBox>

        <ExplanationBox title="같은 원리를 쓰는 곳">
          <p>
            파일 이름을 짧은 숫자로 바꿔 서랍에 넣는 <strong>해시</strong>도 같은 계산을
            따릅니다. 서랍이 아무리 많아도, 넣는 물건이 <strong>서랍 수의 제곱근</strong> 근처가
            되면 같은 서랍에 두 개가 들어오기 시작합니다. 365일에 23명이었던 것과 같습니다 —{' '}
            <strong>√365 ≈ 19</strong>.
          </p>
          <p>
            그래서 해시값을 짧게 자르면 위험합니다. 32비트 해시는 약 43억 가지지만, 서로 다른
            입력 <strong>약 7만 7천 개</strong>만 넣어도 충돌이 일어날 확률이 절반을 넘습니다.
          </p>
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
