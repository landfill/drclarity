import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, PALS, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { palette } from '@/styles/palette';
import { ALGORITHMS, runToCompletion, type InputPattern } from './sorting';
import {
  SIZES,
  STEPS_PER_SECOND,
  advanceRace,
  allDone,
  initialRace,
  inputFromSeed,
  isSettled,
  laneDone,
  newArray,
  nextAction,
  stepOnce,
  toggleRun,
  traceOf,
  type RaceState,
} from './race';
import { EDGE_LEFT, EDGE_RIGHT, RACE_SIZE, edgeFontSize, edgeTexts, raceScene, textWidth } from './raceScene';

const PATTERNS: InputPattern[] = ['random', 'nearly-sorted', 'reversed'];
const run = (s: RaceState) => settle(s, advanceRace, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(RACE_SIZE, 't', { view: FRONT_VIEW }), labelScale });

describe('기록한 스텝', () => {
  it('스텝 목록을 따라가면 sorting.ts 를 끝까지 돌린 것과 같은 횟수·같은 결과가 나온다', () => {
    for (const n of SIZES) {
      for (const pattern of PATTERNS) {
        const s = run(toggleRun(initialRace(n, pattern, n * 7 + 1)));
        expect(allDone(s)).toBe(true);
        s.lanes.forEach((lane, i) => {
          const ref = runToCompletion(ALGORITHMS[i].sort, s.input);
          expect(lane.values, `${lane.id} ${pattern} ${n}`).toEqual(ref.sorted);
          expect(lane.compares).toBe(ref.counters.compares);
          expect(lane.writes).toBe(ref.counters.writes);
          expect(lane.trace).toEqual(traceOf(lane.id, s.input));
        });
      }
    }
  });

  // note-rules: "세 알고리즘이 똑같은 배열을 받아 동시에 출발합니다."
  it('세 줄이 같은 배열을 받는다', () => {
    const s = initialRace(50, 'random', 3);
    for (const lane of s.lanes) expect(lane.values).toEqual(s.input);
  });

  it('같은 씨앗이면 같은 배열이다 (서버와 브라우저의 첫 그림이 같다)', () => {
    expect(initialRace(50, 'random').input).toEqual(initialRace(50, 'random').input);
    expect(inputFromSeed(50, 'random', 1)).not.toEqual(inputFromSeed(50, 'random', 2));
  });
});

describe('같은 빠르기', () => {
  // note-rules: "한 프레임에 진행하는 스텝 수도 셋이 같습니다. 그래서 먼저 끝난다는 것은 해야 할 일이 적었다는 뜻입니다."
  it('어느 프레임에서도 아직 일하는 줄들은 같은 스텝 수만큼 했다', () => {
    for (const pattern of PATTERNS) {
      let s = toggleRun(initialRace(50, pattern, 11));
      while (!isSettled(s)) {
        s = advanceRace(s, 1 / 60);
        const working = s.lanes.filter((l) => !laneDone(l)).map((l) => l.pos);
        const finished = s.lanes.filter(laneDone).map((l) => l.trace.length);
        for (const p of working) expect(p).toBe(Math.max(...working));
        // 끝난 줄은 일하는 줄보다 먼저 끝났다.
        for (const f of finished) for (const p of working) expect(f).toBeLessThanOrEqual(p);
      }
    }
  });

  it('먼저 끝나는 순서가 스텝 수가 적은 순서다', () => {
    let s = toggleRun(initialRace(200, 'random', 5));
    const finishedAt = new Map<string, number>();
    let frameNo = 0;
    while (!isSettled(s)) {
      s = advanceRace(s, 1 / 60);
      frameNo += 1;
      for (const l of s.lanes) if (laneDone(l) && !finishedAt.has(l.id)) finishedAt.set(l.id, frameNo);
    }
    const byTime = [...s.lanes].sort((a, b) => finishedAt.get(a.id)! - finishedAt.get(b.id)!).map((l) => l.id);
    const byWork = [...s.lanes].sort((a, b) => a.trace.length - b.trace.length).map((l) => l.id);
    expect(byTime).toEqual(byWork);
    expect(s.note).toContain('끝낸 순서');
  });

  it('원소 200개는 예전 화면처럼 1초에 3,600스텝(한 프레임 60스텝)이다', () => {
    expect(STEPS_PER_SECOND[200]).toBe(3600);
    const s = advanceRace(toggleRun(initialRace(200, 'random', 1)), 1 / 60);
    for (const l of s.lanes) expect(l.pos).toBe(60);
  });
});

describe('버튼', () => {
  it('출발·멈춤이 번갈아 바뀌고, 멈추면 진행하지 않는다', () => {
    let s = toggleRun(initialRace(50, 'random'));
    expect(s.running).toBe(true);
    s = advanceRace(s, 0.1);
    s = toggleRun(s);
    expect(s.running).toBe(false);
    expect(advanceRace(s, 1)).toBe(s);
  });

  it('한 스텝은 멈추고 세 줄을 한 스텝씩 진행한다', () => {
    const running = advanceRace(toggleRun(initialRace(10, 'random')), 0.1);
    const s = stepOnce(running);
    expect(s.running).toBe(false);
    s.lanes.forEach((l, i) => expect(l.pos).toBe(Math.min(l.trace.length, running.lanes[i].pos + 1)));
    expect(s.note).toContain('한 스텝');
  });

  it('다 끝난 뒤의 출발·한 스텝은 상태를 바꾸지 않고 새 배열을 받으라고 알린다', () => {
    const done = run(toggleRun(initialRace(10, 'random')));
    for (const action of [toggleRun, stepOnce]) {
      const s = action(done);
      expect({ ...s, note: '' }).toEqual({ ...done, note: '' });
      expect(s.note).toContain('새 배열');
    }
  });

  it('새 배열은 원소 수와 패턴을 지키고 처음 상태로 돌아간다', () => {
    const done = run(toggleRun(initialRace(50, 'reversed')));
    const s = newArray(done, 99);
    expect(s.n).toBe(50);
    expect(s.pattern).toBe('reversed');
    expect(s.lanes.every((l) => l.pos === 0)).toBe(true);
    expect(s.running).toBe(false);
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    let s = initialRace(10, 'random');
    expect(nextAction(s)).toBe('start');
    s = toggleRun(s);
    expect(s.running).toBe(true);
    s = advanceRace(s, 0.05);
    expect(nextAction(s)).toBeNull();
    s = run(s);
    expect(nextAction(s)).toBe('reset');
    expect(newArray(s, 1).lanes.every((l) => l.pos === 0)).toBe(true);
  });
});

describe('raceScene', () => {
  const stages = (): RaceState[] => {
    const out: RaceState[] = [];
    for (const n of SIZES) {
      for (const pattern of PATTERNS) {
        let s = initialRace(n, pattern, n);
        out.push(s);
        s = toggleRun(s);
        for (let i = 0; i < 3; i++) out.push((s = advanceRace(s, 0.4)));
        out.push(run(s));
      }
    }
    return out;
  };

  it('모든 단계를 숫자 오류 없이 그린다', () => {
    withFrame(frame(), () => {
      for (const s of stages()) expect(raceScene(s)).not.toMatch(/NaN|undefined|Infinity/);
    });
  });

  // note-rules: "주황색은 지금 비교하거나 옮기는 자리, 초록색은 정렬이 끝난 상태입니다."
  it('지금 건드린 막대는 주황, 끝난 줄은 초록으로 칠한다', () => {
    const orange = palette['chart-warm'];
    const green = PALS.mint.l;
    withFrame(frame(), () => {
      const idle = raceScene(initialRace(10, 'random'));
      expect(idle).not.toContain(orange);
      expect(idle).not.toContain(green);
      const busy = advanceRace(toggleRun(initialRace(10, 'random')), 0.3);
      expect(raceScene(busy)).toContain(orange);
      const done = run(busy);
      const svg = raceScene(done);
      expect(svg).toContain(green);
      expect(svg).not.toContain(orange);
    });
  });

  // AGENTS.md: 한글이 섞인 라벨은 일반 글꼴로 쓴다. figure 의 SVG 글자는 고정폭 글꼴을 물려받는다.
  it('모서리 글자는 한글이 섞여 있어 모두 일반 글꼴로 쓴다', () => {
    withFrame(frame(), () => {
      const svg = raceScene(run(toggleRun(initialRace(10, 'random'))));
      const texts = svg.match(/<text[^>]*>[^<]*<\/text>/g) ?? [];
      expect(texts.length).toBeGreaterThanOrEqual(9);
      for (const t of texts) expect(t, t).toContain(GENERAL_FONT);
    });
  });

  it('선반 앞 모서리 글자가 가장 긴 횟수에서도, 글자가 커진 좁은 화면에서도 모서리 안에 들어가고 겹치지 않는다', () => {
    // 원소 200개 역순: 버블·퀵의 횟수가 가장 크다.
    const s = run(toggleRun(initialRace(200, 'reversed')));
    for (const scale of [1, 2.2]) {
      withFrame(frame(scale), () => {
        const fs = edgeFontSize();
        for (const lane of s.lanes) {
          const { title, counts, done } = edgeTexts(lane);
          const span = EDGE_LEFT - EDGE_RIGHT;
          expect(textWidth(title, fs), title).toBeLessThanOrEqual(span);
          expect(textWidth(counts, fs) + textWidth(done, fs) + fs, counts).toBeLessThanOrEqual(span);
        }
      });
    }
  });
});
