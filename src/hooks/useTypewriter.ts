import { useState, useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/reducedMotion';

export interface TypewriterOptions {
  intervalMs: number;
  active: boolean;
  onDone?: () => void;
}

export function useTypewriter(fullText: string, options: TypewriterOptions): string {
  const { intervalMs, active, onDone } = options;
  const [displayedText, setDisplayedText] = useState('');
  
  // 렌더링 중 최신 콜백을 항상 반영하도록 즉시 업데이트합니다.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!active) {
      setDisplayedText('');
      return;
    }

    if (prefersReducedMotion()) {
      setDisplayedText(fullText);
      if (onDoneRef.current) {
        onDoneRef.current();
      }
      return;
    }

    let i = 0;
    setDisplayedText('');
    
    const interval = setInterval(() => {
      i++;
      setDisplayedText(fullText.substring(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        if (onDoneRef.current) {
          onDoneRef.current();
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [active, fullText, intervalMs]);

  return displayedText;
}
