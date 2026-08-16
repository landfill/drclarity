export type NumericScale = 'linear' | 'log';

const FLOAT_64_VIEW = new DataView(new ArrayBuffer(8));

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

function decimalParts(value: number): { coefficient: bigint; exponent: number } {
  const [coefficientText, exponentText = '0'] = value.toString().toLowerCase().split('e');
  const negative = coefficientText.startsWith('-');
  const unsignedCoefficient = negative ? coefficientText.slice(1) : coefficientText;
  const [whole, fraction = ''] = unsignedCoefficient.split('.');
  const coefficient = BigInt(`${negative ? '-' : ''}${whole}${fraction}`);
  return { coefficient, exponent: Number(exponentText) - fraction.length };
}

function scaleDecimal(
  value: { coefficient: bigint; exponent: number },
  exponent: number,
): bigint {
  return value.coefficient * BigInt(10) ** BigInt(value.exponent - exponent);
}

function decimalToNumber(coefficient: bigint, exponent: number): number {
  return Number(`${coefficient.toString()}e${exponent}`);
}

function bigintDistance(left: bigint, right: bigint): bigint {
  const difference = left - right;
  return difference < BigInt(0) ? -difference : difference;
}

function binaryParts(value: number): { significand: bigint; exponent: number } {
  FLOAT_64_VIEW.setFloat64(0, value);
  const high = FLOAT_64_VIEW.getUint32(0);
  const low = FLOAT_64_VIEW.getUint32(4);
  const negative = (high >>> 31) === 1;
  const exponentBits = (high >>> 20) & 0x7ff;
  const fraction =
    (BigInt(high & 0x000f_ffff) << BigInt(32)) | BigInt(low);
  const significand =
    exponentBits === 0 ? fraction : BigInt('4503599627370496') + fraction;
  return {
    significand: negative ? -significand : significand,
    exponent: exponentBits === 0 ? -1074 : exponentBits - 1023 - 52,
  };
}

function isBinaryStepAligned(value: number, min: number, step: number): boolean {
  const valueParts = binaryParts(value);
  const minParts = binaryParts(min);
  const stepParts = binaryParts(step);
  const commonExponent = Math.min(
    valueParts.exponent,
    minParts.exponent,
    stepParts.exponent,
  );
  const scaledValue = valueParts.significand << BigInt(valueParts.exponent - commonExponent);
  const scaledMin = minParts.significand << BigInt(minParts.exponent - commonExponent);
  const scaledStep = stepParts.significand << BigInt(stepParts.exponent - commonExponent);
  return (scaledValue - scaledMin) % scaledStep === BigInt(0);
}

function logarithmicDistance(upper: number, lower: number): number {
  const difference = upper - lower;
  const relativeDifference = difference / lower;
  return Number.isFinite(relativeDifference)
    ? Math.log1p(relativeDifference)
    : Math.log(upper) - Math.log(lower);
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
  if (isBinaryStepAligned(boundedValue, min, step)) return boundedValue;

  const valueParts = decimalParts(boundedValue);
  const minParts = decimalParts(min);
  const maxParts = decimalParts(max);
  const stepParts = decimalParts(step);
  const commonExponent = Math.min(
    valueParts.exponent,
    minParts.exponent,
    maxParts.exponent,
    stepParts.exponent,
  );
  const scaledValue = scaleDecimal(valueParts, commonExponent);
  const scaledMin = scaleDecimal(minParts, commonExponent);
  const scaledMax = scaleDecimal(maxParts, commonExponent);
  const scaledStep = scaleDecimal(stepParts, commonExponent);
  const difference = scaledValue - scaledMin;
  let stepCount = difference / scaledStep;
  if ((difference % scaledStep) * BigInt(2) >= scaledStep) stepCount += BigInt(1);

  const steppedValue = scaledMin + stepCount * scaledStep;
  const steppedCandidate = steppedValue > scaledMax ? scaledMax : steppedValue;
  const selectedValue =
    bigintDistance(scaledValue, scaledMax) <= bigintDistance(scaledValue, steppedCandidate)
      ? scaledMax
      : steppedCandidate;
  return clamp(decimalToNumber(selectedValue, commonExponent), min, max);
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
  if (progress === 0) return min;
  if (progress === 1) return max;

  const logRange = logarithmicDistance(max, min);
  const ratio = max / min;
  const value = Number.isFinite(ratio)
    ? min * Math.exp(progress * logRange)
    : Math.exp(Math.log(min) + progress * logRange);
  return clamp(value, min, max);
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
  if (boundedValue === min) return 0;
  if (boundedValue === max) return resolution;

  const progress = logarithmicDistance(boundedValue, min) / logarithmicDistance(max, min);
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
  const boundedValue = clamp(value, min, max);
  const span = max - min;
  if (Number.isFinite(span)) {
    return ((boundedValue - min) / span) * 100;
  }

  const magnitude = Math.max(Math.abs(min), Math.abs(max));
  const scaledMin = min / magnitude;
  return ((boundedValue / magnitude - scaledMin) / (max / magnitude - scaledMin)) * 100;
}
