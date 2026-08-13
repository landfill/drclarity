'use client';
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import styles from './InteractiveCanvas.module.css';

export type CanvasDrawFn = (ctx: CanvasRenderingContext2D) => void;

export interface InteractiveCanvasHandle {
  redraw(): void;
  getContext(): CanvasRenderingContext2D | null;
}

export interface InteractiveCanvasProps {
  logicalWidth: number;
  logicalHeight: number;
  draw: CanvasDrawFn;
  ariaLabel: string;
  waitForFonts?: string[];
  className?: string;
}

export const InteractiveCanvas = forwardRef<InteractiveCanvasHandle, InteractiveCanvasProps>(
  ({ logicalWidth, logicalHeight, draw, ariaLabel, waitForFonts = [], className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawRef = useRef(draw);
    const fontsLoadedRef = useRef(waitForFonts.length === 0);

    useEffect(() => {
      drawRef.current = draw;
    }, [draw]);

    const handleRedraw = () => {
      const canvas = canvasRef.current;
      if (!canvas || !fontsLoadedRef.current) return;
      const ctx = canvas.getContext('2d');
      if (ctx) drawRef.current(ctx);
    };

    useImperativeHandle(ref, () => ({
      redraw: handleRedraw,
      getContext: () => canvasRef.current?.getContext('2d') || null
    }));

    useEffect(() => {
      if (waitForFonts.length > 0) {
        Promise.all(waitForFonts.map(f => document.fonts.load(f))).then(() => {
          fontsLoadedRef.current = true;
          handleRedraw();
        });
      }
    }, [waitForFonts]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const rect = entry.contentRect;
          const dpr = window.devicePixelRatio || 1;
          const cssWidth = rect.width;
          const cssHeight = (cssWidth / logicalWidth) * logicalHeight;

          canvas.width = Math.round(cssWidth * dpr);
          canvas.height = Math.round(cssHeight * dpr);
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale((cssWidth / logicalWidth) * dpr, (cssHeight / logicalHeight) * dpr);
            handleRedraw();
          }
        }
      });

      resizeObserver.observe(container);

      const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      const onResolutionChange = () => {
         const ev = new Event('resize');
         window.dispatchEvent(ev);
      };
      mediaQuery.addEventListener('change', onResolutionChange);

      return () => {
        resizeObserver.disconnect();
        mediaQuery.removeEventListener('change', onResolutionChange);
      };
    }, [logicalWidth, logicalHeight]);

    useEffect(() => {
      if (fontsLoadedRef.current) {
        handleRedraw();
      }
    });

    return (
      <div className={`${styles.container} ${className}`} ref={containerRef}>
        <canvas
          ref={canvasRef}
          aria-label={ariaLabel}
          className={styles.canvas}
        />
      </div>
    );
  }
);
InteractiveCanvas.displayName = 'InteractiveCanvas';
