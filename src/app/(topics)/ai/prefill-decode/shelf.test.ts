import * as ENGINE from '@/lib/colorfigures/core';
import { palette } from '@/styles/palette';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, PALS, frameFor, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { buildTimeline, findPreset, totalDuration, ttft } from './timeline';
import { BASELINE, CONFIGS, activeConfig, alreadyNote, nextAction, observation, rowAlt, rowSummary, type Settings } from './shelf';
import { FLAG_H, HEAD_V, SHELF_SIZE, TRACK, labelSize, rowLines, shelfScene, textWidth, timeU, type Row } from './shelfScene';

const frame = (labelScale = 1) => ({ ...frameFor(SHELF_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (rows: Row[], labelScale = 1) => {
  const scale = Math.max(...rows.map((r) => totalDuration(r.phases)), 1);
  return withFrame(frame(labelScale), () => shelfScene(rows, scale));
};
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));
const summary = findPreset('summary')!;
const poem = findPreset('poem')!;
const QUIZ = { presetId: 'summary', input: summary.inputTokens, output: summary.outputTokens, compareId: 'poem' };
const settings = (o: Partial<Settings>): Settings => ({ inputTokens: 900, outputTokens: 60, baseline: null, compareId: 'poem', presetId: 'summary', ...o });

describe('세 버튼', () => {
  it('값은 예전 화면 그대로다: 기준 200·40, 입력만 1,200·40, 출력만 200·200', () => {
    expect(BASELINE).toEqual({ input: 200, output: 40 });
    expect(CONFIGS.input).toEqual({ input: 1200, output: 40 });
    expect(CONFIGS.output).toEqual({ input: 200, output: 200 });
  });

  it('지금 값이 어느 버튼과 같은지 알아보고, 본문대로 1 과 2 를 번갈아 권한다', () => {
    expect(activeConfig(settings({}), QUIZ)).toBe('quiz');
    const input = settings({ baseline: { ...BASELINE }, compareId: 'baseline', presetId: 'custom', ...{ inputTokens: 1200, outputTokens: 40 } });
    expect(activeConfig(input, QUIZ)).toBe('input');
    const output = settings({ baseline: { ...BASELINE }, compareId: 'baseline', presetId: 'custom', inputTokens: 200, outputTokens: 200 });
    expect(activeConfig(output, QUIZ)).toBe('output');
    expect(activeConfig(settings({ inputTokens: 77 }), QUIZ)).toBeNull();
    expect(nextAction('quiz')).toBe('input');
    expect(nextAction('input')).toBe('output');
    expect(nextAction('output')).toBe('input');
    expect(nextAction(null)).toBe('input');
    // 권하는 버튼은 지금 상태와 다르므로 누르면 받아들여진다.
    for (const a of ['quiz', 'input', 'output', null] as const) expect(nextAction(a)).not.toBe(a);
    expect(alreadyNote('input')).toContain('2. 출력만 늘리기');
  });
});

describe('본문과 같은 결과', () => {
  // 퀴즈: "이 시간 모형에서 첫 토큰이 먼저 나올 쪽은?" → 짧은 질문 → 긴 시. 끝나는 순서는 다르다.
  it('퀴즈의 두 요청: 시가 첫 토큰은 먼저, 끝은 나중이다', () => {
    const a = buildTimeline(summary.inputTokens, summary.outputTokens);
    const b = buildTimeline(poem.inputTokens, poem.outputTokens);
    expect(ttft(b)).toBeLessThan(ttft(a));
    expect(totalDuration(b)).toBeGreaterThan(totalDuration(a));
    expect(observation(a, b)).toBe('기준보다 첫 토큰은 나중에, 답의 끝은 먼저 옵니다.');
  });

  // beats.mdx: 입력을 늘리면 처음 기다림이, 출력을 늘리면 답이 끝날 때까지의 시간이 늘어난다.
  it('입력만 늘리면 첫 토큰과 끝이 같은 만큼 늦어지고, 출력만 늘리면 첫 토큰은 그대로 끝만 늦어진다', () => {
    const base = buildTimeline(BASELINE.input, BASELINE.output);
    const input = buildTimeline(CONFIGS.input.input, CONFIGS.input.output);
    const output = buildTimeline(CONFIGS.output.input, CONFIGS.output.output);
    expect(ttft(input) - ttft(base)).toBe(totalDuration(input) - totalDuration(base));
    expect(ttft(output)).toBe(ttft(base));
    expect(totalDuration(output)).toBeGreaterThan(totalDuration(base));
    expect(readFileSync(new URL('./content/beats.mdx', import.meta.url), 'utf8')).toContain('입력을 늘리면 처음 기다림이, 출력을 늘리면 답이 끝날 때까지의 시간이 늘어납니다');
  });

  it('줄의 대체 글은 예전 TimelineRow 의 문구 그대로다', () => {
    const a = buildTimeline(900, 60);
    expect(rowAlt('긴 기사', a)).toBe(`긴 기사: 첫 토큰까지 전체 시간의 ${rowSummary(a).waitPercent}퍼센트를 기다립니다. 출력은 모두 60토큰입니다.`);
    expect(rowAlt('읽기만', buildTimeline(10, 0))).toBe('읽기만: 읽기만 하고 쓰지 않습니다.');
  });
});

describe('shelfScene', () => {
  const rowsOf = (i1: number, o1: number, i2?: number, o2?: number): Row[] => [
    { label: '지금', phases: buildTimeline(i1, o1) },
    ...(i2 === undefined ? [] : [{ label: '바꾸기 전 기준', phases: buildTimeline(i2, o2!), muted: true }]),
  ];

  it('여러 조건을 숫자 오류 없이 그린다', () => {
    const cases = [rowsOf(900, 60, 10, 200), rowsOf(1200, 40, 200, 40), rowsOf(200, 200, 200, 40), rowsOf(8, 20), rowsOf(2000, 400, 4, 4), rowsOf(10, 0)];
    for (const rows of cases) for (const scale of [1, 2.2]) expect(draw(rows, scale)).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('시간 자는 0 이 왼쪽, 눈금 끝이 오른쪽이고, 두 줄이 같은 눈금을 쓴다', () => {
    expect(timeU(0, 100)).toBe(TRACK.u0);
    expect(timeU(100, 100)).toBe(TRACK.u1);
    expect(timeU(50, 100)).toBeGreaterThan(timeU(60, 100));
  });

  it('줄마다 이름과 첫 토큰·끝·기다림의 몫을 적는다', () => {
    const rows = rowsOf(900, 60, 10, 200);
    const bodies = texts(draw(rows)).map((t) => t.body);
    for (const r of rows) for (const l of rowLines(r)) expect(bodies).toContain(l);
    expect(rowLines(rows[0])[1]).toBe('첫 토큰까지 910 · 끝까지 1,500 · 기다림의 몫 61%');
  });

  it('줄 이름·수치는 깃발 이름표보다 위에 있고, 좁은 화면에서도 선반 길이를 넘지 않는다', () => {
    expect(HEAD_V[1] - FLAG_H - 3.5).toBeGreaterThan(4);
    for (const scale of [1, 1.6, 2.2]) {
      const size = labelSize(scale);
      const room = TRACK.u0 - TRACK.u1;
      for (const r of [rowsOf(1200, 40)[0], { label: '20턴짜리 대화 이어가기', phases: buildTimeline(2000, 400) }]) {
        expect(textWidth(rowLines(r)[0], size)).toBeLessThan(room);
        expect(textWidth(rowLines(r)[1], size * 0.85)).toBeLessThan(room);
      }
    }
  });

  it('한글이 든 글자는 일반 글꼴로 쓴다', () => {
    for (const t of texts(draw(rowsOf(900, 60, 10, 200)))) if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
  });
});

describe('색', () => {
  // AGENTS.md: 같은 뜻에는 같은 색. 그림 아래 범례는 프리필 = accent(겨자), 디코드 = secondary(파랑), 첫 토큰 = danger(빨강) 이다.
  it('읽기 판은 겨자색, 쓰기 막대는 파란색이다 (범례와 같다)', () => {
    const css = readFileSync(new URL('./PrefillDecode.module.css', import.meta.url), 'utf8');
    // 범례 견본: 프리필 = accent, 디코드 = secondary 줄무늬.
    expect(css).toMatch(/\.swatchPrefill \{[^}]*--color-accent/);
    expect(css).toMatch(/\.swatchDecode \{[^}]*--color-secondary/);
    const only = (i: number, o: number) => draw([{ label: '한 줄', phases: buildTimeline(i, o) }]);
    // 읽기만: 겨자색이 있고 파란색이 없다. 쓰기만: 그 반대.
    expect(only(100, 0)).toContain(PALS.mustard.l);
    expect(only(100, 0)).not.toContain(PALS.cobalt.l);
    expect(only(0, 30)).toContain(PALS.cobalt.l);
    expect(only(0, 30)).not.toContain(PALS.mustard.l);
  });
});

// AGENTS.md "색과 글자": 그림 색은 엔진의 PALS 와 재질에서 고른다.
describe('그림의 색', () => {
  it('그림에 쓰인 색은 모두 엔진의 PALS · 재질 · 잉크 색이다', () => {
    const allowed = new Set<string>(
      [...Object.values(ENGINE.PALS), ENGINE.METAL, ENGINE.CLEAR, ENGINE.CERAMIC, ENGINE.DARK, ENGINE.BOARD, ENGINE.WOOD]
        .flatMap((m) => [m.l, m.m, m.d])
        .concat([ENGINE.INK, ENGINE.SHADOW, palette.muted])
        .map((c) => c.toLowerCase()),
    );
    for (const s of [[{ label: 'a', phases: buildTimeline(900, 60) }, { label: 'b', phases: buildTimeline(10, 200), muted: true }]]) {
      const svg = withFrame({ ...frameFor(SHELF_SIZE, 'c', { view: FRONT_VIEW }), labelScale: 1 }, () => shelfScene(s, 2010));
      for (const [, c] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
    }
  });
});
