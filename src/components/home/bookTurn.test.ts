import { describe, expect, it } from 'vitest';
import { bookTurnReducer, initialBookTurn, type BookTurnState } from './bookTurn';

const advance = (state: BookTurnState) => bookTurnReducer(state, { type: 'advance', phase: state.phase });
const select = (state: BookTurnState, index: number) => bookTurnReducer(state, { type: 'select', index });

function finish(state: BookTurnState) {
  for (let i = 0; state.phase !== 'idle' && i < 12; i++) state = advance(state);
  return state;
}

describe('popup book page turn', () => {
  it('keeps the old chapter until the turning page crosses the spine', () => {
    const outgoing = select(initialBookTurn, 1);
    expect(outgoing).toMatchObject({ displayed: 0, phase: 'turning-out' });
    const incoming = advance(outgoing);
    expect(incoming).toMatchObject({ displayed: 1, phase: 'turning-in' });
    // The incoming turn itself unfolds the popup; there is no separate opening phase.
    expect(advance(incoming)).toMatchObject({ displayed: 1, phase: 'idle' });
    expect(finish(incoming)).toMatchObject({ displayed: 1, phase: 'idle' });
  });

  it('turns back in the opposite direction', () => {
    const state = finish(select(initialBookTurn, 2));
    expect(select(state, 0)).toMatchObject({ direction: 'backward', displayed: 2, target: 0 });
  });

  it('serializes quick choices and finishes at the latest requested chapter', () => {
    let state = select(initialBookTurn, 1);
    state = select(state, 2);
    state = select(state, 0);
    expect(state).toMatchObject({ displayed: 0, target: 1, requested: 0 });
    expect(finish(state)).toMatchObject({ displayed: 0, requested: 0, phase: 'idle' });
  });

  it('does not turn a page when its current index is clicked', () => {
    expect(select(initialBookTurn, 0)).toBe(initialBookTurn);
  });

  it('settles immediately if reduced motion is enabled mid-turn', () => {
    const state = select(select(initialBookTurn, 1), 2);
    const settled = bookTurnReducer(state, { type: 'settle' });
    expect(settled).toMatchObject({ displayed: 2, target: 2, phase: 'idle' });
    expect(bookTurnReducer(settled, { type: 'advance', phase: 'turning-out' })).toBe(settled);
  });

  it('selects instantly with reduced motion even while another page is turning', () => {
    const state = advance(select(initialBookTurn, 1));
    expect(bookTurnReducer(state, { type: 'select', index: 2, instant: true })).toMatchObject({ displayed: 2, requested: 2, target: 2, phase: 'idle' });
  });
});
