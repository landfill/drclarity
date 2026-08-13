import { useState, useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/reducedMotion';

export interface TypewriterOptions {
  intervalMs: number;
  active: boolean;
  onDone?: () => void;
}

export function useTypewriter(fullText: string, options: TypewriterOptions): string {
  const { intervalMs, active, onDone } = options;
  
  const [state, setState] = useState({
    active,
    text: active && prefersReducedMotion() ? fullText : '',
    doneCalled: false
  });

  if (active !== state.active) {
    setState({
      active,
      text: active && prefersReducedMotion() ? fullText : '',
      doneCalled: false
    });
  }

  useEffect(() => {
    if (!active) return;
    if (state.doneCalled) return;

    if (prefersReducedMotion() || state.text.length >= fullText.length) {
      // Use a local variable to prevent multiple calls before next render
      // But actually, setTimeout is not used here.
      // We can just call onDone inside setTimeout with 0ms to allow React to commit?
      // No, we can just call it here. But wait, if we call it here, the state update
      // for `doneCalled` happens, but before it renders, the effect could run again? No.
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, doneCalled: true }));
        if (onDone) onDone();
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setState(prev => ({
        ...prev,
        text: fullText.substring(0, prev.text.length + 1)
      }));
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [active, fullText, intervalMs, state.text.length, state.doneCalled, onDone]);

  return state.text;
}
