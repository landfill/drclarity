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
