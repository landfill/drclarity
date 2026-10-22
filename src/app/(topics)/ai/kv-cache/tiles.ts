/*
 * 타일 판 figure 의 상태. 세밀 조절 패널(캐시 토글 · 토큰 수 · 진행 슬라이더)과 같은 상태를 쓰므로 KvCacheClient 가
 * useFigureState 로 갖고, figure 와 패널이 함께 dispatch 한다. 그리기는 tilesScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 그대로): "같은 N토큰을 캐시 없이 / 캐시 켜고 처리해 보세요. 새로 계산한 칸과 저장한 메모를 비교합니다."
 *   - 1. 캐시 없이: 끝까지 처리한 판. 줄마다 그 줄의 칸을 모두 새로 만든다(+).
 *   - 2. 캐시 켜고: 끝까지 처리한 판. 줄마다 새 토큰의 칸 하나만 새로 만들고(+), 나머지는 메모 상자에서 꺼내 다시 쓴다(↶).
 *     새로 만든 K·V 는 메모 상자에 한 장씩 쌓인다(메모리).
 *   - 재생 · 한 토큰 더 · 처음으로: 한 줄씩 따라간다.
 * 칸 계산은 grid.ts 의 buildGrid · computedCount · reusedCount · cachedEntries 를 그대로 쓴다.
 */
import { MAX_LENGTH, MIN_LENGTH, cachedEntries, computedCount, reusedCount } from './grid';

/** 재생에서 한 토큰을 넘기는 간격 (초). 예전 화면과 같다. */
export const PLAY_SECONDS = 0.45;
export const DEFAULT_LENGTH = 8;

export interface KvState {
  length: number;
  step: number;
  cacheOn: boolean;
  playing: boolean;
  timer: number;
  note: string;
}

export const initialKv = (): KvState => ({ length: DEFAULT_LENGTH, step: 4, cacheOn: false, playing: false, timer: 0, note: '' });

export const isSettled = (s: KvState) => !s.playing;

export function advanceKv(s: KvState, dt: number): KvState {
  if (!s.playing || dt <= 0) return s;
  const timer = s.timer + dt;
  if (timer < PLAY_SECONDS) return { ...s, timer };
  const step = Math.min(s.length, s.step + 1);
  return { ...s, step, timer: 0, playing: step < s.length };
}

/** "1. 캐시 없이" / "2. 캐시 켜고": 같은 길이를 끝까지 처리한 판. 이미 그 상태면 이유를 알린다. */
export function compare(s: KvState, cacheOn: boolean): KvState {
  if (s.cacheOn === cacheOn && s.step === s.length && !s.playing) {
    return { ...s, note: `이미 "${cacheOn ? '2. 캐시 켜고' : '1. 캐시 없이'}" 로 ${s.length}토큰을 끝까지 처리했습니다. ${cacheOn ? '1. 캐시 없이' : '2. 캐시 켜고'}와 견줘 보세요.` };
  }
  return { ...s, cacheOn, step: s.length, playing: false, timer: 0, note: '' };
}

/** "한 토큰 더". 끝이면 이유를 알린다. */
export function stepOnce(s: KvState): KvState {
  if (s.step >= s.length) return { ...s, playing: false, note: `${s.length}토큰을 모두 처리했습니다. 처음으로 돌아가 다시 볼 수 있습니다.` };
  return { ...s, step: s.step + 1, playing: false, timer: 0, note: '' };
}

/** "처음으로". 이미 처음이면 이유를 알린다. */
export function rewind(s: KvState): KvState {
  if (s.step === 0 && !s.playing) return { ...s, note: '이미 처음입니다. 아직 처리한 토큰이 없습니다.' };
  return { ...s, step: 0, playing: false, timer: 0, note: '' };
}

/** "재생" / "일시정지". 끝에서 누르면 처음부터 다시 재생한다(예전 '처음부터 재생'). */
export function togglePlay(s: KvState): KvState {
  if (s.playing) return { ...s, playing: false, timer: 0, note: '' };
  return { ...s, step: s.step >= s.length ? 0 : s.step, playing: true, timer: 0, note: '' };
}

/** 세밀 조절 패널. 길이를 줄이면 진행도 같이 당긴다(예전 화면 그대로). */
export const setCache = (s: KvState, on: boolean): KvState => ({ ...s, cacheOn: on, note: '' });
export const setLength = (s: KvState, n: number): KvState => {
  const length = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.round(n)));
  return { ...s, length, step: Math.min(s.step, length), playing: false, timer: 0, note: '' };
};
export const setStep = (s: KvState, n: number): KvState => ({ ...s, step: Math.max(0, Math.min(s.length, Math.round(n))), playing: false, timer: 0, note: '' });

/** 지금 누르면 받아들여지는 버튼: 본문대로 캐시 없이 → 캐시 켜고. 재생 중이면 일시정지. */
export function nextAction(s: KvState): 'off' | 'on' | 'pause' {
  if (s.playing) return 'pause';
  // 캐시 없이 끝까지 본 뒤에는 캐시 켜고. 그 밖에는 캐시 없이(이미 그 상태가 아니므로 받아들여진다).
  if (s.step === s.length && !s.cacheOn) return 'on';
  return 'off';
}

/** 지금 판의 수치 (예전 화면의 네 칸 그대로). */
export function readouts(s: KvState) {
  const computed = computedCount(s.step, s.cacheOn);
  const ratio = computed > 0 ? computedCount(s.step, false) / computed : 1;
  return { computed, reused: reusedCount(s.step, s.cacheOn), memos: cachedEntries(s.step, s.cacheOn), ratio: s.cacheOn && ratio > 1 ? `${ratio.toFixed(1)}배` : '—' };
}

/** 관찰 문구 (예전 화면 그대로). */
export const observation = (s: KvState) =>
  `${s.step}토큰까지 K·V를 만드는 작업: 캐시 없이 ${computedCount(s.step, false)}칸 → 캐시를 켜면 ${computedCount(s.step, true)}칸. 대신 ${s.step}토큰의 메모를 보관합니다.`;

/** 그림의 대체 글 (예전 격자의 대체 글 그대로). */
export function gridAlt(s: KvState): string {
  const { length, step, cacheOn } = s;
  if (step === 0) return `${length}칸짜리 격자가 비어 있습니다. 아직 토큰을 처리하지 않았습니다.`;
  const seen = (step * (step + 1)) / 2;
  return cacheOn
    ? `${length}토큰 중 ${step}번째까지 처리했습니다. 본 칸 ${seen}개 가운데 ${computedCount(step, true)}개만 새로 계산했고 나머지는 적어둔 값을 다시 읽었습니다.`
    : `${length}토큰 중 ${step}번째까지 처리했습니다. 본 칸 ${seen}개를 전부 새로 계산했습니다.`;
}

export const statusText = (s: KvState) => s.note || observation(s);
