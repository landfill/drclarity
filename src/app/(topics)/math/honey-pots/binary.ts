export const ANT_COUNT = 5;
export const POT_COUNT = 25;
export const ANT_BITS = [16, 8, 4, 2, 1] as const;
export const ANT_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;
export const MAX_POTS = 2 ** ANT_COUNT - 1; // 31

export function toBinary5(pot: number): string {
  return pot.toString(2).padStart(5, '0');
}

export function potsForAnt(bitValue: number): number[] {
  const pots: number[] = [];
  for (let i = 1; i <= POT_COUNT; i++) {
    if ((i & bitValue) !== 0) {
      pots.push(i);
    }
  }
  return pots;
}

export function antsForPot(pot: number): number[] {
  const ants: number[] = [];
  for (const bit of ANT_BITS) {
    if ((pot & bit) !== 0) {
      ants.push(bit);
    }
  }
  return ants;
}

export function decodeDeadAnts(deadBits: readonly number[]): number {
  return deadBits.reduce((sum, bit) => sum + bit, 0);
}
