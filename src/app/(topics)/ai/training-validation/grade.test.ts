import * as ENGINE from '@/lib/colorfigures/core';
import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { palette } from '@/styles/palette';
import { HELD_OUT, TRAIN } from './evaluation';
import {
  CARDS,
  advanceGrade,
  chooseMethod,
  dayOf,
  finalScores,
  initialGrade,
  isSettled,
  nextAction,
  predictorFor,
  shownPrediction,
  shownScores,
  statusText,
  type GradeState,
} from './grade';
import { CARD, DAY_SHIFT, GRADE_SIZE, MARK_SHIFT, PLAQUE, TRAY, cardCenter, cardTextSize, gradeScene, labelSize, plaqueLines, textWidth } from './gradeScene';

const run = (s: GradeState) => settle(s, advanceGrade, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(GRADE_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: GradeState, labelScale = 1) => withFrame(frame(labelScale), () => gradeScene(s));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));

describe('순서', () => {
  it('기억 방식에서 시작해 날씨별 다수 답으로 바꾸고, 다시 돌아올 수 있다', () => {
    let s = initialGrade();
    expect(s.method).toBe('memory');
    expect(isSettled(s)).toBe(true);
    expect(nextAction(s)).toBe('rule');
    s = run(chooseMethod(s, 'rule'));
    expect(s.method).toBe('rule');
    expect(nextAction(s)).toBe('memory');
    s = run(chooseMethod(s, 'memory'));
    expect(s.method).toBe('memory');
  });

  // 순서를 건너뛴 입력은 상태를 바꾸지 않고 이유를 알린다 (예전의 aria-pressed 버튼은 같은 방식을 다시 눌러도 조용히 지나갔다).
  it('같은 방식 다시 고르기와 도장을 찍는 동안의 바꾸기는 상태를 바꾸지 않고 이유를 알린다', () => {
    const check = (t: GradeState, s: GradeState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t)).toContain(word);
    };
    const s0 = initialGrade();
    check(chooseMethod(s0, 'memory'), s0, '이미');
    const moving = advanceGrade(chooseMethod(s0, 'rule'), 0.3);
    check(chooseMethod(moving, 'memory'), moving, '찍는 중');
  });

  it('도장을 다 찍으면 "찍는 중" 거절 문구가 사라진다', () => {
    const refused = chooseMethod(advanceGrade(chooseMethod(initialGrade(), 'rule'), 0.3), 'memory');
    expect(statusText(refused)).toContain('찍는 중');
    expect(statusText(run(refused))).toBe('날씨별 다수 답: 학습 5/6, 새 예시 4/4. 학습 자료에서 날씨별로 가장 많았던 답을 사용합니다.');
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    const s0 = initialGrade();
    const states = [s0, chooseMethod(s0, 'rule'), advanceGrade(chooseMethod(s0, 'rule'), 0.5), run(chooseMethod(s0, 'rule'))];
    for (const s of states) {
      const a = nextAction(s);
      if (a) expect(chooseMethod(s, a).note).toBe('');
    }
    expect(nextAction(chooseMethod(s0, 'rule'))).toBeNull();
  });

  it('도장은 학습 카드부터 차례로 다시 찍히고, 맞힌 수는 찍힌 도장으로 센다', () => {
    let s = chooseMethod(initialGrade(), 'rule');
    expect(shownScores(s)).toEqual(finalScores('memory'));
    let prev = -1;
    while (!isSettled(s)) {
      const k = Math.floor(s.stamped);
      for (let i = 0; i < CARDS.length; i++) expect(shownPrediction(s, i).method).toBe(i < k ? 'rule' : 'memory');
      expect(k).toBeGreaterThanOrEqual(prev);
      prev = k;
      s = advanceGrade(s, 1 / 60);
    }
    expect(shownScores(s)).toEqual(finalScores('rule'));
  });
});

describe('본문과 같은 성적', () => {
  // 본문: "문장을 그대로 기억하면 학습 자료는 6개 모두 … 새 예시에서는 4개 중 2개", "6개 중 5개 … 모두 맞힙니다"
  it('기억 방식은 6/6 · 2/4, 날씨별 다수 답은 5/6 · 4/4 이고, 상태 문구도 같다', () => {
    expect(finalScores('memory')).toEqual({ train: 6, heldOut: 2 });
    expect(finalScores('rule')).toEqual({ train: 5, heldOut: 4 });
    expect(statusText(initialGrade())).toBe('기억 방식: 학습 6/6, 새 예시 2/4. 처음 보는 문장은 모두 0으로 답합니다.');
    expect(statusText(run(chooseMethod(initialGrade(), 'rule')))).toBe('날씨별 다수 답: 학습 5/6, 새 예시 4/4. 학습 자료에서 날씨별로 가장 많았던 답을 사용합니다.');
  });

  it('카드는 학습 6장 다음 새 예시 4장이고, 날 이름은 서로 다르다', () => {
    expect(CARDS.slice(0, 6)).toEqual([...TRAIN]);
    expect(CARDS.slice(6)).toEqual([...HELD_OUT]);
    expect(new Set(CARDS.map(dayOf)).size).toBe(CARDS.length);
  });
});

describe('gradeScene', () => {
  const states = (): GradeState[] => {
    const out: GradeState[] = [initialGrade()];
    let s = chooseMethod(initialGrade(), 'rule');
    while (!isSettled(s)) {
      out.push(s);
      s = advanceGrade(s, 0.1);
    }
    return [...out, s];
  };

  it('모든 단계를 숫자 오류 없이 그린다', () => {
    for (const scale of [1, 1.6, 2.2]) for (const s of states()) expect(draw(s, scale)).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('카드는 제 칸 안에 있고 서로 겹치지 않는다', () => {
    const centers = CARDS.map((_, i) => cardCenter(i));
    centers.forEach(([u, v], i) => {
      const tray = i < TRAIN.length ? TRAY.train : TRAY.heldOut;
      expect(u + CARD.w / 2).toBeLessThanOrEqual(tray.u1);
      expect(u - CARD.w / 2).toBeGreaterThanOrEqual(tray.u0);
      expect(v + CARD.h / 2).toBeLessThanOrEqual(TRAY.v1 - 6);
      expect(v - CARD.h / 2).toBeGreaterThanOrEqual(TRAY.v0);
      for (let j = 0; j < i; j++) {
        const [u2, v2] = centers[j];
        expect(Math.abs(u - u2) >= CARD.w || Math.abs(v - v2) >= CARD.h).toBe(true);
      }
    });
  });

  it('글자는 좁은 화면에서도 카드와 방식 판을 넘지 않는다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      const card = cardTextSize(scale);
      for (const e of CARDS) {
        // 날 이름: 왼쪽 끝은 카드 안, 오른쪽 끝은 맞음·틀림 표시(반지름 2.2)에 닿지 않는다.
        const w = textWidth(dayOf(e), card);
        expect(DAY_SHIFT + w / 2, dayOf(e)).toBeLessThanOrEqual(CARD.w / 2 - 0.5);
        expect(DAY_SHIFT - w / 2, dayOf(e)).toBeGreaterThan(MARK_SHIFT + 2.2);
      }
      for (const m of ['memory', 'rule'] as const) {
        const [l1, l2] = plaqueLines(m);
        const room = PLAQUE.u1 - PLAQUE.u0 - 16;
        expect(textWidth(l1, labelSize(scale))).toBeLessThanOrEqual(room);
        expect(textWidth(l2, labelSize(scale) * 0.82)).toBeLessThanOrEqual(room);
      }
    }
  });

  // 본문: 평가 문장의 정답은 예측을 만들 때 사용하지 않는다. 방식은 학습 자료만으로 만든다.
  it('방식은 새 예시의 정답이 바뀌어도 같은 예측을 내고, 그림은 학습 칸의 화살표에 그 사실을 적는다', () => {
    for (const m of ['memory', 'rule'] as const) {
      for (let i = TRAIN.length; i < CARDS.length; i++) {
        const flipped = { ...CARDS[i], label: (1 - CARDS[i].label) as 0 | 1 };
        expect(shownPrediction({ ...initialGrade(), method: m, prev: m }, i).value).toBe(predictorFor(m)(flipped));
      }
    }
    expect(texts(draw(initialGrade())).map((t) => t.body)).toContain('학습 자료로만 만듦');
  });

  it('맞음·틀림 표시와 견준 결과에 옳고 그름의 색을 쓰지 않는다', () => {
    for (const s of states()) {
      const svg = draw(s);
      expect(svg).not.toContain(palette.danger);
      expect(svg).not.toContain(palette.success);
    }
  });

  it('한글이 든 글자는 일반 글꼴로 쓴다', () => {
    for (const t of texts(draw(initialGrade()))) if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
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
    for (const s of [initialGrade(), advanceGrade(chooseMethod(initialGrade(), 'rule'), 0.5), run(chooseMethod(initialGrade(), 'rule'))]) {
      const svg = withFrame({ ...frameFor(GRADE_SIZE, 'c', { view: FRONT_VIEW }), labelScale: 1 }, () => gradeScene(s));
      for (const [, c] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)) expect(allowed, c).toContain(c.toLowerCase());
    }
  });
});
