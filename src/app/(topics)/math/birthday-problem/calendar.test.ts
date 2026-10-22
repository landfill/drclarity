import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, PALS, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { DAYS_IN_YEAR, MAX_PEOPLE, hasSharedBirthday, sharedBirthdayProbability } from './birthday';
import {
  BATCHES,
  MONTH_DAYS,
  advanceCalendar,
  clearTally,
  gather,
  groupFromSeed,
  initialCalendar,
  isSettled,
  monthDay,
  nextAction,
  ratioText,
  sharedDays,
  sharedPercent,
  type Batch,
  type CalendarState,
} from './calendar';
import { CALENDAR_SIZE, REGIONS, boardLabels, calendarScene, cellBox, type BoardLabel } from './calendarScene';

const run = (s: CalendarState) => settle(s, advanceCalendar, isSettled);
const draw = (s: CalendarState) => withFrame(frameFor(CALENDAR_SIZE, 't', { view: FRONT_VIEW }), () => calendarScene(s));

describe('달력', () => {
  // 본문: 생일은 365일에 고르게, 윤년(2월 29일)은 다루지 않는다.
  it('평년 달력이다: 열두 달을 합하면 365일이고 2월은 28일까지다', () => {
    expect(MONTH_DAYS.reduce((a, b) => a + b, 0)).toBe(DAYS_IN_YEAR);
    expect(MONTH_DAYS[1]).toBe(28);
  });

  it('한 해의 몇째 날을 달과 날로 바꾼다', () => {
    expect(monthDay(0)).toEqual([0, 1]);
    expect(monthDay(30)).toEqual([0, 31]);
    expect(monthDay(31)).toEqual([1, 1]);
    expect(monthDay(58)).toEqual([1, 28]);
    expect(monthDay(59)).toEqual([2, 1]);
    expect(monthDay(364)).toEqual([11, 31]);
    expect(() => monthDay(365)).toThrow();
  });

  it('모든 날은 달력의 칸 안에 있고, 없는 날(2월 29일 같은 칸)에는 스티커가 붙지 않는다', () => {
    const seen = new Set<string>();
    for (let day = 0; day < DAYS_IN_YEAR; day++) {
      const [m, d] = monthDay(day);
      expect(d).toBeLessThanOrEqual(MONTH_DAYS[m]);
      const c = cellBox(m, d);
      expect(c.yL).toBeLessThanOrEqual(REGIONS.grid.yL);
      expect(c.yR).toBeGreaterThanOrEqual(REGIONS.grid.yR - 1e-9);
      expect(c.zT).toBeLessThanOrEqual(REGIONS.grid.zT);
      expect(c.zB).toBeGreaterThanOrEqual(REGIONS.grid.zB - 1e-9);
      seen.add(`${m}-${d}`);
    }
    expect(seen.size).toBe(DAYS_IN_YEAR);
  });
});

describe('모임 뽑기', () => {
  it('씨앗이 같으면 같은 모임이 나오고, 생일은 모두 0..364 의 정수다', () => {
    expect(groupFromSeed(23, 7)).toEqual(groupFromSeed(23, 7));
    expect(groupFromSeed(23, 7)[0]).not.toEqual(groupFromSeed(23, 8)[0]);
    let seed = 1;
    for (let i = 0; i < 100; i++) {
      const [days, next] = groupFromSeed(MAX_PEOPLE, seed);
      expect(days).toHaveLength(MAX_PEOPLE);
      for (const d of days) {
        expect(Number.isInteger(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThan(DAYS_IN_YEAR);
      }
      seed = next;
    }
  });

  it('모은 횟수와 같은 생일 횟수는 씨앗에서 모임을 다시 뽑아 센 값과 같다', () => {
    const start = initialCalendar(23, 99);
    const s = run(gather(start, 100));
    let seed = start.seed;
    let shared = 0;
    let last: number[] = [];
    for (let i = 0; i < 100; i++) {
      [last, seed] = groupFromSeed(23, seed);
      if (hasSharedBirthday(last)) shared += 1;
    }
    expect(s.groups).toBe(100);
    expect(s.shared).toBe(shared);
    expect(s.last).toEqual(last);
    expect(s.seed).toBe(seed);
  });

  // 본문: 시행을 늘릴수록 막대가 이론값 눈금에 붙는다.
  it('23명을 5000번 모으면 같은 생일 비율이 이론값(약 50.7%) 가까이 온다', () => {
    const s = run(gather(initialCalendar(23, 2026), 5000));
    const p = sharedBirthdayProbability(23);
    expect(Math.abs(s.shared / s.groups - p)).toBeLessThan(0.03);
  });

  it('같은 날에 붙은 스티커 묶음은 두 장 이상인 날만 센다', () => {
    expect([...sharedDays([3, 5, 3, 9, 9, 9, 1])]).toEqual([
      [3, 2],
      [9, 3],
    ]);
    expect(sharedDays([1, 2, 3]).size).toBe(0);
  });
});

describe('버튼과 시간', () => {
  it('모으는 동안 시간이 흐르면 묶음 크기를 넘지 않게 조금씩 모이고, 묶음이 끝나면 멈춘다', () => {
    let s = gather(initialCalendar(30, 4), 100);
    let prev = 0;
    for (let i = 0; i < 400 && !isSettled(s); i++) {
      s = advanceCalendar(s, 1 / 60);
      expect(s.groups).toBeGreaterThanOrEqual(prev);
      expect(s.groups).toBeLessThanOrEqual(100);
      prev = s.groups;
    }
    expect(isSettled(s)).toBe(true);
    expect(s.groups).toBe(100);
    expect(advanceCalendar(s, 1)).toBe(s);
  });

  it('어느 묶음도 3초 안에 끝난다', () => {
    for (const k of BATCHES) {
      let s = gather(initialCalendar(23, 1), k);
      for (let t = 0; t < 3 * 60; t++) s = advanceCalendar(s, 1 / 60);
      expect(isSettled(s), `${k}번`).toBe(true);
      expect(s.groups).toBe(k);
    }
  });

  it('모으는 중에 다시 모으기를 누르면 상태는 그대로 두고 이유를 알린다', () => {
    const moving = advanceCalendar(gather(initialCalendar(23, 1), 1000), 0.3);
    expect(moving.queue).toBeGreaterThan(0);
    const again = gather(moving, 10);
    expect({ ...again, note: '' }).toEqual({ ...moving, note: '' });
    expect(again.note).toContain('모으는 중');
  });

  it('집계 비우기는 모으는 중에도 멈추고 비운다. 인원은 그대로이고 씨앗은 이어 쓴다', () => {
    const moving = advanceCalendar(gather(initialCalendar(40, 1), 1000), 0.3);
    const cleared = clearTally(moving);
    expect(cleared.groups).toBe(0);
    expect(cleared.shared).toBe(0);
    expect(cleared.queue).toBe(0);
    expect(cleared.last).toEqual([]);
    expect(cleared.n).toBe(40);
    expect(cleared.seed).toBe(moving.seed);
    expect(cleared.note).toBe('집계를 비웠습니다.');
  });

  it('모은 적이 없을 때의 집계 비우기는 상태를 바꾸지 않고 이유를 알린다', () => {
    const s = initialCalendar(23);
    const t = clearTally(s);
    expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
    expect(t.note).toContain('아직');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다 (모으는 중에는 null)', () => {
    let s = initialCalendar(23, 3);
    const seen: Batch[] = [];
    for (let round = 0; round < 6; round++) {
      const k = nextAction(s);
      expect(k).not.toBeNull();
      seen.push(k!);
      const started = gather(s, k!);
      expect(started.queue).toBe(k);
      const moving = advanceCalendar(started, 0.1);
      expect(nextAction(moving)).toBeNull();
      s = run(started);
    }
    expect(seen.slice(0, 4)).toEqual([10, 100, 1000, 5000]);
  });

  it('비율은 정수로 셈해 소수 한 자리로 적는다', () => {
    expect(ratioText(1, 3, 1)).toBe('0.3');
    expect(ratioText(2, 3, 1)).toBe('0.7');
    expect(ratioText(100 * 505, 1000, 1)).toBe('50.5');
    expect(sharedPercent(initialCalendar(23))).toBeNull();
  });

  it('끝난 뒤의 상태 문구는 모은 횟수와 같은 생일 횟수를 그대로 적는다', () => {
    const s = run(gather(initialCalendar(23, 77), 1000));
    expect(s.note).toContain(`${s.groups.toLocaleString('ko-KR')}번 중 ${s.shared.toLocaleString('ko-KR')}번`);
    expect(s.note).toContain(`(${sharedPercent(s)}%)`);
  });
});

describe('calendarScene', () => {
  const states = (): CalendarState[] => {
    const out: CalendarState[] = [];
    for (const n of [2, 10, 23, 57, MAX_PEOPLE]) {
      const s0 = initialCalendar(n, n);
      out.push(s0, advanceCalendar(gather(s0, 100), 0.4), run(gather(s0, 10)), run(gather(s0, 1000)));
    }
    return out;
  };

  it('모든 인원과 단계를 숫자 오류 없이 그린다', () => {
    for (const s of states()) expect(draw(s)).not.toMatch(/NaN|undefined|Infinity/);
  });

  // 본문: 문제가 묻는 것은 "나와 같은 날" 이 아니라 아무 두 사람이다 — 어느 날이든 겹친 칸마다 고리를 두른다.
  it('빨간 고리는 스티커가 겹친 날마다 하나씩, 겹친 날에만 두른다', () => {
    const ring = new RegExp(`fill="none" stroke="${PALS.tomato.l}" stroke-width="1.6"`, 'g');
    for (const s of states()) {
      expect(draw(s).match(ring)?.length ?? 0).toBe(sharedDays(s.last).size);
      expect(sharedDays(s.last).size > 0).toBe(hasSharedBirthday(s.last));
    }
  });

  // AGENTS.md: 한글이 섞인 라벨은 일반 글꼴로, 숫자만 있는 눈금은 고정폭으로 쓴다.
  it('한글이 든 글자는 일반 글꼴로, 숫자 눈금은 고정폭으로 쓴다', () => {
    const svg = draw(initialCalendar(23));
    const texts = svg.match(/<text[^>]*>[^<]*<\/text>/g) ?? [];
    const korean = texts.filter((t) => /[가-힯]/.test(t));
    expect(korean.length).toBe(14);
    for (const t of korean) expect(t).toContain(GENERAL_FONT);
    for (const t of texts.filter((t) => !/[가-힯]/.test(t))) expect(t).not.toContain(GENERAL_FONT);
  });

  /** 앞면 위의 글자 상자 (y 는 왼쪽이 크다). 한글은 1em, 나머지는 0.62em 에 자간 0.04em 을 더한다. */
  const box = (l: BoardLabel) => {
    const w = [...l.text].reduce((a, ch) => a + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * l.size;
    return { text: l.text, yL: l.y + w / 2, yR: l.y - w / 2, zT: l.z + 0.85 * l.size, zB: l.z - 0.25 * l.size };
  };
  type Rect = { yL: number; yR: number; zT: number; zB: number };
  const overlap = (a: Rect, b: Rect) => a.yR < b.yL && b.yR < a.yL && a.zB < b.zT && b.zB < a.zT;
  const inside = (a: Rect, b: Rect) => a.yL <= b.yL && a.yR >= b.yR && a.zT <= b.zT && a.zB >= b.zB;

  it('판에 쓴 글자는 서로 겹치지 않고, 칸과 막대를 가리지 않으며, 제 판 안에 있다', () => {
    const boxes = boardLabels().map(box);
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      expect(inside(b, REGIONS.calendarPanel) || inside(b, REGIONS.tallyPanel), b.text).toBe(true);
      for (const r of [REGIONS.grid, REGIONS.barShared, REGIONS.barNone]) expect(overlap(b, r), b.text).toBe(false);
      for (let j = i + 1; j < boxes.length; j++) expect(overlap(b, boxes[j]), `${b.text} / ${boxes[j].text}`).toBe(false);
    }
  });
});
