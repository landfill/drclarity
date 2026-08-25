import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TURNS,
  DEFAULT_WINDOW,
  FINAL_QUESTION,
  MAX_TURNS,
  MIN_TURNS,
  NAME_TURN_ID,
  SCRIPT,
  USER_NAME,
  WINDOW_SIZES,
  fitToWindow,
  tokenCount,
} from './conversation';

describe('시나리오', () => {
  it('첫 메시지에 이름이 들어 있다 — 이 주제의 장치 전부가 여기 걸려 있다', () => {
    expect(SCRIPT[0].id).toBe(NAME_TURN_ID);
    expect(SCRIPT[0].text).toContain(USER_NAME);
  });

  it('이름은 첫 메시지에만 있다 — 다른 곳에 또 있으면 밀려나도 답할 수 있어 실험이 무너진다', () => {
    const mentions = [...SCRIPT.slice(1), FINAL_QUESTION].filter(turn =>
      turn.text.includes(USER_NAME)
    );
    expect(mentions).toEqual([]);
  });

  it('첫 메시지가 밀려난 창에는 이름이 한 글자도 남지 않는다 — 화면의 답과 모델이 보는 것이 어긋나면 안 된다', () => {
    const all = [...SCRIPT, FINAL_QUESTION];
    for (const limit of WINDOW_SIZES) {
      for (let count = MIN_TURNS; count <= MAX_TURNS; count += 1) {
        const state = fitToWindow([...SCRIPT.slice(0, count), FINAL_QUESTION], limit);
        if (state.remembersName) continue;
        const leaked = state.turns.filter(turn => turn.inWindow && turn.text.includes(USER_NAME));
        expect(leaked.map(turn => turn.id)).toEqual([]);
      }
    }
    expect(all.length).toBeGreaterThan(0);
  });

  it('사용자와 모델이 번갈아 말한다', () => {
    SCRIPT.forEach((turn, index) => {
      expect(turn.role).toBe(index % 2 === 0 ? 'user' : 'ai');
    });
  });

  it('마지막 질문은 사용자의 말이다', () => {
    expect(FINAL_QUESTION.role).toBe('user');
  });
});

describe('tokenCount', () => {
  /**
   * 시리즈 1편 `ai/tokenizer` 의 어휘에 묶인 값이다. 그쪽을 손대면 여기가 깨진다 —
   * 화면의 숫자가 조용히 달라지는 것을 막으려는 것이므로, 깨지면 값을 갱신하되
   * 두 주제가 같은 것을 가리키는지 먼저 확인할 것.
   */
  it('시나리오의 토큰 수가 고정되어 있다', () => {
    expect(SCRIPT.map(turn => tokenCount(turn.text))).toEqual([
      61, 51, 31, 68, 58, 63, 44, 64, 45, 62, 31, 62,
    ]);
    expect(tokenCount(FINAL_QUESTION.text)).toBe(29);
  });

  it('빈 문자열은 0 이다', () => {
    expect(tokenCount('')).toBe(0);
  });

  it('긴 문장이 더 많은 자리를 먹는다', () => {
    expect(tokenCount('바다가 보이는 숙소를 찾고 있어요.')).toBeLessThan(
      tokenCount('안녕하세요! 저는 지민이라고 합니다. 다음 주에 부산으로 여행을 가요.')
    );
  });
});

describe('fitToWindow', () => {
  const all = [...SCRIPT, FINAL_QUESTION];

  it('창이 넉넉하면 아무것도 밀려나지 않는다', () => {
    const state = fitToWindow(all, 100_000);
    expect(state.droppedCount).toBe(0);
    expect(state.turns.every(turn => turn.inWindow)).toBe(true);
    expect(state.remembersName).toBe(true);
  });

  it('창을 넘기면 오래된 쪽부터 밀려난다', () => {
    const state = fitToWindow(all, 120);
    expect(state.droppedCount).toBeGreaterThan(0);
    // 밀려난 것은 전부 앞쪽이고, 남은 것은 전부 뒤쪽이다.
    const kept = state.turns.filter(turn => turn.inWindow);
    const dropped = state.turns.filter(turn => !turn.inWindow);
    expect(dropped.length + kept.length).toBe(all.length);
    expect(state.turns.slice(0, dropped.length).every(turn => !turn.inWindow)).toBe(true);
  });

  it('방금 한 질문은 어떤 창에서도 남는다 — 답이 갈리는 이유가 질문을 못 봐서가 아니어야 한다', () => {
    for (const limit of WINDOW_SIZES) {
      const state = fitToWindow(all, limit);
      expect(state.turns.at(-1)?.inWindow).toBe(true);
    }
  });

  it('창 안 토큰 합계가 한도를 넘지 않는다', () => {
    for (const limit of WINDOW_SIZES) {
      const state = fitToWindow(all, limit);
      const sum = state.turns
        .filter(turn => turn.inWindow)
        .reduce((total, turn) => total + turn.tokens, 0);
      expect(sum).toBe(state.used);
      expect(sum).toBeLessThanOrEqual(limit);
    }
  });

  it('자리가 남아도 앞의 짧은 메시지를 건너뛰어 끼워 넣지 않는다', () => {
    const turns = [
      { id: 'short', role: 'user' as const, text: 'hi' },
      { id: 'long', role: 'ai' as const, text: 'x'.repeat(200) },
      { id: 'last', role: 'user' as const, text: 'ok' },
    ];
    const state = fitToWindow(turns, tokenCount('hi') + tokenCount('ok') + 1);
    expect(state.turns.map(turn => turn.inWindow)).toEqual([false, false, true]);
  });

  it('가장 좁은 창에서는 이름이 밀려나고, 가장 넓은 창에서는 남는다', () => {
    expect(fitToWindow(all, WINDOW_SIZES[0]).remembersName).toBe(false);
    expect(fitToWindow(all, WINDOW_SIZES.at(-1)!).remembersName).toBe(true);
  });

  it('가장 넓은 창은 대화 전체보다 넓다 — 아무것도 밀려나지 않는 상태를 볼 수 있어야 한다', () => {
    expect(fitToWindow(all, WINDOW_SIZES.at(-1)!).droppedCount).toBe(0);
  });

  it('처음 상태에서는 아무것도 밀려나지 않는다 — 늘려 가며 보는 화면이다', () => {
    const start = [...SCRIPT.slice(0, DEFAULT_TURNS), FINAL_QUESTION];
    const state = fitToWindow(start, DEFAULT_WINDOW);
    expect(state.droppedCount).toBe(0);
    expect(state.remembersName).toBe(true);
  });

  it('대화가 짧으면 좁은 창에서도 이름이 남는다 — 창이 아니라 길이의 문제임이 드러난다', () => {
    const short = [...SCRIPT.slice(0, MIN_TURNS), FINAL_QUESTION];
    expect(fitToWindow(short, WINDOW_SIZES.at(-1)!).remembersName).toBe(true);
  });

  it('메시지를 늘릴수록 밀려나는 수가 줄지 않는다', () => {
    let previous = 0;
    for (let count = MIN_TURNS; count <= MAX_TURNS; count += 1) {
      const state = fitToWindow([...SCRIPT.slice(0, count), FINAL_QUESTION], WINDOW_SIZES[1]);
      expect(state.droppedCount).toBeGreaterThanOrEqual(previous);
      previous = state.droppedCount;
    }
  });

  it('한 메시지가 창보다 크면 아무것도 들어가지 못한다', () => {
    const state = fitToWindow([SCRIPT[0]], 1);
    expect(state.used).toBe(0);
    expect(state.droppedCount).toBe(1);
  });
});
