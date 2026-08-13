'use client';
import { useState, useEffect, useRef } from 'react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { prefersReducedMotion } from '@/lib/reducedMotion';
import styles from './CalculatorReveal.module.css';

const RESULT_TEXT = '0.30000000000000004';
const SPLIT_INDEX = 16;
const EXPLANATION_TEXT = `컴퓨터의 메모리는 한정되어 있어서 이 무한한 숫자를 어딘가에서 잘라내야(반올림) 합니다. 그래서 0.1 + 0.2를 계산하면 정확히 0.3이 아닌 0.30000000000000004 같은 결과가 나오는 것입니다.

이것이 바로 부동소수점(Floating Point) 연산 오류입니다. 금융 계산처럼 정확도가 중요한 곳에서는 이를 해결하기 위해 정수로 변환하거나 특별한 라이브러리를 사용합니다.`;

export function CalculatorReveal() {
  const [phase, setPhase] = useState<'idle' | 'calculating' | 'done'>('idle');
  const [showExplanation, setShowExplanation] = useState(false);
  const [shake, setShake] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const typedResult = useTypewriter(RESULT_TEXT, {
    intervalMs: 50,
    active: phase === 'calculating' || phase === 'done',
    onDone: () => {
      setPhase('done');
    }
  });

  const typedExplanation = useTypewriter(EXPLANATION_TEXT, {
    intervalMs: 20,
    active: showExplanation
  });

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [typedExplanation]);

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
          {typedResult.substring(0, SPLIT_INDEX)}
          <span className={styles.highlight}>{typedResult.substring(SPLIT_INDEX)}</span>
        </>
      );
    }
    return typedResult;
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
      
      {showExplanation && (
        <div className={styles.explanationPanel} ref={panelRef}>
          {typedExplanation}
        </div>
      )}
    </div>
  );
}
