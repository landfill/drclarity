/*
 * 바이트 테이프 기계 figure 의 상태와 계산. 그리기는 tapeScene.ts 가 맡는다.
 *
 * 실제 순서:
 *   1. 기계가 문장의 UTF-8 바이트를 테이프에 한 칸에 하나씩 찍어 낸다. 테이프에는 바이트만 있고 글자는 없다.
 *   2. 칼날이 "몇 바이트까지" 자리에서 테이프를 자른다. 그 뒤 조각은 받침 쟁반으로 떨어진다.
 *   3. 기계가 남은 테이프를 앞에서부터 읽는다. 첫 바이트의 앞머리로 몇 바이트짜리 글자인지 알고 글자로 바꾼다.
 *      마지막 글자의 바이트가 모자라면 그 조각은 어떤 글자도 되지 못한다 — 판독 창의 □ 다.
 *
 * 문장과 자르는 자리는 바깥(위의 입력 칸과 슬라이더)이 정한다. figure 는 자르는 움직임과, 받아들이지 않은
 * 누름의 이유만 갖는다.
 */
import { cutAt, toHex, type CutResult, type EncodedChar } from './utf8';

/**
 * 테이프에서 한 번에 보이는 칸 수. 문장이 길면 자르는 자리 근처만 보인다.
 * 좁은 화면(글자가 커진 화면)에서는 칸을 줄이고 칸과 글자를 키운다.
 */
export const WINDOW = 20;
export const NARROW_WINDOW = 12;
/** 창이 밀릴 때 자르는 자리 오른쪽에 남겨 두는 칸 수. */
const TRAIL_CELLS = 6;
/** 칼날이 내려왔다 올라가고 뒤 조각이 떨어지는 데 걸리는 시간 (초). */
const CUT_SECONDS = 0.9;
/** 판독 창에 보이는 글자 수. 더 길면 앞을 … 로 줄인다. */
export const DISPLAY_CHARS = 5;

export interface TapeState {
  /** 지금 테이프에 찍힌 문장. 바뀌면 새 테이프를 찍는다. */
  text: string;
  /** 자르는 자리 (바이트 수). */
  limit: number;
  /** 자르는 움직임의 진행 (0 = 칼날이 막 내려가기 시작, 1 = 끝). */
  t: number;
  /** 받아들이지 않은 누름의 이유. 자르는 자리가 바뀌면 지운다. */
  note: string;
}

export const initialTape = (text: string, limit: number): TapeState => ({ text, limit, t: 1, note: '' });

export const isSettled = (s: TapeState): boolean => s.t >= 1;

/**
 * 바깥 값이 바뀌었다. 같은 테이프에서 자리만 바뀌면 그 자리에서 다시 자른다.
 * 문장이 바뀌면 새 테이프를 찍은 끝 모습으로 둔다 (입력이 바뀌면 자르는 자리도 끝으로 돌아간다).
 */
export function retarget(s: TapeState, text: string, limit: number): TapeState {
  if (s.text === text && s.limit === limit) return s;
  return { text, limit, t: s.text === text ? 0 : 1, note: '' };
}

export function advanceTape(s: TapeState, dt: number): TapeState {
  if (isSettled(s) || dt <= 0) return s;
  return { ...s, t: Math.min(1, s.t + dt / CUT_SECONDS) };
}

/** 칼날이 내려온 정도 (0 = 위, 1 = 테이프를 지나 끝까지). */
export function bladeDown(t: number): number {
  if (t < 0.3) return ease(t / 0.3);
  if (t < 0.45) return 1;
  if (t < 0.7) return 1 - ease((t - 0.45) / 0.25);
  return 0;
}

/** 뒤 조각이 떨어진 정도 (0 = 붙어 있음, 1 = 쟁반 위). 칼날이 테이프를 지난 뒤에 떨어진다. */
export function pieceFall(t: number): number {
  return t < 0.35 ? 0 : ease((t - 0.35) / 0.65);
}

/** 칼날이 테이프를 지났는가 (그 뒤로는 앞 조각만 기계에 붙어 있다). */
export const isCut = (t: number) => t >= 0.3;

const ease = (t: number) => t * t * (3 - 2 * t);

/** 바이트 하나와 그 바이트가 속한 글자. */
export interface TapeCell {
  byte: number;
  /** 몇 번째 바이트인가 (0 부터, 문장 전체에서). */
  index: number;
  /** 글자의 몇 번째 바이트인가. 0 이면 첫 바이트. */
  part: number;
  /** 그 글자의 바이트 수. */
  size: number;
}

/** 테이프에 찍히는 칸. 글자는 적지 않는다 — 테이프에는 바이트만 있다. */
export function tapeCells(chars: readonly EncodedChar[]): TapeCell[] {
  const cells: TapeCell[] = [];
  for (const c of chars) c.bytes.forEach((byte, part) => cells.push({ byte, index: cells.length, part, size: c.bytes.length }));
  return cells;
}

/** 보이는 창의 첫 칸. 문장이 짧으면 0, 길면 자르는 자리가 창 안에 들도록 민다. */
export function windowStart(total: number, limit: number, window: number = WINDOW): number {
  if (total <= window) return 0;
  return Math.min(total - window, Math.max(0, limit - (window - TRAIL_CELLS)));
}

/** 자르는 자리를 한 바이트 옮길 수 있는가. */
export const canLess = (limit: number) => limit > 0;
export const canMore = (limit: number, total: number) => limit < total;

export const refuseLess = (s: TapeState): TapeState => ({ ...s, note: '이미 0바이트입니다. 테이프에 남은 바이트가 없습니다.' });
export const refuseMore = (s: TapeState): TapeState => ({
  ...s,
  note: '테이프 끝입니다. 문장의 바이트를 모두 남겼으니 깨진 글자가 없습니다.',
});

/** 지금 누르면 받아들여지는 버튼. 끝에서 한 바이트씩 줄여 보는 것이 첫 순서다. */
export const nextAction = (limit: number): 'less' | null => (canLess(limit) ? 'less' : null);

/** 판독 창에 보이는 글자: 남은 글자의 끝 몇 개와, 깨진 조각이 있으면 □. 공백은 가운뎃점. */
export function displayText(cut: CutResult): { text: string; broken: boolean } {
  const kept = cut.kept.map((c) => (c.char === ' ' ? '·' : c.char === '\n' ? '⏎' : c.char));
  const shown = kept.length > DISPLAY_CHARS ? ['…', ...kept.slice(-DISPLAY_CHARS)] : kept;
  return { text: shown.join(''), broken: cut.broken !== null };
}

/** 상태 줄의 문구. */
export function statusText(s: TapeState, chars: readonly EncodedChar[]): string {
  if (s.note) return s.note;
  const cut = cutAt([...chars], s.limit);
  if (cut.broken) {
    const { char, keptBytes } = cut.broken;
    return `${char.char} 는 ${char.bytes.length}바이트인데 ${keptBytes.length}바이트(${keptBytes.map(toHex).join(' ')})만 남았습니다. 이 조각은 어떤 글자도 되지 못해 판독 창에 □ 로 나옵니다.`;
  }
  if (cut.kept.length === 0) return '0바이트에서 잘라 테이프에 아무것도 남지 않았습니다.';
  return `${s.limit}바이트 자리는 글자 경계라 깨진 글자가 없습니다. 한 바이트씩 줄여 보세요.`;
}
