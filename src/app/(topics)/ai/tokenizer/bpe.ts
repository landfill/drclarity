/*
 * 바이트 타일과 규칙표 figure 의 상태. 그리기는 bpeScene.ts 가 맡는다.
 *
 * 실제 순서 (tokenizer.ts 의 encode 그대로):
 *   1. 입력을 UTF-8 바이트로 바꿔 타일 하나에 바이트 하나씩 늘어놓는다.
 *   2. 이웃한 두 묶음이 규칙표에 있으면 합친다. 규칙표의 앞쪽 규칙부터, 같으면 왼쪽부터 한 번에 하나씩.
 *   3. 더 합칠 쌍이 규칙표에 없으면 멈춘다. 남은 묶음 하나가 토큰 하나다.
 * 규칙표는 미리 정해 둔 것이다. 입력할 때 새로 배우거나 바뀌지 않는다.
 *
 * 입력은 바깥(위의 예시 버튼과 입력 칸)이 정한다. figure 는 묶는 과정의 진행만 갖는다.
 */
import { MERGES, byteLength, encode, encodeTrace, type MergeStep, type Token } from './tokenizer';

/** 그림에 늘어놓는 바이트 수의 상한. 더 긴 글은 앞쪽의 온전한 토큰만, 과정 없이 보인다. */
export const MAX_FIG_BYTES = 12;
/** 1초에 합치는 횟수. 합칠 것이 많으면 다 합쳐 MAX_RUN 초를 넘지 않게 빨라진다. */
const MERGES_PER_SECOND = 4;
const MAX_RUN = 2;

export interface BpeState {
  text: string;
  /** 지금까지 합친 횟수 (움직이는 동안은 소수). */
  step: number;
  running: boolean;
  note: string;
}

/** 그림에 보일 것: 짧은 글은 바이트와 병합 과정, 긴 글은 앞쪽의 토큰. */
export interface BpePlan {
  bytes: number[];
  steps: MergeStep[];
  /** 글이 길어 과정 없이 앞쪽만 보이는가. */
  clipped: boolean;
  /** 그림에 보일 마지막 모습 (clipped 면 앞쪽의 온전한 토큰들). */
  final: Token[];
}

const encoder = new TextEncoder();

export function planFor(text: string): BpePlan {
  if (byteLength(text) <= MAX_FIG_BYTES) {
    const steps = encodeTrace(text);
    const bytes = Array.from(encoder.encode(text));
    return { bytes, steps, clipped: false, final: steps.length ? steps[steps.length - 1].tokens : bytes.map((b) => [b]) };
  }
  const head: Token[] = [];
  let used = 0;
  for (const t of encode(text)) {
    if (used + t.length > MAX_FIG_BYTES) break;
    head.push(t);
    used += t.length;
  }
  return { bytes: head.flat(), steps: [], clipped: true, final: head };
}

/** step 번 합친 뒤의 묶음들. */
export function tokensAt(plan: BpePlan, step: number): Token[] {
  const k = Math.min(plan.steps.length, Math.max(0, Math.floor(step)));
  if (plan.clipped) return plan.final;
  return k === 0 ? plan.bytes.map((b) => [b]) : plan.steps[k - 1].tokens;
}

const total = (plan: BpePlan) => plan.steps.length;

/** 첫 화면: 다 묶은 끝 모습 (서버 렌더와 같다). */
export const initialBpe = (text: string): BpeState => ({ text, step: total(planFor(text)), running: false, note: '' });

export const isSettled = (s: BpeState) => !s.running;

/** 입력이 바뀌었다: 바이트로 풀어 늘어놓고 처음부터 묶는다. 긴 글은 끝 모습으로 둔다. */
export function retarget(s: BpeState, text: string): BpeState {
  if (s.text === text) return s;
  const plan = planFor(text);
  return plan.clipped || total(plan) === 0
    ? { text, step: total(plan), running: false, note: '' }
    : { text, step: 0, running: true, note: '' };
}

export function advanceBpe(s: BpeState, dt: number): BpeState {
  if (!s.running || dt <= 0) return s;
  const n = total(planFor(s.text));
  const speed = Math.max(MERGES_PER_SECOND, n / MAX_RUN);
  const step = s.step + speed * dt;
  return step >= n ? { ...s, step: n, running: false } : { ...s, step };
}

/* ---------- 버튼 ---------- */

const isDone = (s: BpeState) => !s.running && s.step >= total(planFor(s.text));

/** "바이트로 풀기": 묶음을 모두 풀어 바이트 타일로 되돌린다. */
export function unpack(s: BpeState): BpeState {
  const plan = planFor(s.text);
  if (plan.clipped) return { ...s, note: `글이 길어 그림에는 앞쪽 토큰만 보입니다. 바이트 ${MAX_FIG_BYTES}개 이하의 글에서 과정을 볼 수 있습니다.` };
  if (plan.bytes.length === 0) return { ...s, note: '입력이 없어 풀 것이 없습니다.' };
  if (!s.running && s.step === 0) return { ...s, note: '이미 바이트 타일로 풀려 있습니다.' };
  return { ...s, step: 0, running: false, note: '' };
}

/** "한 번 묶기": 규칙표에서 지금 쓸 수 있는 가장 앞쪽 규칙 하나로 한 쌍을 합친다. */
export function mergeOnce(s: BpeState): BpeState {
  if (s.running) return { ...s, note: '묶는 중입니다. 다 묶은 뒤에 한 번씩 볼 수 있습니다.' };
  if (isDone(s)) return { ...s, note: noMoreNote(s) };
  return { ...s, step: Math.floor(s.step) + 1, note: '' };
}

/** "끝까지 묶기". */
export function mergeAll(s: BpeState): BpeState {
  if (s.running) return { ...s, note: '이미 묶는 중입니다.' };
  if (isDone(s)) return { ...s, note: noMoreNote(s) };
  return { ...s, running: true, note: '' };
}

function noMoreNote(s: BpeState): string {
  const plan = planFor(s.text);
  if (plan.clipped) return '글이 길어 그림에는 다 묶은 앞쪽 토큰만 보입니다.';
  if (plan.bytes.length === 0) return '입력이 없어 묶을 것이 없습니다.';
  return '더 합칠 쌍이 규칙표에 없습니다. 지금 묶음 하나가 토큰 하나입니다.';
}

/** 지금 누르면 받아들여지는 버튼. 묶는 중에는 없다. 다 묶었으면 풀어서 다시 보기를 권한다. */
export function nextAction(s: BpeState): 'once' | 'unpack' | null {
  const plan = planFor(s.text);
  if (s.running || plan.clipped || plan.bytes.length === 0) return null;
  if (s.step < total(plan)) return 'once';
  return total(plan) > 0 ? 'unpack' : null;
}

/* ---------- 글자 ---------- */

const strict = new TextDecoder('utf-8', { fatal: true });

/** 묶음 하나를 글자로 읽을 수 있으면 글자로 (공백은 ·), 아니면 null. */
export function pieceText(token: Token): string | null {
  try {
    return strict.decode(new Uint8Array(token)).replace(/ /g, '·').replace(/\n/g, '⏎');
  } catch {
    return null;
  }
}

/** 타일 하나에 적는 것: 보이는 ASCII 는 그 글자, 공백은 ·, 나머지는 16진수. */
export function byteLabel(byte: number): string {
  if (byte === 0x20) return '·';
  if (byte > 0x20 && byte < 0x7f) return String.fromCharCode(byte);
  return byte.toString(16).toUpperCase().padStart(2, '0');
}

const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
/** 규칙 한 쪽을 적는다: 글자로 읽히는 앞부분은 글자로, 글자가 되지 못한 나머지 바이트는 16진수로. */
export function sideText(token: Token): string {
  for (let cut = token.length; cut > 0; cut--) {
    const head = pieceText(token.slice(0, cut));
    if (head !== null) return cut === token.length ? head : `${head} ${hex(token.slice(cut))}`;
  }
  return hex(token);
}

/** 방금 쓴 규칙 (없으면 null). */
export function lastRule(plan: BpePlan, step: number): { number: number; text: string } | null {
  const k = Math.min(plan.steps.length, Math.floor(step));
  if (k <= 0 || plan.clipped) return null;
  const { rank, rule } = plan.steps[k - 1];
  return { number: rank + 1, text: `${sideText(rule.left)} + ${sideText(rule.right)}` };
}

export const RULE_COUNT = MERGES.length;

/** 상태 줄의 문구. 묶는 동안에는 바뀌지 않는다 (화면 낭독이 단계마다 끼어들지 않게). */
export function statusText(s: BpeState): string {
  if (s.note) return s.note;
  const plan = planFor(s.text);
  if (plan.bytes.length === 0) return '입력이 없으면 타일도 없습니다. 예시를 고르거나 직접 입력하세요.';
  if (plan.clipped) return `글이 길어 그림에는 앞 바이트 ${MAX_FIG_BYTES}개 안의 토큰 ${plan.final.length}개만 보입니다. 전체는 아래 블록 줄에 있습니다.`;
  if (s.running) return '규칙표의 앞쪽 규칙부터 한 쌍씩 합치는 중입니다.';
  const n = total(plan);
  const k = Math.floor(s.step);
  const pieces = tokensAt(plan, k).length;
  if (n === 0) return `바이트 ${plan.bytes.length}개 사이에 규칙표에 있는 쌍이 없어 하나도 합치지 않았습니다. 바이트 하나가 토큰 하나입니다.`;
  if (k === 0) return `바이트 ${plan.bytes.length}개를 타일 하나에 하나씩 늘어놓았습니다. 아직 아무것도 합치지 않았습니다.`;
  if (k < n) return `${k}번 합쳐 묶음 ${pieces}개가 됐습니다. 규칙표에 쓸 수 있는 규칙이 아직 남아 있습니다.`;
  return `바이트 ${plan.bytes.length}개에서 시작해 규칙표대로 ${n}번 합쳐 토큰 ${pieces}개가 됐습니다. 규칙표에 없는 쌍은 합치지 않습니다.`;
}
