/**
 * 프리필 · 디코드 타임라인의 순수 로직 (#52).
 *
 * 답이 나오는 과정은 두 박자다.
 *
 * - **프리필** — 질문 전체를 한꺼번에 처음 읽는다. 토큰들을 나눠서가 아니라 한 덩어리로
 *   처리하므로 한 블록이고, 길이는 입력 토큰 수에 비례한다
 * - **디코드** — 한 글자씩 쓴다. 글자마다 한 번씩이므로 균일한 칸이 출력 토큰 수만큼 이어진다
 *
 * 축은 **상대 시간**이다. 절대 초를 쓰지 않는다 (#47 §6-1) — 한 토큰에 걸리는 실제 시간은
 * 모델 · 하드웨어 · 배치 크기에 따라 전부 달라지므로 값을 박으면 거짓이 된다. 여기서 지키는
 * 것은 비율뿐이다.
 */

export interface Phase {
  kind: 'prefill' | 'decode';
  /** 상대 시간 단위. 절대 초가 아니다. */
  start: number;
  width: number;
  /** decode 인 경우 몇 번째 출력 토큰인지. 0-based. */
  index?: number;
}

export interface TimelineOptions {
  /** 입력 토큰 하나가 프리필에서 차지하는 상대 시간. */
  prefillPerToken?: number;
  /** 출력 토큰 하나가 디코드에서 차지하는 상대 시간. */
  decodePerToken?: number;
}

/**
 * 디코드 한 칸이 프리필 한 토큰보다 비싸다.
 *
 * 프리필은 토큰들을 한 번에 밀어 넣어 계산기를 꽉 채워 쓰지만, 디코드는 글자 하나마다
 * 모델 전체를 한 번씩 훑어야 해서 토큰당 단가가 훨씬 높다. 실제 배수는 모델과 하드웨어에
 * 따라 열 배에서 백 배까지 벌어진다 — 여기서는 그중 보수적인 쪽을 쓴다.
 */
export const DEFAULT_PREFILL_PER_TOKEN = 1;
export const DEFAULT_DECODE_PER_TOKEN = 10;

/** 슬라이더로 다룰 토큰 수 범위. 프리셋이 전부 이 안에 들어와야 한다(테스트가 지킨다). */
export const MIN_TOKENS = 4;
export const MAX_INPUT_TOKENS = 2000;
export const MAX_OUTPUT_TOKENS = 400;

/** 토큰 수로 쓸 수 있게 정수·비음수로 자른다. */
function toTokenCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/**
 * 입력 · 출력 토큰 수로 타임라인을 만든다.
 *
 * 구간들은 겹치지 않고 빈틈 없이 이어진다. 입력이 0 이면 프리필 블록이 없고,
 * 출력이 0 이면 디코드 구간이 없다.
 */
export function buildTimeline(
  inputTokens: number,
  outputTokens: number,
  opts: TimelineOptions = {}
): Phase[] {
  const prefillPerToken = opts.prefillPerToken ?? DEFAULT_PREFILL_PER_TOKEN;
  const decodePerToken = opts.decodePerToken ?? DEFAULT_DECODE_PER_TOKEN;
  const input = toTokenCount(inputTokens);
  const output = toTokenCount(outputTokens);

  const phases: Phase[] = [];
  let start = 0;

  if (input > 0) {
    const width = input * prefillPerToken;
    phases.push({ kind: 'prefill', start, width });
    start += width;
  }

  for (let index = 0; index < output; index += 1) {
    phases.push({ kind: 'decode', start, width: decodePerToken, index });
    start += decodePerToken;
  }

  return phases;
}

/**
 * 첫 글자가 나오는 시각 (Time To First Token).
 *
 * 프리필이 끝나고 디코드 첫 칸까지 끝나야 첫 글자가 손에 들어온다.
 * 디코드 구간이 없으면 첫 글자도 없으므로, 마커를 둘 수 있는 마지막 지점인
 * 타임라인의 끝을 돌려준다.
 */
export function ttft(phases: Phase[]): number {
  const first = phases.find(phase => phase.kind === 'decode');
  if (!first) return totalDuration(phases);
  return first.start + first.width;
}

/** 타임라인 전체 길이. 빈 타임라인이면 0. */
export function totalDuration(phases: Phase[]): number {
  const last = phases[phases.length - 1];
  return last ? last.start + last.width : 0;
}

/** 전체 중 첫 글자를 기다리는 데 쓰이는 몫. 0~1. 빈 타임라인이면 0. */
export function waitShare(phases: Phase[]): number {
  const total = totalDuration(phases);
  return total > 0 ? ttft(phases) / total : 0;
}

export interface Preset {
  id: string;
  /** 파라미터 패널 select 에 보이는 이름. */
  label: string;
  /** 화면에 그대로 보여줄 사용자의 요청. */
  prompt: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * 시리즈 다섯 편이 공유하는 예시 (#47 §4). 같은 문장이 편마다 다른 각도로 나와야
 * 시리즈가 하나로 읽힌다.
 *
 * 토큰 수는 실제 모델을 재서 얻은 값이 아니라 길이의 대소만 맞춘 어림값이다.
 * 이 주제가 보여주려는 것은 절대량이 아니라 **입력이 긴 쪽과 출력이 긴 쪽의 대비**다.
 */
export const PRESETS: readonly Preset[] = [
  {
    id: 'weather',
    label: '짧게 묻고 짧게 답하기',
    prompt: '오늘 날씨 어때?',
    inputTokens: 8,
    outputTokens: 20,
  },
  {
    id: 'summary',
    label: '긴 기사를 세 줄로 요약하기',
    prompt: '(기사 전문 붙여넣기) 세 줄로 요약해줘',
    inputTokens: 900,
    outputTokens: 60,
  },
  {
    id: 'poem',
    label: '짧게 묻고 길게 답하기',
    prompt: '봄에 대한 시 한 편 써줘',
    inputTokens: 10,
    outputTokens: 200,
  },
  {
    id: 'chat',
    label: '20턴짜리 대화 이어가기',
    prompt: '(앞의 대화 20턴) 그럼 그건 어떻게 해?',
    inputTokens: 2000,
    outputTokens: 40,
  },
];

/** 슬라이더로 직접 조절 중임을 나타내는 값. 프리셋 id 와 겹치지 않는다. */
export const CUSTOM_PRESET_ID = 'custom';

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find(preset => preset.id === id);
}
