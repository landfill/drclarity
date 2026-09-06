export type TurnPhase = 'idle' | 'folding' | 'turning-out' | 'turning-in' | 'opening';

export interface BookTurnState {
  displayed: number;
  target: number;
  requested: number;
  direction: 'forward' | 'backward';
  phase: TurnPhase;
}

export const phaseDuration: Record<Exclude<TurnPhase, 'idle'>, number> = {
  folding: 240,
  'turning-out': 340,
  'turning-in': 340,
  opening: 640,
};

export const initialBookTurn: BookTurnState = {
  displayed: 0, target: 0, requested: 0, direction: 'forward', phase: 'idle',
};

export type BookTurnAction =
  | { type: 'select'; index: number; instant?: boolean }
  | { type: 'advance'; phase: TurnPhase }
  | { type: 'settle' };

function beginTurn(state: BookTurnState, target: number): BookTurnState {
  return { ...state, target, requested: target, direction: target > state.displayed ? 'forward' : 'backward', phase: 'folding' };
}

/** Change content only at the page's midpoint; serialize fast clicks without losing the last choice. */
export function bookTurnReducer(state: BookTurnState, action: BookTurnAction): BookTurnState {
  if (action.type === 'settle') {
    return { ...state, displayed: state.requested, target: state.requested, phase: 'idle' };
  }
  if (action.type === 'select') {
    if (action.instant) return { ...state, displayed: action.index, target: action.index, requested: action.index, phase: 'idle' };
    if (state.phase !== 'idle') return { ...state, requested: action.index };
    return action.index === state.displayed ? state : beginTurn(state, action.index);
  }
  if (action.phase !== state.phase) return state;
  switch (state.phase) {
    case 'folding': return { ...state, phase: 'turning-out' };
    case 'turning-out': return { ...state, displayed: state.target, phase: 'turning-in' };
    case 'turning-in': return { ...state, phase: 'opening' };
    case 'opening': return state.requested === state.displayed ? { ...state, phase: 'idle' } : beginTurn(state, state.requested);
    default: return state;
  }
}
