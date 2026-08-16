export type NumericScale = 'linear' | 'log';

function assertBounds(min: number, max: number, scale: NumericScale): void {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    throw new Error('Scale bounds must be finite and max must be greater than min');
  }
  if (scale === 'log' && min <= 0) {
    throw new Error('Log scale bounds must be greater than 0');
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function decimalPlaces(value: number): number {
  const [coefficient, exponentText = '0'] = value.toString().toLowerCase().split('e');
  const fractionLength = coefficient.split('.')[1]?.length ?? 0;
  return Math.max(0, fractionLength - Number(exponentText));
}

export function snapValueToStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  assertBounds(min, max, 'linear');
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    throw new Error('Range value and step must be finite, with step greater than 0');
  }

  const boundedValue = clamp(value, min, max);
  if (boundedValue === min || boundedValue === max) return boundedValue;

  const precision = Math.max(decimalPlaces(min), decimalPlaces(max), decimalPlaces(step));
  const arithmeticPrecision = Math.min(
    15,
    Math.max(precision, Math.min(decimalPlaces(boundedValue), precision + 3)),
  );
  const scaleFactor = 10 ** arithmeticPrecision;
  const scaledValue = Math.round(boundedValue * scaleFactor);
  const scaledMin = Math.round(min * scaleFactor);
  const scaledMax = Math.round(max * scaleFactor);
  const scaledStep = Math.round(step * scaleFactor);
  const canUseIntegerArithmetic =
    Number.isSafeInteger(scaledValue) &&
    Number.isSafeInteger(scaledMin) &&
    Number.isSafeInteger(scaledMax) &&
    Number.isSafeInteger(scaledStep) &&
    scaledStep > 0;
  const stepCount = canUseIntegerArithmetic
    ? Math.round((scaledValue - scaledMin) / scaledStep)
    : Math.round((boundedValue - min) / step);
  const snappedValue = min + stepCount * step;
  const clampedValue = clamp(snappedValue, min, max);
  const normalizedValue =
    precision <= 100 ? Number(clampedValue.toFixed(precision)) : clampedValue;
  return clamp(normalizedValue, min, max);
}

export function logPositionToValue(
  position: number,
  min: number,
  max: number,
  resolution = 1000,
): number {
  assertBounds(min, max, 'log');
  if (!Number.isFinite(position) || !Number.isFinite(resolution) || resolution <= 0) {
    throw new Error(
      'Log scale position and resolution must be finite, with resolution greater than 0',
    );
  }

  const progress = clamp(position, 0, resolution) / resolution;
  return Math.exp(Math.log(min) + progress * (Math.log(max) - Math.log(min)));
}

export function valueToLogPosition(
  value: number,
  min: number,
  max: number,
  resolution = 1000,
): number {
  assertBounds(min, max, 'log');
  if (!Number.isFinite(value) || !Number.isFinite(resolution) || value <= 0 || resolution <= 0) {
    throw new Error(
      'Log scale value must be positive and resolution must be finite and greater than 0',
    );
  }

  const boundedValue = clamp(value, min, max);
  const progress = (Math.log(boundedValue) - Math.log(min)) / (Math.log(max) - Math.log(min));
  return progress * resolution;
}

export function valueToPercentage(
  value: number,
  min: number,
  max: number,
  scale: NumericScale = 'linear',
): number {
  assertBounds(min, max, scale);
  if (!Number.isFinite(value) || (scale === 'log' && value <= 0)) {
    throw new Error('Scale value must be finite and positive for a log scale');
  }

  if (scale === 'log') {
    return valueToLogPosition(value, min, max, 100);
  }
  return ((clamp(value, min, max) - min) / (max - min)) * 100;
}
