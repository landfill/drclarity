'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimationCard } from '@/components/topic/AnimationCard';
import styles from './PizzaSlicer.module.css';

export interface FloatingPointAnimationCardProps {
  children: ReactNode;
}

export function FloatingPointAnimationCard({ children }: FloatingPointAnimationCardProps) {
  const [canStick, setCanStick] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const updateStickiness = () => {
      const rootStyles = getComputedStyle(document.documentElement);
      const headerHeight = Number.parseFloat(rootStyles.getPropertyValue('--header-h')) || 0;
      // SolutionStepper 와 동일하게 헤더 아래 가용 높이에 들어갈 때만 sticky 허용 (16px 여백 확보)
      const availableHeight = window.innerHeight - headerHeight - 16;
      setCanStick(card.getBoundingClientRect().height <= availableHeight);
    };

    updateStickiness();
    window.addEventListener('resize', updateStickiness);
    const resizeObserver = new ResizeObserver(updateStickiness);
    resizeObserver.observe(card);

    return () => {
      window.removeEventListener('resize', updateStickiness);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`${styles.cardWrapper} ${canStick ? styles.stickySection : ''}`}
    >
      <AnimationCard>
        {children}
      </AnimationCard>
    </div>
  );
}
