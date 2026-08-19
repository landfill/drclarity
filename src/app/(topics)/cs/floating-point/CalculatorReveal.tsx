'use client';
import { useState, useEffect } from 'react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { prefersReducedMotion } from '@/lib/reducedMotion';
import styles from './CalculatorReveal.module.css';
import { explanation } from './content/reveal.mdx';

const RESULT_TEXT = '0.30000000000000004';
const SPLIT_INDEX = 16;

export function CalculatorReveal() {
  const [phase, setPhase] = useState<'idle' | 'calculating' | 'done'>('idle');
  const [showExplanation, setShowExplanation] = useState(false);
  const [shake, setShake] = useState(false);
  const [runId, setRunId] = useState(0);

  const typedResult = useTypewriter(RESULT_TEXT, {
    intervalMs: 50,
    active: phase === 'calculating' || phase === 'done',
    resetKey: runId,
    onDone: () => {
      setPhase('done');
    }
  });

  const typedExplanation = useTypewriter(explanation, {
    intervalMs: 20,
    active: showExplanation,
    resetKey: runId
  });

  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;
    if (phase === 'done') {
      t1 = setTimeout(() => {
        if (!prefersReducedMotion()) setShake(true);
        t2 = setTimeout(() => setShowExplanation(true), 800);
      }, 100);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  const startCalculation = () => {
    // active 가 true→true 로 유지되는 재실행이라 resetKey 로 타이핑을 되감는다
    setRunId((id) => id + 1);
    setPhase('calculating');
    setShowExplanation(false);
    setShake(false);
  };

  const getButtonLabel = () => {
    if (phase === 'idle') return '진실 확인하기';
    if (phase === 'calculating') return '계산 중...';
    return '보셨나요?';
  };

  const renderResult = () => {
    if (phase === 'idle') return '0.1 + 0.2 = ?';
    if (typedResult.length > SPLIT_INDEX) {
      return (
        <>
          0.1 + 0.2 = {typedResult.substring(0, SPLIT_INDEX)}
          <span className={styles.highlight}>{typedResult.substring(SPLIT_INDEX)}</span>
        </>
      );
    }
    return `0.1 + 0.2 = ${typedResult}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.calculator}>
        <div className={`${styles.display} ${shake ? styles.shake : ''}`}>
          {renderResult()}
        </div>
        <button 
          className={styles.button}
          onClick={startCalculation}
          disabled={phase === 'calculating'}
        >
          {getButtonLabel()}
        </button>
      </div>
      
      <div 
        className={`${styles.explanationPanel} ${showExplanation ? styles.visible : ''}`}
      >
        {typedExplanation}
      </div>
    </div>
  );
}
