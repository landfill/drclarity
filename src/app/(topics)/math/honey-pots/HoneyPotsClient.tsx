'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { TopicLayout, Highlight } from '@/components/layout/TopicLayout';
import { ExplanationBox } from '@/components/topic/ExplanationBox';
import { BinaryEncodingBoard, HoneyBoardControls, type HoneyBoardMode } from './BinaryEncodingBoard';
import { antsForPot } from './binary';
import { HONEY_STEPS } from './steps';
import Problem from './content/problem.mdx';
import GroupTesting from './content/group-testing.mdx';
import meta from './meta';
import styles from './BinaryEncodingBoard.module.css';

const STAGE_LABELS = ['문제', '그룹 나누기', '결과의 개수', '이름표 붙이기', '꿀 나누기', '컵별로 보기', '결과 읽기', '정리'];
const MODES: HoneyBoardMode[] = ['grid','groups','codes','signature','routing','encoding','simulation','summary'];

export default function HoneyPotsClient() {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPot, setSelectedPot] = useState(21);
  const [selectedGroup, setSelectedGroup] = useState(0);
  const [activeAntBit, setActiveAntBit] = useState<number | null>(null);
  const [deadAntBits, setDeadAntBits] = useState<number[]>([]);
  const current = HONEY_STEPS[stepIndex];
  const lessonRef = useRef<HTMLElement>(null);
  const shouldAlignLessonRef = useRef(false);

  useLayoutEffect(() => {
    if (!shouldAlignLessonRef.current) return;
    shouldAlignLessonRef.current = false;

    const lesson = lessonRef.current;
    if (!lesson) return;
    const header = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--header-h')
    ) || 0;
    const bounds = lesson.getBoundingClientRect();
    if (bounds.top < header + 8 || bounds.bottom > window.innerHeight) {
      window.scrollTo({
        top: window.scrollY + bounds.top - header - 8,
        behavior: 'auto',
      });
    }
  }, [stepIndex]);

  const go = (index: number) => {
    const next = Math.max(0, Math.min(HONEY_STEPS.length-1,index));
    if (next !== stepIndex) shouldAlignLessonRef.current = true;
    setStepIndex(next);
    if (next !== 1) setSelectedGroup(0);
    if (next !== 5) setActiveAntBit(null);
    if (next === 0) { setSelectedPot(21); setDeadAntBits([]); }
    else if (next < 6) setDeadAntBits([]);
    else if (next >= 6 && stepIndex < 6) setDeadAntBits(antsForPot(selectedPot));
  };

  return (
    <TopicLayout wide tags={meta.tags} topicHref="/math/honey-pots" title={<>25개의 꿀통과 <Highlight>5마리 개미</Highlight></>} subtitle="한 번의 판독으로 가짜 꿀통 하나를 찾아낼 수 있을까요?">
      <section ref={lessonRef} className={styles.lesson} aria-label="꿀통 퍼즐 풀이">
        <div className={styles.lessonToolbar}>
          <span>{stepIndex+1} / {HONEY_STEPS.length}</span>
          <div className={styles.lessonButtons}><button type="button" onClick={() => go(stepIndex-1)} disabled={stepIndex === 0}>이전</button><button type="button" className={styles.nextButton} onClick={() => go(stepIndex+1)} disabled={stepIndex === HONEY_STEPS.length-1}>{stepIndex === 0 ? '풀이 시작' : '다음'}</button><button type="button" onClick={() => go(0)} disabled={stepIndex === 0}>처음으로</button></div>
        </div>
        <nav className={styles.lessonSteps} aria-label="풀이 단계">{STAGE_LABELS.map((label,index) => <button key={label} type="button" aria-current={stepIndex === index ? 'step' : undefined} aria-label={`${index+1}단계: ${label}`} onClick={() => go(index)}>{index+1}<span>{label}</span></button>)}</nav>
        <dl className={styles.constraints} aria-label="퍼즐 조건">
          <div><dt>꿀통</dt><dd><strong>25</strong><span>통 · 가짜 1통</span></dd></div>
          <div><dt>개미</dt><dd><strong>5</strong><span>마리</span></dd></div>
          <div><dt>판독</dt><dd><strong>1</strong><span>시간 뒤 한 번</span></dd></div>
        </dl>
        <div className={styles.lessonGrid}>
          <div className={styles.boardPanel}>
            <BinaryEncodingBoard mode={MODES[stepIndex]} selectedPot={selectedPot} selectedGroup={selectedGroup} activeAntBit={activeAntBit} deadAntBits={deadAntBits} />
          </div>
          <div className={styles.lessonSidebar}>
            <HoneyBoardControls mode={MODES[stepIndex]} selectedPot={selectedPot} onSelectPot={setSelectedPot} selectedGroup={selectedGroup} onSelectGroup={setSelectedGroup} activeAntBit={activeAntBit} onActiveAntBitChange={setActiveAntBit} deadAntBits={deadAntBits} onToggleAntDead={bit => setDeadAntBits(previous => previous.includes(bit) ? previous.filter(value => value !== bit) : [...previous,bit])} />
            <ExplanationBox variant="note"><Problem /></ExplanationBox>
            <div className={styles.lessonExplanation}>
              <h2>{STAGE_LABELS[stepIndex]}</h2>
              <div className={styles.lessonBody} role="status">{current.body}</div>
              {current.hint && <p className={styles.lessonHint}><strong>직접 확인</strong><br />{current.hint}</p>}
            </div>
          </div>
        </div>
      </section>
      <ExplanationBox title="현실에서는 어디에 쓰일까?" variant="note" collapsible defaultOpen={false}><GroupTesting /></ExplanationBox>
    </TopicLayout>
  );
}
