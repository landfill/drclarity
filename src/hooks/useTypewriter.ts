/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/reducedMotion';

export interface TypewriterOptions {
  intervalMs: number;
  active: boolean;
  onDone?: () => void;
}

export function useTypewriter(fullText: string, options: TypewriterOptions): string {
  const [displayedText, setDisplayedText] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { intervalMs, active, onDone } = options;
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!active) {
      setDisplayedText('');
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    if (prefersReducedMotion()) {
      setDisplayedText(fullText);
      if (onDoneRef.current) onDoneRef.current();
      return;
    }

    let i = 0;
    setDisplayedText('');
    
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayedText(fullText.substring(0, i));
      if (i >= fullText.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        if (onDoneRef.current) onDoneRef.current();
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, fullText, intervalMs]);

  return displayedText;
}
