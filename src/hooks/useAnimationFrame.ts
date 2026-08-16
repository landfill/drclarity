import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/reducedMotion';

export function useAnimationFrame(
  callback: ((elapsedMs: number, progress: number) => void) | null,
  durationMs: number | 'infinite',
  deps: React.DependencyList,
): void {
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!callbackRef.current) return;
    
    if (prefersReducedMotion()) {
      const isInfinite = durationMs === 'infinite';
      callbackRef.current(isInfinite ? 1000 : durationMs, 1);
      return;
    }

    const animate = (time: number) => {
      if (startTimeRef.current === null) startTimeRef.current = time;
      const elapsedMs = time - startTimeRef.current;

      const isInfinite = durationMs === 'infinite';
      const progress = isInfinite ? 0 : Math.min(elapsedMs / (durationMs as number), 1);

      if (callbackRef.current) {
        callbackRef.current(elapsedMs, progress);
      }

      if (!isInfinite && progress >= 1) {
        requestRef.current = null;
      } else {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      startTimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useNextAnimationFrame(
  callback: (() => void) | null,
  deps: React.DependencyList,
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!callbackRef.current) return;

    const requestId = requestAnimationFrame(() => callbackRef.current?.());
    return () => cancelAnimationFrame(requestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
