'use client';

import { useLayoutEffect, useRef } from 'react';

/** 실제 단계 전환 때만 레슨 카드가 헤더 아래에서 보이게 맞춘다. */
export function useLessonAlignment(step: number) {
  const lessonRef = useRef<HTMLElement>(null);
  const previousStep = useRef(step);
  useLayoutEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    const lesson = lessonRef.current;
    if (!lesson) return;
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;
    const bounds = lesson.getBoundingClientRect();
    if (bounds.top < header + 8 || bounds.bottom > window.innerHeight) {
      window.scrollTo({ top: window.scrollY + bounds.top - header - 8, behavior: 'auto' });
    }
  }, [step]);
  return lessonRef;
}
