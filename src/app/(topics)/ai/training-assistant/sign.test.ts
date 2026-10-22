import * as ENGINE from '@/lib/colorfigures/core';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { palette } from '@/styles/palette';
import { SHEET_NOTES, SHEET_TITLE, advanceSign, chooseMode, initialSign, isSettled, nextAction, statusText, type Mode, type SignState } from './sign';
import { NOTE_LINE, QUESTION, QUESTION_LINES, SHEET_BODY, SIGN, SIGN_SIZE, facing, itemV, labelSize, signAngle, signScene, textWidth } from './signScene';

const run = (s: SignState) => settle(s, advanceSign, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(SIGN_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: SignState, labelScale = 1) => withFrame(frame(labelScale), () => signScene(s));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));
const mdx = (name: string) => readFileSync(new URL(`./content/${name}.mdx`, import.meta.url), 'utf8');

describe('순서', () => {
  it('이어쓰기 예시 면에서 시작해 지시를 따르는 예시로 돌리고, 다시 돌아올 수 있다', () => {
    let s = initialSign();
    expect(s.mode).toBe('continuation');
    expect(nextAction(s)).toBe('assistant');
    s = run(chooseMode(s, 'assistant'));
    expect(facing(s)).toBe('assistant');
    expect(nextAction(s)).toBe('continuation');
    s = run(chooseMode(s, 'continuation'));
    expect(facing(s)).toBe('continuation');
  });

  it('보이는 면 다시 고르기와 도는 동안의 입력은 상태를 바꾸지 않고 이유를 알린다', () => {
    const check = (t: SignState, s: SignState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t)).toContain(word);
    };
    const s0 = initialSign();
    check(chooseMode(s0, 'continuation'), s0, '이미');
    const turning = advanceSign(chooseMode(s0, 'assistant'), 0.2);
    check(chooseMode(turning, 'continuation'), turning, '도는 중');
    // 다 돌면 거절 문구는 사라진다.
    expect(statusText(run(chooseMode(turning, 'continuation')))).not.toContain('도는 중');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    const s0 = initialSign();
    for (const s of [s0, chooseMode(s0, 'assistant'), advanceSign(chooseMode(s0, 'assistant'), 0.3), run(chooseMode(s0, 'assistant'))]) {
      const a = nextAction(s);
      if (a) expect(chooseMode(s, a).note).toBe('');
    }
    expect(nextAction(chooseMode(s0, 'assistant'))).toBeNull();
  });

  it('판은 반 바퀴 도는 동안 앞의 반은 돌기 전 면, 뒤의 반은 새 면을 보인다', () => {
    let s = chooseMode(initialSign(), 'assistant');
    let prev = -1;
    while (!isSettled(s)) {
      const a = signAngle(s);
      expect(a).toBeGreaterThanOrEqual(prev);
      expect(facing(s)).toBe(a > 90 ? 'assistant' : 'continuation');
      prev = a;
      s = advanceSign(s, 1 / 60);
    }
    expect(signAngle(s)).toBe(0);
  });
});

describe('예시 면의 내용은 본문의 예시에서 온다', () => {
  it('첫 문장은 예시 본문에 그대로 있고, 번호 목록은 지시를 따르는 예시에만 세 줄 있다', () => {
    expect(mdx('continuation')).toContain(SHEET_BODY.continuation.first);
    expect(mdx('assistant')).toContain(SHEET_BODY.assistant.first);
    expect(SHEET_BODY.continuation.items).toHaveLength(0);
    expect(SHEET_BODY.assistant.items).toHaveLength(3);
    // 목록의 줄임말은 예시의 해당 항목 앞부분과 같다.
    const lines = mdx('assistant').split('\n').filter((l) => /^\d\./.test(l));
    SHEET_BODY.assistant.items.forEach((it, i) => expect(lines[i]).toContain(it.split(' ').slice(0, -1).join(' ')));
  });

  it('면 제목은 예전 카드 제목 그대로이고, 상태 문구는 본문 관찰 문장을 따른다', () => {
    expect(SHEET_TITLE).toEqual({ continuation: '글을 이어 쓴 예시', assistant: '요청에 답한 예시' });
    const obs = mdx('observation');
    expect(obs).toContain('이어쓰기 예시는 질문을 이야기 속 대사로 삼아 사건을 계속합니다.');
    expect(statusText(initialSign())).toContain('이어쓰기 예시는 질문을 이야기 속 대사로 삼아 사건을 계속합니다.');
    expect(obs).toContain('지시를 따르는 예시는 질문한 사람에게 말을 걸고, 요청한 세 가지를 제시합니다.');
    expect(statusText(run(chooseMode(initialSign(), 'assistant')))).toContain('지시를 따르는 예시는 질문한 사람에게 말을 걸고, 요청한 세 가지를 제시합니다.');
  });
});

describe('signScene', () => {
  const states = (): SignState[] => {
    const out: SignState[] = [initialSign()];
    let s = chooseMode(initialSign(), 'assistant');
    while (!isSettled(s)) {
      out.push(s);
      s = advanceSign(s, 0.05);
    }
    return [...out, s];
  };

  it('모든 단계를 숫자 오류 없이 그린다', () => {
    for (const scale of [1, 1.6, 2.2]) for (const s of states()) expect(draw(s, scale)).not.toMatch(/NaN|undefined|Infinity/);
  });

  // 글자 층은 그림 위에 얹히므로, 판이 도는 동안 면의 글자를 쓰면 비스듬한 판 위에 똑바로 떠 보인다.
  it('판이 도는 동안에는 면의 글자를 쓰지 않는다', () => {
    for (const s of states()) {
      const bodies = texts(draw(s)).map((t) => t.body);
      const shown = (Object.keys(SHEET_TITLE) as Mode[]).some((m) => bodies.includes(SHEET_TITLE[m]));
      expect(shown, `flip ${s.flip}`).toBe(isSettled(s));
    }
  });

  it('어느 면에도 점수·정답 표시나 옳고 그름의 색을 쓰지 않는다', () => {
    for (const s of states()) {
      const svg = draw(s);
      expect(svg).not.toContain(palette.danger);
      expect(svg).not.toContain(palette.success);
      for (const t of texts(svg)) expect(t.body).not.toMatch(/점수|정답|좋은 답|나쁜 답|★/);
    }
  });

  it('글자는 좁은 화면에서도 판과 질문판 안에 들고 서로 겹치지 않는다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      const size = labelSize(scale);
      const small = size * 0.85;
      for (const l of QUESTION_LINES) expect(textWidth(l, size)).toBeLessThanOrEqual(QUESTION.u1 - QUESTION.u0 - 6);
      // 질문 두 줄 사이 (가운데 ± 0.65 size) 와 질문판 높이.
      expect(size * 0.65 + size * 0.7).toBeLessThanOrEqual((QUESTION.v1 - QUESTION.v0) / 2);
      const room = 2 * SIGN.half - 12;
      for (const m of ['continuation', 'assistant'] as const) {
        expect(textWidth(SHEET_BODY[m].first, small)).toBeLessThanOrEqual(room);
        for (const it of SHEET_BODY[m].items) expect(textWidth(`3. ${it}`, small)).toBeLessThanOrEqual(room);
        for (const n of SHEET_NOTES[m]) expect(textWidth(n, small)).toBeLessThanOrEqual(room);
      }
      // 번호 목록의 마지막 줄은 아래 가는 선 위에 있다.
      expect(itemV(2, small) - small * 0.6).toBeGreaterThan(NOTE_LINE + 1);
    }
  });

  it('한글이 든 글자는 일반 글꼴로 쓴다', () => {
    for (const s of [initialSign(), run(chooseMode(initialSign(), 'assistant'))]) {
      for (const t of texts(draw(s))) if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
    }
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
    for (const s of [initialSign(), advanceSign(chooseMode(initialSign(), 'assistant'), 0.2), run(chooseMode(initialSign(), 'assistant'))]) {
      const svg = withFrame({ ...frameFor(SIGN_SIZE, 'c', { view: FRONT_VIEW }), labelScale: 1 }, () => signScene(s));
      for (const [, c] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
    }
  });
});
