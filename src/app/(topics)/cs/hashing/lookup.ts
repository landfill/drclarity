/*
 * 유출된 저장소와 미리 만든 표 figure 의 상태. 소금 켜기는 위 "서버가 가진 것" 칸의 체크 상자와 같은 값이라
 * HashingClient 가 useFigureState 로 갖고, 체크 상자와 figure 가 함께 dispatch 한다. 그리기는 lookupScene.ts 가 맡는다.
 *
 * 실제 순서 (본문 그대로):
 *   1. rainbow: "위 저장소에서 유출된 값이 아래 표에 걸리는지 보세요." → "1. 표에서 찾기": 자가 표를 한 줄씩 내려가며
 *      그 줄의 해시가 저장소의 값과 같은지 본다. 같으면 줄과 저장소 사이에 실이 걸린다. 되돌리는 것이 아니라 찾는 것이다.
 *   2. salt: "효과를 보세요. 두 사람이 똑같은 비밀번호를 써도 저장되는 값이 갈립니다. 그리고 … 한 줄도 맞지 않습니다."
 *      → "2. 소금 섞어 다시 찾기": 저장소에 소금이 적히고 값이 바뀐 뒤, 같은 표로 다시 찾는다.
 * 저장소 값과 표는 hashing.ts 의 sha256 · saltedHash · COMMON_PASSWORDS · ACCOUNTS 를 그대로 쓴다.
 */
import { ACCOUNTS, COMMON_PASSWORDS, saltedHash } from './hashing';
import { sha256 } from './sha256';

/** 두 계정이 고른 비밀번호 (예전 화면 그대로). */
export const ACCOUNT_PASSWORD = 'password';
/** 자가 표 한 줄을 내려가는 시간 (초). */
export const ROW_SECONDS = 0.18;

export type LookupAction = 'scan' | 'salt';
export const ACTION_LABEL: Record<LookupAction, string> = { scan: '1. 표에서 찾기', salt: '2. 소금 섞어 다시 찾기' };

export interface LookupState {
  salted: boolean;
  /** 지금 소금 설정으로 찾기를 시작했는가. */
  started: boolean;
  /** 자가 지나간 줄 수 (0..표 길이). */
  scanned: number;
  /** 지금 줄을 지나는 정도 (0..1). */
  t: number;
  note: string;
}

export const initialLookup = (): LookupState => ({ salted: false, started: false, scanned: 0, t: 0, note: '' });

const ROWS = COMMON_PASSWORDS.length;
export const isSettled = (s: LookupState) => !s.started || s.scanned >= ROWS;
export const isDone = (s: LookupState) => s.started && s.scanned >= ROWS;

export function advanceLookup(s: LookupState, dt: number): LookupState {
  if (isSettled(s) || dt <= 0) return s;
  const t = s.t + dt / ROW_SECONDS;
  if (t < 1) return { ...s, t };
  const scanned = s.scanned + 1;
  return { ...s, scanned, t: 0, note: scanned >= ROWS ? '' : s.note };
}

/** 저장소의 두 줄: 사용자, (켰으면) 소금, 저장된 값. */
export function storedRows(salted: boolean) {
  return ACCOUNTS.map((account) => ({ ...account, hash: salted ? saltedHash(account.salt, ACCOUNT_PASSWORD) : sha256(ACCOUNT_PASSWORD) }));
}

/** 공격자의 표: 흔한 비밀번호를 소금 없이 미리 해시해 둔 것. 소금 설정과 상관없이 늘 같다. */
export const TABLE = COMMON_PASSWORDS.map((password) => ({ password, hash: sha256(password) }));

/** 표의 줄 i 가 저장소의 어느 줄과 같은가 (계정 id 목록). 자가 아직 지나지 않은 줄은 모른다(null). */
export function matchesAt(s: LookupState, i: number): string[] | null {
  if (!s.started || i >= s.scanned) return null;
  return storedRows(s.salted).filter((row) => row.hash === TABLE[i].hash).map((row) => row.id);
}

/** 지금까지 걸린 줄 수. */
export const hits = (s: LookupState) => TABLE.reduce((n, _, i) => n + ((matchesAt(s, i)?.length ?? 0) > 0 ? 1 : 0), 0);

/** 버튼. 찾는 중이거나 이미 한 일이면 상태를 바꾸지 않고 이유를 알린다. */
export function act(s: LookupState, a: LookupAction): LookupState {
  if (!isSettled(s)) return { ...s, note: '표를 훑는 중입니다. 다 훑은 뒤 다시 눌러 보세요.' };
  if (a === 'scan') {
    if (isDone(s)) return { ...s, note: `이미 이 저장소로 표를 다 훑었습니다. ${s.salted ? '소금을 섞은 값은 한 줄도 걸리지 않았습니다.' : '다음은 "2. 소금 섞어 다시 찾기" 입니다.'}` };
    return { ...s, started: true, scanned: 0, t: 0, note: '' };
  }
  if (s.salted && isDone(s)) return { ...s, note: '이미 소금을 섞어 다시 찾았습니다. 표가 한 줄도 맞지 않습니다.' };
  // 소금 없이 찾아 보기 전에 소금부터 섞으면 "표에서 찾으면 걸린다" 는 앞 단계를 건너뛴다.
  if (!s.salted && !isDone(s)) return { ...s, note: '아직 소금 없이 표에서 찾아 보지 않았습니다. 먼저 "1. 표에서 찾기" 를 눌러 보세요.' };
  return { ...s, salted: true, started: true, scanned: 0, t: 0, note: '' };
}

/** 지금 누르면 받아들여지는 버튼: 본문대로 찾기 → 소금 섞어 다시 찾기. 다 했거나 훑는 중이면 없다. */
export function nextAction(s: LookupState): LookupAction | null {
  if (!isSettled(s)) return null;
  if (!isDone(s)) return 'scan';
  return s.salted ? null : 'salt';
}

/** 위 칸의 체크 상자. 저장소가 바뀌므로 찾기를 처음부터 다시 한다. */
export const setSalted = (s: LookupState, on: boolean): LookupState => ({ ...s, salted: on, started: false, scanned: 0, t: 0, note: '' });

/** 상태 문구. 다 훑은 뒤에는 예전 표 아래 문구 그대로다. */
export function statusText(s: LookupState): string {
  if (s.note) return s.note;
  if (!s.started) return s.salted ? '저장소에 소금이 섞였습니다. 같은 표로 다시 찾아보세요.' : '유출된 저장소의 값이 미리 만든 표에 걸리는지 찾아보세요.';
  if (!isDone(s)) return `표를 한 줄씩 훑는 중입니다. ${s.scanned}/${ROWS}줄, 걸린 줄 ${hits(s)}개.`;
  const n = hits(s);
  return n > 0
    ? `${n}줄이 걸렸습니다. 되돌린 것이 아니라 찾은 것입니다 — 두 사람의 비밀번호가 ${ACCOUNT_PASSWORD} 라는 사실이 표 한 번 훑는 것으로 드러났습니다.`
    : '한 줄도 걸리지 않습니다. 비밀번호는 그대로인데 표가 쓸모없어졌습니다. 이 표는 소금을 모르는 채로 만든 것이기 때문입니다.';
}

/** 그림의 대체 글. */
export function figureLabel(s: LookupState): string {
  const store = storedRows(s.salted)
    .map((r) => `${r.name}${s.salted ? ` (소금 ${r.salt})` : ''} 저장값 ${r.hash.slice(0, 12)}…`)
    .join(', ');
  const found = TABLE.flatMap((row, i) => ((matchesAt(s, i)?.length ?? 0) > 0 ? [`${row.password} 줄이 걸림`] : []));
  return `유출된 저장소: ${store}. 비밀번호 칸은 없습니다. 공격자의 표: 흔한 비밀번호 ${TABLE.length}개를 미리 해시한 것. 자가 ${s.started ? `${s.scanned}줄` : '아직 0줄'}을 지났습니다.${found.length ? ` ${found.join(', ')}.` : ''}`;
}
