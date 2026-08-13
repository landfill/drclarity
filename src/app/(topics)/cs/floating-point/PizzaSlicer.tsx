'use client';
import { useState, useEffect, useRef } from 'react';
import { binaryFractions } from './binaryFractions';
import styles from './PizzaSlicer.module.css';

type Phase = 'idle' | 'slicing-decimal' | 'highlight-decimal' | 'slicing-binary' | 'crumb' | 'done';

interface BinarySlice {
  denominator: number;
  startDeg: number;
  sweepDeg: number;
  state: 'preview' | 'kept';
}

export function PizzaSlicer() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('피자 자르기 버튼을 눌러주세요.');
  const [decSlices, setDecSlices] = useState<number>(0);
  const [binSlices, setBinSlices] = useState<BinarySlice[]>([]);
  const cancelRef = useRef(false);

  const startAnimation = async () => {
    setPhase('slicing-decimal');
    setDecSlices(0);
    setBinSlices([]);
    cancelRef.current = false;

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Phase 1: 10진법 피자 분할
    setStatus('10진법 피자를 10조각으로 자르는 중...');
    for (let i = 1; i <= 5; i++) {
      await delay(500);
      if (cancelRef.current) return;
      setDecSlices(i);
    }

    // Phase 2: 강조
    setPhase('highlight-decimal');
    setStatus('1/10조각 (0.1) 가져오기...');
    await delay(2500);
    if (cancelRef.current) return;

    // Phase 3: 2진법 조각들
    setPhase('slicing-binary');
    let currentDeg = 0;
    const slices: BinarySlice[] = [];

    for (const frac of binaryFractions) {
      const sweep = 360 / frac.denominator;
      
      setStatus(frac.label);
      
      const newSlice: BinarySlice = {
        denominator: frac.denominator,
        startDeg: currentDeg,
        sweepDeg: sweep,
        state: 'preview'
      };
      slices.push(newSlice);
      setBinSlices([...slices]);
      
      await delay(1500);
      if (cancelRef.current) return;

      if (frac.keep) {
        slices[slices.length - 1].state = 'kept';
        currentDeg += sweep;
      } else {
        slices.pop();
      }
      setBinSlices([...slices]);

      await delay(800);
      if (cancelRef.current) return;
    }

    // Phase 4: 부스러기
    setPhase('crumb');
    setStatus('1/16 + 1/32 + 1/256 + 1/512 + 1/4096 + ... ≠ 0.1 (항상 부스러기가 남아요!)');
    await delay(2500);
    if (cancelRef.current) return;

    setPhase('done');
  };

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const decLines = [];
  for (let i = 0; i < decSlices; i++) {
    decLines.push(
      <div 
        key={i} 
        className={styles.sliceLine} 
        style={{ transform: `rotate(${i * 36}deg)` }} 
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.stage}>
        <div className={styles.pizzaBox}>
          <div className={styles.pizzaLabel}>10진법 피자 (목표: 0.1)</div>
          <div className={styles.pizza}>
            {decLines}
            <div 
              className={`${styles.highlightDec} ${phase === 'highlight-decimal' || phase === 'slicing-binary' || phase === 'crumb' || phase === 'done' ? styles.active : ''}`}
            />
          </div>
        </div>
        
        <div className={styles.pizzaBox}>
          <div className={styles.pizzaLabel}>2진법 피자 (1/2, 1/4, 1/8...)</div>
          <div className={styles.pizza}>
            {binSlices.map((s, idx) => (
              <div 
                key={idx} 
                className={`${styles.binSlice} ${s.state === 'kept' ? styles.kept : styles.preview}`}
                style={{
                  background: `conic-gradient(from ${s.startDeg}deg, var(--color-warm) ${s.sweepDeg}deg, transparent ${s.sweepDeg}deg)`
                }}
              />
            ))}
            {(phase === 'crumb' || phase === 'done') && (
              <div className={styles.crumbIndicator} />
            )}
          </div>
        </div>
      </div>
      
      <div className={styles.controls}>
        <button 
          onClick={startAnimation} 
          disabled={phase !== 'idle' && phase !== 'done'}
          className={styles.button}
        >
          {phase === 'done' ? '다시 자르기' : '피자 자르기!'}
        </button>
        <p className={styles.status} aria-live="polite">{status}</p>
      </div>
    </div>
  );
}
