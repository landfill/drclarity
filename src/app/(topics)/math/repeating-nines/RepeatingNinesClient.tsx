'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { InteractiveCanvas } from '@/components/topic/InteractiveCanvas';
import { ParameterPanel, type ParameterDefinition } from '@/components/topic/ParameterPanel';
import { QuizGate } from '@/components/topic/QuizGate';
import { SolutionStepper, type SolutionStep } from '@/components/topic/SolutionStepper';
import { LINE_HEIGHT, LINE_WIDTH, drawNumberLine } from './lineRenderer';
import { MAX_DIGITS, gapString, ninesString } from './nines';
import meta from './meta';
import styles from './RepeatingNines.module.css';

const SOLUTION_STEPS: SolutionStep[] = [
  {
    id: 'let',
    body: (
      <>
        <strong>이름을 붙입니다.</strong> 9 가 <strong>끝없이</strong> 이어지는 수를 x 라고 둡니다.
        유한한 자릿수가 아니라 <strong>무한히 계속되는</strong> 수라는 점이 중요합니다.
      </>
    ),
    formula: 'x = 0.999…',
    hint: '위 슬라이더로 만든 수는 모두 유한합니다. 여기서 다루는 x 는 그 어느 것도 아닙니다.',
  },
  {
    id: 'times10',
    body: (
      <>
        <strong>10 을 곱합니다.</strong> 소수점이 한 칸 옮겨집니다. 9 가 무한히 많으므로,
        한 칸 밀어도 소수점 아래는 <strong>여전히 9 가 무한히</strong> 남습니다.
      </>
    ),
    formula: '10x = 9.999…',
    hint: '유한소수였다면 마지막 자리가 밀려나 모양이 달라집니다. 무한하기 때문에 같은 모양이 유지됩니다.',
  },
  {
    id: 'subtract',
    body: (
      <>
        <strong>두 식을 뺍니다.</strong> 소수점 아래가 완전히 같으므로 통째로 지워집니다.
      </>
    ),
    formula: '10x − x = 9.999… − 0.999… = 9',
  },
  {
    id: 'solve',
    body: (
      <>
        왼쪽은 9x 입니다. 따라서 <strong>9x = 9</strong>, 곧 <Highlight>x = 1</Highlight> 입니다.
        근삿값이 아니라 <strong>같은 수를 달리 적은 것</strong>입니다.
      </>
    ),
    formula: '9x = 9  →  x = 1',
  },
];

export default function RepeatingNinesClient() {
  const [digits, setDigits] = useState(3);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => drawNumberLine(ctx, digits), [digits]);

  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'range',
        id: 'digits',
        label: '9 의 개수',
        min: 1,
        max: MAX_DIGITS,
        step: 1,
        value: digits,
        format: v => `${v}개`,
      },
    ],
    [digits]
  );

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/math/repeating-nines"
      title={<>0.999… 는 <Highlight>1인가</Highlight></>}
      subtitle="9 를 아무리 이어 붙여도 1에는 조금 못 미칠 것 같습니다. 그 조금이 얼마인지 재 봅니다."
    >
      <QuizGate
        question={
          <>
            <h2 className={styles.sectionTitle}>재보기 전에</h2>
            <p>
              9 가 <strong>끝없이</strong> 이어지는 수 0.999… 와 1 의 관계는?
            </p>
          </>
        }
        choices={[
          { id: 'less', label: '0.999… 가 1보다 아주 조금 작다' },
          { id: 'equal', label: '둘은 정확히 같은 수다' },
          { id: 'close', label: '무한히 가깝지만 같지는 않다' },
        ]}
        correctId="equal"
        feedback={{
          equal: (
            <p>
              그렇습니다. 다만 <strong>왜</strong>가 중요합니다. 아래에서 유한한 자릿수일 때의
              틈을 직접 재 보고, 그 틈이 무한에서 어떻게 되는지 확인해 보세요.
            </p>
          ),
          less: (
            <p>
              가장 많은 사람이 고르는 답입니다. 그렇다면 그 &ldquo;아주 조금&rdquo;은 얼마일까요?
              두 수 사이에 <strong>다른 수를 하나라도</strong> 끼워 넣을 수 있어야 서로 다른 수입니다.
              아래에서 그 틈을 재 보세요.
            </p>
          ),
          close: (
            <p>
              &ldquo;가깝다&rdquo;는 말이 자연스럽게 느껴지는 곳입니다. 하지만 두 수가 다르다면
              그 차이는 <strong>0 보다 큰 어떤 수</strong>여야 합니다. 그런 수를 찾을 수 있는지
              아래에서 확인해 보세요.
            </p>
          ),
        }}
      >
        <section className={styles.stage} aria-label="수직선 확대">
          <h2 className={styles.sectionTitle}>틈을 재 봅니다</h2>
          <p className={styles.sectionLead}>
            9 를 하나씩 늘리면서 수직선을 그만큼 확대합니다. 확대해도 틈이 계속 보인다는 점에
            주목하세요 — <strong>자릿수가 유한한 동안에는</strong> 언제나 틈이 남습니다.
          </p>

          <ParameterPanel
            params={params}
            onChange={(_, value) => setDigits(Number(value))}
            onReset={() => setDigits(3)}
          />

          <InteractiveCanvas
            logicalWidth={LINE_WIDTH}
            logicalHeight={LINE_HEIGHT}
            draw={draw}
            ariaLabel={`9 가 ${digits}개인 ${ninesString(digits)} 와 1 사이의 틈은 ${gapString(digits)} 입니다.`}
            className={styles.canvas}
          />

          <dl className={styles.readouts}>
            <div className={styles.readout}>
              <dt>지금 만든 수</dt>
              <dd className={styles.mono}>{ninesString(digits)}</dd>
            </div>
            <div className={styles.readout}>
              <dt>1 과의 차이</dt>
              <dd className={`${styles.mono} ${styles.gap}`}>{gapString(digits)}</dd>
            </div>
          </dl>

          <p className={styles.punchline}>
            차이는 <strong>10<sup>−{digits}</sup></strong> 입니다. 줄어들지만
            <strong> 0 이 되지는 않습니다.</strong> 9 를 {MAX_DIGITS}개까지 늘려도 마찬가지입니다.
          </p>
        </section>

        <ExplanationBox variant="note">
          <p>
            여기서 만든 수는 전부 <strong>유한소수</strong>입니다. 9 가 {digits}개면 어디선가
            9 가 끝납니다. 반면 <strong>0.999…</strong> 에는 마지막 9 가 없습니다.
          </p>
          <p>
            그래서 위 화면은 0.999… 를 보여주는 것이 <strong>아닙니다</strong>. 아무리 확대해도
            틈이 보이는 이유는 언제나 <Highlight>유한한 자리에서 멈췄기 때문</Highlight>입니다.
          </p>
        </ExplanationBox>

        <section className={styles.solutionSection} aria-label="풀이">
          <h2 className={styles.sectionTitle}>끝이 없다면</h2>
          <SolutionStepper steps={SOLUTION_STEPS} />
        </section>

        <ExplanationBox title="다른 방법으로도 확인해 보기">
          <p>
            <strong>1/3 로 확인하기.</strong> 1/3 = 0.333… 입니다. 양변에 3 을 곱하면
            왼쪽은 1, 오른쪽은 0.999… 입니다.
          </p>
          <p>
            <strong>사이에 낄 수 있는 수로 확인하기.</strong> 서로 다른 두 실수 사이에는
            반드시 또 다른 실수가 있습니다. 0.999… 와 1 사이에 들어갈 수를 하나라도 적을 수
            있나요? 적으려는 순간 9 를 더 붙여야 하고, 그러면 다시 0.999… 안쪽입니다.
          </p>
          <p>
            두 방법 모두 같은 곳에 도착합니다. <strong>0.999… 는 1 의 다른 표기</strong>입니다.
            2 를 2.0 이라고 적을 수 있는 것과 같습니다.
          </p>
        </ExplanationBox>

        <ExplanationBox title="컴퓨터에서는 사정이 다릅니다" collapsible>
          <p>
            여기까지는 <strong>수학</strong>의 답입니다. 0.999… = 1 은 근사가 아니라 정확히
            참입니다.
          </p>
          <p>
            그런데 컴퓨터는 무한소수를 유한한 자리에 담아야 합니다. 10진법에서 깔끔한
            0.1 조차 <strong>2진법에서는 무한소수</strong>라, 저장하려면 어딘가에서 잘라야
            합니다. 거기서는 실제로 <strong>오차가 생깁니다</strong>. 같은 &ldquo;무한소수&rdquo;를
            두고 수학과 컴퓨터의 답이 갈리는 지점입니다.
          </p>
        </ExplanationBox>
      </QuizGate>
    </TopicLayout>
  );
}
