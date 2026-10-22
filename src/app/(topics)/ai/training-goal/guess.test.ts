import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { palette } from '@/styles/palette';
import {
  EXAMPLES,
  advanceGoal,
  choose,
  initialGoal,
  isSettled,
  nextAction,
  nextExample,
  reveal,
  statusText,
  type GoalState,
} from './guess';
import { GOAL_SIZE, LABEL_Y, SLOT, STICKER_Y, VERDICT_Y, flapCorners, flapCovers, guessScene, sentenceSize, smallSize, stickerPos } from './guessScene';

const run = (s: GoalState) => settle(s, advanceGoal, isSettled);
const frame = (labelScale = 1) => ({ ...frameFor(GOAL_SIZE, 't', { view: FRONT_VIEW }), labelScale });
const draw = (s: GoalState, labelScale = 1) => withFrame(frame(labelScale), () => guessScene(s));
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => ({ tag: m[0], body: m[1] }));
const width = (str: string, size: number) => [...str].reduce((w, ch) => w + (/[가-힯]/.test(ch) ? 1.04 : 0.66), 0) * size;

describe('예시', () => {
  it('원문은 두 장이고, 원문의 다음 조각은 그 장의 후보 안에 있다', () => {
    expect(EXAMPLES).toHaveLength(2);
    for (const ex of EXAMPLES) {
      expect(ex.choices).toHaveLength(3);
      expect(ex.choices).toContain(ex.next);
    }
  });
});

describe('순서', () => {
  it('고르기 → 공개 → 다른 원문 순서로 간다', () => {
    let s = initialGoal();
    expect(nextAction(s)).toBeNull();
    s = run(choose(s, 1));
    expect(s.guess).toBe(1);
    expect(nextAction(s)).toBe('reveal');
    s = run(reveal(s));
    expect(s.revealed).toBe(true);
    expect(nextAction(s)).toBe('next');
    s = nextExample(s);
    expect(s).toMatchObject({ example: 1, guess: null, revealed: false, flap: 0 });
  });

  // 순서를 건너뛴 입력은 상태를 바꾸지 않고 이유를 알린다 (예전의 비활성 버튼 대신).
  it('고르기 전의 공개, 이미 연 뒤의 공개, 같은 후보 다시 고르기는 상태를 바꾸지 않고 이유를 알린다', () => {
    const check = (t: GoalState, s: GoalState, word: string) => {
      expect({ ...t, note: '' }).toEqual({ ...s, note: '' });
      expect(statusText(t)).toContain(word);
    };
    const s0 = initialGoal();
    check(reveal(s0), s0, '먼저');
    const chosen = run(choose(s0, 0));
    check(choose(chosen, 0), chosen, '이미');
    const open = run(reveal(chosen));
    check(reveal(open), open, '이미 열려');
  });

  it('공개한 뒤 다른 후보를 고르면 쪽지가 다시 닫힌다 (새 예상은 원문을 보기 전에)', () => {
    const open = run(reveal(run(choose(initialGoal(), 0))));
    const again = choose(open, 2);
    expect(again.revealed).toBe(false);
    expect(run(again).flap).toBe(0);
  });

  it('스티커가 옮겨 가고 쪽지가 열리는 동안에도 끝나면 정확히 선다', () => {
    let s = reveal({ ...choose(initialGoal(), 1), move: 1 });
    let steps = 0;
    while (!isSettled(s) && steps++ < 200) s = advanceGoal(s, 1 / 60);
    expect(s.flap).toBe(1);
    expect(isSettled(s)).toBe(true);
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    const states = [initialGoal(), choose(initialGoal(), 2), run(choose(initialGoal(), 2)), run(reveal(run(choose(initialGoal(), 2))))];
    for (const s of states) {
      const a = nextAction(s);
      if (a === 'reveal') expect(reveal(s).note).toBe('');
      if (a === 'next') expect(nextExample(s).note).toBe('');
    }
  });
});

describe('상태 문구 (Experiment 의 관찰 문구 그대로)', () => {
  it('원문과 다른 예상에는 "말이 될 수 있는 예상이어도, 이 위치의 학습 정답은 원문에 있던 조각" 이라고 적는다', () => {
    const diff = run(reveal(run(choose(initialGoal(), 1))));
    expect(statusText(diff)).toContain('말이 될 수 있는 예상이어도, 이 위치의 학습 정답은 원문에 있던 조각입니다.');
    const same = run(reveal(run(choose(initialGoal(), 0))));
    expect(statusText(same)).toContain('이 위치에서 예상과 원문이 같았습니다.');
    for (const s of [diff, same]) expect(statusText(s)).toContain('학습은 이 조각에 얼마나 확률을 주었는지 비교하는 데서 출발합니다.');
  });
});

describe('guessScene', () => {
  const states = (): GoalState[] => {
    const out: GoalState[] = [];
    for (const ex of [0, 1]) {
      const base = { ...initialGoal(), example: ex };
      for (const i of [0, 1, 2]) {
        const c = choose(base, i);
        out.push(base, c, { ...c, move: 0.5 }, run(c), { ...reveal(run(c)), flap: 0.3 }, { ...reveal(run(c)), flap: 0.7 }, run(reveal(run(c))));
      }
    }
    return out;
  };

  it('모든 단계를 숫자 오류 없이 그린다', () => {
    for (const s of states()) expect(draw(s)).not.toMatch(/NaN|undefined|Infinity/);
  });

  // 글자 층은 그림 위에 얹히므로, 쪽지가 가린 동안 원문의 다음 조각을 글자로 쓰면 쪽지 위로 비쳐 보인다.
  it('쪽지가 덮고 있는 동안에는 원문의 다음 조각과 나머지를 쓰지 않는다', () => {
    for (const s of states()) {
      const ex = EXAMPLES[s.example];
      const bodies = texts(draw(s)).map((t) => t.body);
      expect(bodies.includes(ex.rest), `flap ${s.flap}`).toBe(!flapCovers(s.flap));
    }
  });

  it('고른 스티커는 예상 칸으로 가고, 나머지는 제자리에 있다', () => {
    const s = run(choose(initialGoal(), 2));
    expect(stickerPos(s, 2)).toEqual({ y: (SLOT.next.yL + SLOT.next.yR) / 2, z: expect.any(Number) });
    expect(stickerPos(s, 0).y).toBe(STICKER_Y[0]);
    expect(stickerPos(s, 1).y).toBe(STICKER_Y[1]);
  });

  it('쪽지는 위쪽 경첩을 축으로 젖혀진다: 닫히면 아래로, 열리면 위로', () => {
    const closed = flapCorners(0);
    const open = flapCorners(1);
    expect(closed[2][2]).toBeLessThan(closed[1][2]);
    expect(open[2][2]).toBeGreaterThan(open[1][2]);
    expect(open[0]).toEqual(closed[0]);
  });

  // 본문: 이 화면의 "정답" 은 데이터의 다음 조각이고, 사실적·윤리적으로 유일하게 옳은 말을 뜻하지 않는다.
  it('견준 결과에 맞고 틀림의 색(초록·빨강)을 쓰지 않는다', () => {
    for (const s of states()) {
      for (const t of texts(draw(s)).filter((t) => t.body.startsWith('원문과'))) {
        expect(t.tag).not.toContain(palette.danger);
        expect(t.tag).not.toContain(palette.success);
      }
    }
  });

  it('원문 줄의 글자는 좁은 화면에서도 제 칸 안에 들고, 칸 이름·견준 결과도 서로와 칸을 넘지 않는다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      const size = sentenceSize(scale);
      const small = smallSize(scale);
      for (const ex of EXAMPLES) {
        expect(width(ex.prefix, size), ex.prefix).toBeLessThanOrEqual(SLOT.prefix.yL - SLOT.prefix.yR);
        expect(width(ex.next, size), ex.next).toBeLessThanOrEqual(SLOT.next.yL - SLOT.next.yR);
        expect(width(ex.rest, size), ex.rest).toBeLessThanOrEqual(SLOT.rest.yL - SLOT.rest.yR);
      }
      // "원문과 다름" 은 예상 칸 오른쪽에서 종이 안에 든다.
      const verdict = width('원문과 다름', small);
      expect(VERDICT_Y + verdict / 2).toBeLessThanOrEqual(SLOT.next.yR - 1);
      expect(VERDICT_Y - verdict / 2).toBeGreaterThanOrEqual(8);
      // "내 예상" 은 예상 칸 왼쪽.
      expect(LABEL_Y.guess - width('내 예상', small) / 2).toBeGreaterThanOrEqual(SLOT.next.yL + 1);
    }
  });

  // AGENTS.md: 한글이 섞인 라벨은 일반 글꼴로 쓴다.
  it('한글이 든 글자는 일반 글꼴로 쓴다', () => {
    for (const t of texts(draw(run(reveal(run(choose(initialGoal(), 1))))))) {
      if (/[가-힯]/.test(t.body)) expect(t.tag, t.body).toContain(GENERAL_FONT);
    }
  });
});
