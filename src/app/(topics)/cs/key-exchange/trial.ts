/*
 * 숫자 카드 탁자 figure 의 상태. 공개 값 · 두 비밀은 위 세밀 조절(ParameterPanel)과 같은 값이라
 * RealMath 가 useFigureState 로 갖고, 패널과 figure 가 함께 dispatch 한다. 그리기는 trialScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 math-lead · punchline · eaves-explain 그대로):
 *   1. 보낼 수 만들기: 앨리스는 g^a mod p, 밥은 g^b mod p 를 자기 자리에서 계산해 파란 카드에 적는다.
 *      비밀 a · b 는 빨간 카드에 적혀 자기 자리에만 있다.
 *   2. 주고받기: 파란 카드 두 장이 통로를 지나 서로의 자리로 간다. 통로 위의 도청자가 두 수를 받아 적는다.
 *   3. 받은 수로 마무리: 앨리스는 받은 수^a, 밥은 받은 수^b (mod p) 를 계산해 같은 수에 도달한다(겨자색 카드).
 *      이 수는 통로를 지나지 않는다.
 *   4. 도청자가 풀어보게 하기: g^x mod p = (앨리스가 보낸 수) 를 만족하는 x 를 1 부터 하나씩 넣어 본다.
 * 수는 dh.ts 의 publicValue · sharedSecret · bruteForceDiscreteLog 를 그대로 쓴다.
 */
import { bruteForceDiscreteLog, clampSecret, findPreset, publicValue, sharedSecret, DH_PRESETS } from './dh';

export type TrialAction = 'make' | 'send' | 'finish' | 'attack';
export const ACTION_ORDER: readonly TrialAction[] = ['make', 'send', 'finish', 'attack'];
export const ACTION_LABEL: Record<TrialAction, string> = {
  make: '1. 보낼 수 만들기',
  send: '2. 주고받기',
  finish: '3. 받은 수로 마무리',
  attack: '4. 도청자가 풀어보게 하기',
};

/** 카드가 통로를 건너는 시간 (초). */
export const SEND_SECONDS = 0.9;
/** 도청자가 한 번 넣어 보는 시간 (초). 시도가 많으면 다 합쳐 ATTACK_MAX_SECONDS 안에 끝나도록 빨라진다. */
const TRY_SECONDS = 0.12;
const ATTACK_MAX_SECONDS = 4;

export interface TrialState {
  presetId: string;
  a: number;
  b: number;
  /** 0 대기 · 1 만들었음 · 2 주고받았음 · 3 마무리했음. */
  step: number;
  /** 주고받는 카드가 건너간 정도 (0..1). step 이 2 일 때만 쓴다. */
  travel: number;
  /** 도청자가 넣어 본 x 의 개수. 시작 전에는 null. */
  tried: number | null;
  note: string;
}

export const initialTrial = (): TrialState => ({ presetId: DH_PRESETS[0].id, a: 6, b: 15, step: 0, travel: 1, tried: null, note: '' });

/** 지금 값으로 계산한 수. */
export function values(s: Pick<TrialState, 'presetId' | 'a' | 'b'>) {
  const { p, g } = findPreset(s.presetId);
  const A = publicValue(g, s.a, p);
  const B = publicValue(g, s.b, p);
  const attack = bruteForceDiscreteLog(g, A, p);
  return { p, g, A, B, shared: sharedSecret(g, p, s.a, s.b), attack };
}

/** 도청자가 끝낼 때까지 넣어 볼 x 의 개수 (찾았으면 그 x, 못 찾으면 p − 1). */
export const attackTotal = (s: TrialState) => values(s).attack.attempts;
const trySeconds = (s: TrialState) => Math.min(TRY_SECONDS, ATTACK_MAX_SECONDS / Math.max(1, attackTotal(s)));

export const isSettled = (s: TrialState) => s.travel >= 1 && (s.tried === null || s.tried >= attackTotal(s));

export function advanceTrial(s: TrialState, dt: number): TrialState {
  if (isSettled(s) || dt <= 0) return s;
  if (s.travel < 1) {
    const travel = Math.min(1, s.travel + dt / SEND_SECONDS);
    return { ...s, travel, note: travel >= 1 && s.tried === null ? '' : s.note };
  }
  const total = attackTotal(s);
  const tried = Math.min(total, (s.tried ?? 0) + dt / trySeconds(s));
  return { ...s, tried, note: tried >= total ? '' : s.note };
}

/** 지금까지 넣어 본 x 의 개수 (정수). */
export const triedCount = (s: TrialState) => (s.tried === null ? 0 : Math.floor(s.tried + 1e-9));

/** 버튼. 순서를 건너뛰었거나 움직이는 중이거나 이미 한 일이면 상태를 바꾸지 않고 이유를 알린다. */
export function act(s: TrialState, action: TrialAction): TrialState {
  if (!isSettled(s)) return { ...s, note: s.travel < 1 ? '카드가 통로를 건너는 중입니다. 다 건넌 뒤 다시 눌러 보세요.' : '도청자가 넣어 보는 중입니다. 끝난 뒤 다시 눌러 보세요.' };
  switch (action) {
    case 'make':
      if (s.step >= 1) return { ...s, note: '이미 보낼 수를 만들었습니다. 다음은 "2. 주고받기" 입니다.' };
      return { ...s, step: 1, note: '' };
    case 'send':
      if (s.step < 1) return { ...s, note: '아직 보낼 수가 없습니다. 먼저 "1. 보낼 수 만들기" 를 눌러 보세요.' };
      if (s.step >= 2) return { ...s, note: '이미 주고받았습니다. 도청자도 두 수를 받아 적었습니다.' };
      return { ...s, step: 2, travel: 0, note: '' };
    case 'finish':
      if (s.step < 2) return { ...s, note: '아직 받은 수가 없습니다. 먼저 보낼 수를 만들고 주고받아야 합니다.' };
      if (s.step >= 3) return { ...s, note: '이미 두 사람이 같은 수에 도달했습니다.' };
      return { ...s, step: 3, note: '' };
    case 'attack':
      if (s.step < 2) return { ...s, note: '도청자가 아직 아무 수도 듣지 못했습니다. 먼저 두 사람이 주고받아야 합니다.' };
      if (s.step < 3) return { ...s, note: '아직 두 사람이 마무리하지 않았습니다. 먼저 "3. 받은 수로 마무리" 를 눌러 같은 수에 도달하는 것을 보세요.' };
      if (s.tried !== null) return { ...s, note: '이미 도청자가 다 넣어 봤습니다. 비밀이나 공개 값을 바꾸면 다시 해 볼 수 있습니다.' };
      return { ...s, tried: 0, note: '' };
  }
}

/** 지금 누르면 받아들여지는 버튼: 본문 순서대로 다음 것. 움직이는 중이거나 다 했으면 없다. */
export function nextAction(s: TrialState): TrialAction | null {
  if (!isSettled(s)) return null;
  if (s.step < 3) return ACTION_ORDER[s.step];
  return s.tried === null ? 'attack' : null;
}

/* 세밀 조절. 수가 바뀌므로 도청자의 시도는 비운다 (예전 화면 그대로). 단계는 그대로 두고 수만 새로 계산한다. */
export function setPreset(s: TrialState, id: string): TrialState {
  const { p } = findPreset(id);
  return { ...s, presetId: findPreset(id).id, a: clampSecret(s.a, p), b: clampSecret(s.b, p), tried: null, travel: 1, note: '' };
}
export const setSecret = (s: TrialState, who: 'a' | 'b', v: number): TrialState => ({ ...s, [who]: clampSecret(v, findPreset(s.presetId).p), tried: null, travel: 1, note: '' });

/** 도청자 테이프에 보일 줄: 지금까지 넣어 본 x 가운데 마지막 몇 줄. */
export function tapeRows(s: TrialState, show: number) {
  const { g, p, A } = values(s);
  const n = triedCount(s);
  const rows: { x: number; value: number; hit: boolean }[] = [];
  let v = 1;
  for (let x = 1; x <= n; x++) {
    v = (v * g) % p;
    if (x > n - show) rows.push({ x, value: v, hit: v === A });
  }
  return rows;
}

/** 상태 문구. */
export function statusText(s: TrialState): string {
  if (s.note) return s.note;
  const { p, g, A, B, shared, attack } = values(s);
  if (s.tried !== null) {
    if (s.tried < attack.attempts) return `도청자가 x 를 1 부터 넣어 보는 중입니다. ${triedCount(s)}번째.`;
    return attack.exponent === null ? `${attack.attempts}번을 다 훑었지만 찾지 못했습니다.` : `${attack.attempts}번 만에 a = ${attack.exponent} 를 찾았습니다. 이 크기의 소수는 실제로 뚫립니다.`;
  }
  if (s.step === 0) return `공개 값 p = ${p}, g = ${g}. 두 사람의 비밀은 빨간 카드에 적혀 자기 자리에만 있습니다.`;
  if (s.step === 1) return `앨리스는 ${g}^${s.a} mod ${p} = ${A}, 밥은 ${g}^${s.b} mod ${p} = ${B} 를 파란 카드에 적었습니다.`;
  if (s.step === 2) return s.travel < 1 ? '파란 카드 두 장이 통로를 건너는 중입니다. 도청자가 그대로 봅니다.' : `파란 카드가 건너갔습니다. 도청자는 p, g, ${A}, ${B} 를 압니다. 비밀 a 와 b 는 못 들었습니다.`;
  return `두 사람이 같은 수 ${shared} 에 도달했습니다. 이 수는 한 번도 통로를 지나지 않았습니다. 최대 ${p - 1}번이면 도청자가 끝냅니다.`;
}

/** 그림의 대체 글. */
export function figureLabel(s: TrialState): string {
  const { p, g, A, B, shared } = values(s);
  const parts = [`공개 p = ${p}, g = ${g}`, `앨리스 비밀 a = ${s.a}`, `밥 비밀 b = ${s.b}`];
  if (s.step >= 1) parts.push(`앨리스가 만든 수 ${A}, 밥이 만든 수 ${B}`);
  if (s.step >= 2 && s.travel >= 1) parts.push(`서로 건네받았고 도청자도 ${A} 와 ${B} 를 적었습니다`);
  if (s.step >= 3) parts.push(`두 사람의 공유 비밀 ${shared}, 도청자 칸에는 없습니다`);
  if (s.tried !== null) parts.push(`도청자가 x 를 ${triedCount(s)}번 넣어 봤습니다`);
  return `숫자 카드 탁자: ${parts.join('. ')}.`;
}
