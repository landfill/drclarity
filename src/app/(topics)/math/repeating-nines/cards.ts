/*
 * 확대 카드 figure 의 상태와 계산. 그리기는 cardsScene.ts 가 맡는다.
 *
 * 카드 k (1 ≤ k ≤ MAX_DIGITS) 는 1 근처의 수직선 한 토막이다.
 *   - 왼쪽 끝은 9 가 k−1 개인 수(k = 1 이면 0), 오른쪽 끝은 1 이다.
 *   - 눈금은 열 칸이다. 아홉째 눈금이 9 가 k 개인 수이고, 마지막 한 칸이 1 과의 틈이다.
 *   - 다음 카드 k+1 은 그 마지막 한 칸을 열 배로 키운 것이다. 그래서 어느 카드에서나 틈은 눈금 한 칸으로 보인다.
 * 카드는 받침판 위 카드 상자의 앞칸에서 나와 판에 붙고, 판이 차면 맨 위 카드가 상자의 뒤칸으로 들어간다.
 * 상자의 카드는 MAX_DIGITS 장뿐이다. 어느 카드든 9 가 끝나는 유한소수다.
 *
 * 9 의 개수는 바깥 슬라이더가 정한다(본문 풀이의 "위 슬라이더로 만든 수"). figure 는 카드를 그 자리로 옮기는
 * 움직임과, 받아들이지 않은 누름의 이유만 갖는다.
 */
import { MAX_DIGITS, gapString, ninesString } from './nines';

/** 판에 붙는 카드 줄 수. 위 카드의 틈과 그것을 키운 아래 카드가 함께 보인다. */
export const ROWS = 2;
/** 카드 한 장이 옮겨 가는 데 걸리는 시간 (초). 여러 장을 건너뛰면 다 합쳐 MAX_MOVE 초를 넘지 않는다. */
const CARD_SECONDS = 0.55;
const MAX_MOVE = 1.6;

export interface CardsState {
  /** 지금 보이는 자리 (9 의 개수, 움직이는 동안은 소수). */
  shown: number;
  /** 옮겨 갈 자리. */
  target: number;
  /** 1초에 옮기는 카드 수. */
  speed: number;
  /** 받아들이지 않은 누름의 이유. 9 의 개수가 바뀌면 지운다. */
  note: string;
}

export const initialCards = (digits: number): CardsState => ({ shown: digits, target: digits, speed: 1 / CARD_SECONDS, note: '' });

export const isSettled = (s: CardsState): boolean => s.shown === s.target;

/** 9 의 개수가 바뀌었다: 그 자리로 옮겨 간다. */
export function retarget(s: CardsState, digits: number): CardsState {
  const d = Math.min(MAX_DIGITS, Math.max(1, Math.round(digits)));
  return { ...s, target: d, speed: Math.max(1 / CARD_SECONDS, Math.abs(d - s.shown) / MAX_MOVE), note: '' };
}

export function advanceCards(s: CardsState, dt: number): CardsState {
  if (isSettled(s) || dt <= 0) return s;
  const step = s.speed * dt;
  const diff = s.target - s.shown;
  return Math.abs(diff) <= step ? { ...s, shown: s.target } : { ...s, shown: s.shown + Math.sign(diff) * step };
}

/** "9 하나 더" 를 받아들이는가. 받아들이지 않으면 상태 문구로 이유를 알린다. */
export const canAdd = (digits: number) => digits < MAX_DIGITS;
export const canRemove = (digits: number) => digits > 1;

export const refuseAdd = (s: CardsState): CardsState => ({
  ...s,
  note: `카드가 더 없습니다. ${fullNote()}`,
});

export const refuseRemove = (s: CardsState): CardsState => ({
  ...s,
  note: '9 가 하나도 없으면 0 입니다. 카드는 9 가 1개인 0.9 부터 시작합니다.',
});

function fullNote(): string {
  return `상자의 카드는 ${MAX_DIGITS}장이 끝이고, 어느 카드든 9 가 끝나는 유한소수라 틈이 보입니다. 0.999… 에는 마지막 9 가 없어서 0.999… 를 담은 카드는 없습니다.`;
}

/** 지금 누르면 받아들여지는 버튼. 9 를 더 붙일 수 있으면 "9 하나 더". */
export const nextAction = (digits: number): 'add' | null => (canAdd(digits) ? 'add' : null);

/** 상태 줄의 문구. */
export function statusText(s: CardsState, digits: number): string {
  if (s.note) return s.note;
  if (digits >= MAX_DIGITS) return fullNote();
  return `${ninesString(digits)} 는 9 가 ${digits}개인 유한소수입니다. 1 과의 틈 ${gapString(digits)} 는 카드의 마지막 눈금 한 칸이고, 다음 카드는 그 한 칸을 열 배로 키운 것입니다.`;
}

/* ---------- 카드의 자리 ---------- */

/** 판의 맨 위 줄에 붙은 카드 번호 (움직이는 동안은 소수). */
export const topCard = (shown: number) => Math.max(1, shown - (ROWS - 1));

export type CardPlace =
  /** 상자 앞칸에서 기다린다. */
  | { kind: 'box' }
  /** 상자 뒤칸에 들어가 있다 (이미 본 카드). */
  | { kind: 'seen' }
  /** 판의 줄 row (0 = 맨 위, 움직이는 동안은 소수). */
  | { kind: 'row'; row: number }
  /** 상자에서 판의 줄 row 로 나오는 중. t = 0 상자, 1 판. */
  | { kind: 'arrive'; row: number; t: number }
  /** 판의 맨 위 줄에서 상자 뒤칸으로 들어가는 중. t = 0 판, 1 상자. */
  | { kind: 'leave'; t: number };

/** 카드 k 가 지금 있는 곳. 카드는 늘 한 곳에만 있다. */
export function cardPlace(k: number, shown: number): CardPlace {
  const next = Math.ceil(shown);
  if (k > next) return { kind: 'box' };
  if (k === next && next !== shown) {
    // 9 의 개수가 next 가 되면 붙을 줄.
    return { kind: 'arrive', row: k - topCard(k), t: shown - Math.floor(shown) };
  }
  const row = k - topCard(shown);
  if (row >= 0) return { kind: 'row', row };
  if (row <= -1) return { kind: 'seen' };
  return { kind: 'leave', t: -row };
}

/* ---------- 카드 한 장의 내용 ---------- */

/** 카드의 눈금 수. 마지막 한 칸이 1 과의 틈이다. */
export const TICKS = 10;

export interface CardFace {
  /** 왼쪽 끝 수, 아홉째 눈금(9 가 k 개인 수), 오른쪽 끝 수. */
  left: string;
  pin: string;
  right: string;
  /** 왼쪽 위 이름. */
  name: string;
}

/**
 * 카드 k 의 글자. 숫자는 문자열로 만든다 — 1 − 10^−k 를 부동소수점으로 계산하면 자릿수가 커질 때 어긋난다
 * (nines.ts 의 offsetWindow 주석). 눈금 자리도 카드 안에서 정수 칸으로 정해, 어느 카드든 같은 자리에 선다.
 */
export const cardFace = (k: number): CardFace => ({
  left: ninesString(k - 1),
  pin: ninesString(k),
  right: '1',
  name: `9 가 ${k}개`,
});
