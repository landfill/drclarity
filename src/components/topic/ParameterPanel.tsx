'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  logPositionToValue,
  valueToLogPosition,
  valueToPercentage,
} from '@/lib/scale';
import styles from './ParameterPanel.module.css';

const LOG_SLIDER_RESOLUTION = 1000;

export type ParameterDefinition =
  | {
      kind: 'range';
      id: string;
      label: string;
      min: number;
      max: number;
      step?: number;
      value: number;
      scale?: 'linear' | 'log';
      format?: (value: number) => string;
    }
  | {
      kind: 'toggle';
      id: string;
      label: string;
      value: boolean;
    }
  | {
      kind: 'select';
      id: string;
      label: string;
      options: { value: string; label: string }[];
      value: string;
    };

export interface ParameterPanelProps {
  params: ParameterDefinition[];
  onChange: (id: string, value: number | boolean | string) => void;
  onReset?: () => void;
  marks?: Record<string, { at: number; label: string }[]>;
}

type MarkStyle = CSSProperties & {
  '--mark-position': string;
  '--mark-shift': string;
};

function useRafThrottledCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
): { schedule: (...args: TArgs) => void; cancel: () => void } {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | null>(null);
  const latestArgsRef = useRef<TArgs | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = null;
    latestArgsRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const schedule = useCallback((...args: TArgs) => {
    latestArgsRef.current = args;
    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      const latestArgs = latestArgsRef.current;
      frameRef.current = null;
      latestArgsRef.current = null;
      if (latestArgs) callbackRef.current(...latestArgs);
    });
  }, []);

  return { schedule, cancel };
}

function defaultNumberFormat(value: number): string {
  return Number.parseFloat(value.toPrecision(4)).toString();
}

function markShift(position: number): string {
  if (position <= 8) return '0%';
  if (position >= 92) return '-100%';
  return '-50%';
}

function RangeControl({
  param,
  marks,
  onChange,
  registerReset,
}: {
  param: Extract<ParameterDefinition, { kind: 'range' }>;
  marks: { at: number; label: string }[];
  onChange: ParameterPanelProps['onChange'];
  registerReset: (reset: () => void) => () => void;
}) {
  const [localState, setLocalState] = useState({
    sourceValue: param.value,
    value: param.value,
  });
  const localValue = Object.is(localState.sourceValue, param.value)
    ? localState.value
    : param.value;
  const scale = param.scale ?? 'linear';
  const format = param.format ?? defaultNumberFormat;
  const displayValue = format(localValue);
  const marksId = `${param.id}-marks`;
  const validMarks = marks.filter(
    (mark) => Number.isFinite(mark.at) && mark.at >= param.min && mark.at <= param.max,
  );

  const sliderValue =
    scale === 'log'
      ? valueToLogPosition(localValue, param.min, param.max, LOG_SLIDER_RESOLUTION)
      : localValue;
  const sliderMin = scale === 'log' ? 0 : param.min;
  const sliderMax = scale === 'log' ? LOG_SLIDER_RESOLUTION : param.max;
  const sliderStep = scale === 'log' ? 1 : (param.step ?? 1);

  const { schedule: emitChange, cancel: cancelPendingChange } = useRafThrottledCallback(
    (value: number) => {
      onChange(param.id, value);
    },
  );
  const resetPendingChange = useCallback(() => {
    cancelPendingChange();
    setLocalState({ sourceValue: param.value, value: param.value });
  }, [cancelPendingChange, param.value]);

  useEffect(
    () => registerReset(resetPendingChange),
    [registerReset, resetPendingChange],
  );

  const handleChange = (rawValue: number) => {
    const value =
      scale === 'log'
        ? logPositionToValue(rawValue, param.min, param.max, LOG_SLIDER_RESOLUTION)
        : rawValue;
    setLocalState({ sourceValue: param.value, value });
    emitChange(value);
  };

  return (
    <div className={styles.parameterRow}>
      <div className={styles.labelRow}>
        <label htmlFor={param.id} className={styles.label}>
          {param.label}
        </label>
        <output htmlFor={param.id} className={styles.valueDisplay}>
          {displayValue}
        </output>
      </div>

      <input
        id={param.id}
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={sliderValue}
        onChange={(event) => handleChange(event.currentTarget.valueAsNumber)}
        className={styles.rangeInput}
        aria-valuetext={displayValue}
        aria-describedby={validMarks.length > 0 ? marksId : undefined}
      />

      {validMarks.length > 0 && (
        <div id={marksId} className={styles.marks}>
          {validMarks.map((mark) => {
            const position = valueToPercentage(mark.at, param.min, param.max, scale);
            const style: MarkStyle = {
              '--mark-position': `${position}%`,
              '--mark-shift': markShift(position),
            };

            return (
              <span
                key={`${mark.at}-${mark.label}`}
                className={styles.mark}
                style={style}
                aria-label={`${format(mark.at)}: ${mark.label}`}
              >
                <span className={styles.markTick} aria-hidden="true" />
                <span className={styles.markLabel}>{mark.label}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ParameterPanel({ params, onChange, onReset, marks = {} }: ParameterPanelProps) {
  const rangeResetCallbacksRef = useRef(new Set<() => void>());
  const registerRangeReset = useCallback((reset: () => void) => {
    rangeResetCallbacksRef.current.add(reset);
    return () => rangeResetCallbacksRef.current.delete(reset);
  }, []);
  const handleReset = useCallback(() => {
    rangeResetCallbacksRef.current.forEach((reset) => reset());
    onReset?.();
  }, [onReset]);

  return (
    <section className={styles.panel} aria-label="파라미터 설정">
      {onReset && (
        <div className={styles.toolbar}>
          <button type="button" onClick={handleReset} className={styles.resetButton}>
            초기화
          </button>
        </div>
      )}

      <div className={styles.parameterGroup}>
        {params.map((param) => {
          if (param.kind === 'range') {
            return (
              <RangeControl
                key={param.id}
                param={param}
                marks={marks[param.id] ?? []}
                onChange={onChange}
                registerReset={registerRangeReset}
              />
            );
          }

          if (param.kind === 'toggle') {
            return (
              <label key={param.id} htmlFor={param.id} className={styles.toggleRow}>
                <span className={styles.label}>{param.label}</span>
                <input
                  id={param.id}
                  type="checkbox"
                  checked={param.value}
                  onChange={(event) => onChange(param.id, event.currentTarget.checked)}
                  className={styles.toggleInput}
                />
              </label>
            );
          }

          return (
            <div key={param.id} className={styles.parameterRow}>
              <label htmlFor={param.id} className={styles.label}>
                {param.label}
              </label>
              <select
                id={param.id}
                value={param.value}
                onChange={(event) => onChange(param.id, event.currentTarget.value)}
                className={styles.selectInput}
              >
                {param.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
