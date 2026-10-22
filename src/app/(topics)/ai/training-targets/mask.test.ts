import { describe, expect, it } from 'vitest';
import { FRONT_VIEW, frameFor, settle, withFrame } from '@/lib/colorfigures/core';
import { GENERAL_FONT } from '@/lib/colorfigures/fonts';
import { PIECES, makeNextTokenPair } from './pairs';
import { FIRST, LAST, advanceMask, initialMask, isSettled, nextAction, nextCell, pairOf, prevCell, statusText, type MaskState } from './mask';
import { BLOCKS, MASK_SIZE, coverLeft, isCovered, maskScene, pieceSize, textWidth } from './maskScene';

const run = (s: MaskState) => settle(s, advanceMask, isSettled);
const at = (position: number): MaskState => ({ ...initialMask(), position, shown: position });
const draw = (s: MaskState, labelScale = 1) => withFrame({ ...frameFor(MASK_SIZE, 't', { view: FRONT_VIEW }), labelScale }, () => maskScene(s));
const bodies = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

describe('정답 자리', () => {
  it('정답 자리는 pairs.ts 와 같은 범위다: 두 번째 조각부터 마지막 조각까지', () => {
    expect(FIRST).toBe(1);
    expect(LAST).toBe(PIECES.length - 1);
    for (let p = FIRST; p <= LAST; p++) expect(pairOf(at(p))).toEqual(makeNextTokenPair(PIECES, p));
  });

  // 본문: 앞에서 정답이었던 조각이 다음 문제에서는 이미 주어진 문맥으로 들어간다.
  it('다음 칸으로 가면 방금 정답이던 조각이 입력의 마지막 조각이 된다', () => {
    for (let p = FIRST; p < LAST; p++) {
      const before = pairOf(at(p));
      const after = pairOf(run(nextCell(at(p))));
      expect(after.input[after.input.length - 1]).toBe(before.target);
    }
  });

  it('끝에서의 이전·다음은 상태를 바꾸지 않고 이유를 알린다', () => {
    const first = at(FIRST);
    const last = at(LAST);
    const refusedPrev = prevCell(first);
    const refusedNext = nextCell(last);
    expect({ ...refusedPrev, note: '' }).toEqual(first);
    expect({ ...refusedNext, note: '' }).toEqual(last);
    expect(statusText(refusedPrev)).toContain('입력이 없어');
    expect(statusText(refusedNext)).toContain('정답으로 삼을 조각이 없습니다');
  });

  it('상자는 한 칸 옮겨 가 정확히 서고, 움직이는 중에 다시 눌러도 새 자리로 간다', () => {
    let s = nextCell(at(FIRST));
    for (let i = 0; i < 30; i++) s = advanceMask(s, 1 / 60);
    expect(isSettled(s)).toBe(true);
    expect(s.shown).toBe(2);
    const moving = advanceMask(nextCell(at(2)), 0.1);
    expect(run(nextCell(moving)).shown).toBe(4);
  });

  it('nextAction 은 지금 누르면 받아들여지는 버튼만 돌려준다', () => {
    for (let p = FIRST; p <= LAST; p++) {
      const a = nextAction(at(p));
      if (a === 'next') expect(nextCell(at(p)).note).toBe('');
      if (a === 'prev') expect(prevCell(at(p)).note).toBe('');
    }
  });

  it('상태 문구는 입력 개수·입력·정답을 적고, 정답과 그 뒤를 입력에서 뺐다고 적는다', () => {
    const t = statusText(at(2));
    expect(t).toContain('입력 2개(오늘은 따뜻한)');
    expect(t).toContain('"차를" 가 정답');
    expect(t).toContain('정답과 그 뒤의 조각은');
  });
});

describe('maskScene', () => {
  it('모든 자리와 옮겨 가는 중을 숫자 오류 없이 그린다', () => {
    for (let shown = FIRST; shown <= LAST; shown += 0.25) expect(draw({ ...initialMask(), position: Math.ceil(shown), shown })).not.toMatch(/NaN|undefined|Infinity/);
  });

  // 본문: 지금 맞힐 조각과 그 뒤 문맥을 함께 보여 주면 다음 토큰 예측의 연습 조건이 깨진다.
  it('상자에 덮인 조각(정답과 그 뒤)은 블록 글자로 쓰지 않는다. 정답은 깃발에만 나온다', () => {
    for (let p = FIRST; p <= LAST; p++) {
      const texts = bodies(draw(at(p)));
      const { input, target } = pairOf(at(p));
      for (const piece of input) expect(texts).toContain(piece);
      for (let k = p + 1; k < PIECES.length; k++) expect(texts, `${p} ${PIECES[k]}`).not.toContain(PIECES[k]);
      expect(texts.filter((t) => t === target)).toHaveLength(1);
      expect(texts).toContain(`입력 ${input.length}개`);
      for (let i = 0; i < PIECES.length; i++) expect(isCovered(i, p)).toBe(i >= p);
    }
  });

  it('상자 왼쪽 끝은 정답 블록 안, 앞 블록 밖에 있다 (덮인 것과 입력이 섞이지 않는다)', () => {
    for (let p = FIRST; p <= LAST; p++) {
      expect(coverLeft(p)).toBeLessThan(BLOCKS[p].yL);
      expect(coverLeft(p)).toBeGreaterThan(BLOCKS[p].yR);
      expect(coverLeft(p)).toBeLessThan(BLOCKS[p - 1].yR);
    }
  });

  it('블록 글자는 좁은 화면에서도 블록 폭 안에 든다', () => {
    for (const scale of [1, 1.6, 2.2]) {
      PIECES.forEach((piece, i) => expect(textWidth(piece, pieceSize(scale))).toBeLessThanOrEqual(BLOCKS[i].yL - BLOCKS[i].yR));
    }
  });

  // AGENTS.md: 한글이 섞인 라벨은 일반 글꼴로 쓴다.
  it('한글이 든 글자는 일반 글꼴로 쓴다', () => {
    for (const m of draw(at(3)).matchAll(/<text[^>]*>([^<]*)<\/text>/g)) {
      if (/[가-힯]/.test(m[1])) expect(m[0], m[1]).toContain(GENERAL_FONT);
    }
  });
});
