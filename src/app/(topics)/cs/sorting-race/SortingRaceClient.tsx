'use client';

import { useCallback, useMemo, useState } from 'react';
import { SplitStage } from '@/components/topic/SplitStage';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { ParameterPanel, ParameterDefinition } from '@/components/topic/ParameterPanel';
import { RaceFigure } from './RaceFigure';
import { SIZES } from './race';
import type { InputPattern } from './sorting';
import NoteRules from './content/note-rules.mdx';
import WhyDifference, { title as whyTitle } from './content/why-difference.mdx';
import meta from './meta';
import styles from './SortingRace.module.css';

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

export default function SortingRaceClient() {
  const [size, setSize] = useState(50);
  const [pattern, setPattern] = useState<InputPattern>('random');
  const params: ParameterDefinition[] = useMemo(
    () => [
      {
        kind: 'select',
        id: 'size',
        label: '원소 개수',
        value: String(size),
        options: SIZES.map((option) => ({ value: String(option), label: `${option}개` })),
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
        setSize(Number(value));
        return;
      }
      setPattern(value as InputPattern);
    },
    [],
  );

  return (
    <TopicLayout
      wide
      tags={meta.tags}
      topicHref="/cs/sorting-race"
      title={<>같은 배열, <Highlight>다른 속도</Highlight></>}
      subtitle="같은 배열을 정렬하는데 왜 속도가 다를까요?"
    >
      <SplitStage wideStage stage={<RaceFigure key={`${size}-${pattern}`} size={size} pattern={pattern} />}>

      <ExplanationBox variant="note">
        <NoteRules />
      </ExplanationBox>

      <section className={styles.controlSection} aria-label="입력 설정">
        <ParameterPanel params={params} onChange={handleParamChange} />

        <p className={styles.patternNote}>{PATTERN_NOTES[pattern]}</p>
      </section>

      {/* 원소 수나 패턴이 바뀌면 새로 마운트해 새 배열로 처음부터 시작한다. */}
      <section className={styles.figureSection} aria-label="정렬 선반">

      </section>

      <ExplanationBox title={whyTitle} variant="note" collapsible defaultOpen={false}>
        <WhyDifference />
      </ExplanationBox>

      </SplitStage>
    </TopicLayout>
  );
}
