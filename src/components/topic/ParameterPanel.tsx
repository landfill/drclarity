'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import {
  logPositionToValue,
  snapValueToStep,
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

function useRafThrottledValue<T>(
  controlledValue: T,
  onCommit: (value: T) => void,
): { value: T; update: (value: T) => void; reset: () => void } {
  const [localState, setLocalState] = useState<{
    controlledValue: T;
    optimisticValue: T;
    hasOptimisticValue: boolean;
  }>({ controlledValue, optimisticValue: controlledValue, hasOptimisticValue: false });
  const controlledValueIsCurrent = Object.is(localState.controlledValue, controlledValue);
  if (!controlledValueIsCurrent) {
    setLocalState({
      controlledValue,
      optimisticValue: controlledValue,
      hasOptimisticValue: false,
    });
  }
  const value =
    controlledValueIsCurrent && localState.hasOptimisticValue
      ? localState.optimisticValue
      : controlledValue;

  const { schedule, cancel } = useRafThrottledCallback((nextValue: T) => {
    setLocalState((currentState) => ({
      ...currentState,
      hasOptimisticValue: false,
    }));
    onCommit(nextValue);
  });
  const previousControlledValueRef = useRef(controlledValue);

  useLayoutEffect(() => {
    if (!Object.is(previousControlledValueRef.current, controlledValue)) {
      cancel();
      previousControlledValueRef.current = controlledValue;
    }
  }, [cancel, controlledValue]);

  const update = useCallback(
    (nextValue: T) => {
      setLocalState({
        controlledValue,
        optimisticValue: nextValue,
        hasOptimisticValue: true,
      });
      schedule(nextValue);
    },
    [controlledValue, schedule],
  );
  const reset = useCallback(() => {
    cancel();
    setLocalState((currentState) => ({
      ...currentState,
      hasOptimisticValue: false,
    }));
  }, [cancel]);

  return { value, update, reset };
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
  domId,
}: {
  param: Extract<ParameterDefinition, { kind: 'range' }>;
  marks: { at: number; label: string }[];
  onChange: ParameterPanelProps['onChange'];
  registerReset: (reset: () => void) => () => void;
  domId: string;
}) {
  const {
    value: localValue,
    update: updateThrottledValue,
    reset: resetPendingChange,
  } = useRafThrottledValue(param.value, (value) => onChange(param.id, value));
  const scale = param.scale ?? 'linear';
  const format = param.format ?? defaultNumberFormat;
  const displayValue = format(localValue);
  const marksId = `${domId}-marks`;
  const validMarks = marks.filter(
    (mark) => Number.isFinite(mark.at) && mark.at >= param.min && mark.at <= param.max,
  );

  const sliderValue =
    scale === 'log'
      ? valueToLogPosition(localValue, param.min, param.max, LOG_SLIDER_RESOLUTION)
      : localValue;
  const sliderMin = scale === 'log' ? 0 : param.min;
  const sliderMax = scale === 'log' ? LOG_SLIDER_RESOLUTION : param.max;
  const sliderStep = scale === 'log' && param.step === undefined ? 1 : 'any';

  useEffect(
    () => registerReset(resetPendingChange),
    [registerReset, resetPendingChange],
  );

  const updateValue = (value: number) => {
    const steppedValue =
      param.step === undefined
        ? value
        : snapValueToStep(value, param.min, param.max, param.step);
    updateThrottledValue(steppedValue);
  };

  const handleChange = (rawValue: number) => {
    const value =
      scale === 'log'
        ? rawValue <= 0
          ? param.min
          : rawValue >= LOG_SLIDER_RESOLUTION
            ? param.max
            : logPositionToValue(rawValue, param.min, param.max, LOG_SLIDER_RESOLUTION)
        : rawValue;
    updateValue(value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (param.step === undefined) return;

    let nextValue: number;
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        nextValue = localValue + param.step;
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        nextValue = localValue - param.step;
        break;
      case 'PageUp':
        nextValue = localValue + param.step * 10;
        break;
      case 'PageDown':
        nextValue = localValue - param.step * 10;
        break;
      case 'Home':
        nextValue = param.min;
        break;
      case 'End':
        nextValue = param.max;
        break;
      default:
        return;
    }

    event.preventDefault();
    updateValue(nextValue);
  };

  return (
    <div className={styles.parameterRow}>
      <div className={styles.labelRow}>
        <label htmlFor={domId} className={styles.label}>
          {param.label}
        </label>
        <output htmlFor={domId} className={styles.valueDisplay}>
          {displayValue}
        </output>
      </div>

      <input
        id={domId}
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={sliderValue}
        onChange={(event) => handleChange(event.currentTarget.valueAsNumber)}
        onKeyDown={handleKeyDown}
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

function ToggleControl({
  param,
  onChange,
  registerReset,
  domId,
}: {
  param: Extract<ParameterDefinition, { kind: 'toggle' }>;
  onChange: ParameterPanelProps['onChange'];
  registerReset: (reset: () => void) => () => void;
  domId: string;
}) {
  const { value, update, reset } = useRafThrottledValue(param.value, (nextValue) =>
    onChange(param.id, nextValue),
  );

  useEffect(() => registerReset(reset), [registerReset, reset]);

  return (
    <label htmlFor={domId} className={styles.toggleRow}>
      <span className={styles.label}>{param.label}</span>
      <input
        id={domId}
        type="checkbox"
        checked={value}
        onChange={(event) => update(event.currentTarget.checked)}
        className={styles.toggleInput}
      />
    </label>
  );
}

function SelectControl({
  param,
  onChange,
  registerReset,
  domId,
}: {
  param: Extract<ParameterDefinition, { kind: 'select' }>;
  onChange: ParameterPanelProps['onChange'];
  registerReset: (reset: () => void) => () => void;
  domId: string;
}) {
  const { value, update, reset } = useRafThrottledValue(param.value, (nextValue) =>
    onChange(param.id, nextValue),
  );

  useEffect(() => registerReset(reset), [registerReset, reset]);

  return (
    <div className={styles.parameterRow}>
      <label htmlFor={domId} className={styles.label}>
        {param.label}
      </label>
      <select
        id={domId}
        value={value}
        onChange={(event) => update(event.currentTarget.value)}
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
}

export function ParameterPanel({ params, onChange, onReset, marks = {} }: ParameterPanelProps) {
  const panelId = useId();
  const resetCallbacksRef = useRef(new Set<() => void>());
  const registerReset = useCallback((reset: () => void) => {
    resetCallbacksRef.current.add(reset);
    return () => resetCallbacksRef.current.delete(reset);
  }, []);
  const handleReset = useCallback(() => {
    resetCallbacksRef.current.forEach((reset) => reset());
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
          const domId = `${panelId}-${param.id}`;

          if (param.kind === 'range') {
            return (
              <RangeControl
                key={param.id}
                param={param}
                marks={marks[param.id] ?? []}
                onChange={onChange}
                registerReset={registerReset}
                domId={domId}
              />
            );
          }

          if (param.kind === 'toggle') {
            return (
              <ToggleControl
                key={param.id}
                param={param}
                onChange={onChange}
                registerReset={registerReset}
                domId={domId}
              />
            );
          }

          return (
            <SelectControl
              key={param.id}
              param={param}
              onChange={onChange}
              registerReset={registerReset}
              domId={domId}
            />
          );
        })}
      </div>
    </section>
  );
}
