import { Position } from './Types';

/**
 * Random generator with optional seeding for deterministic testing and replayability.
 */
export class RandomGenerator {
  private seed: number | null = null;

  constructor(seed?: number) {
    if (seed !== undefined) {
      this.seed = seed;
    }
  }

  /**
   * Mulberry32 32-bit PRNG algorithm for deterministic pseudo-random sequences.
   */
  public next(): number {
    if (this.seed === null) {
      return Math.random();
    }
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * 90% probability of 2, 10% probability of 4 (standard 2048 rule).
   */
  public spawnValue(): number {
    return this.next() < 0.9 ? 2 : 4;
  }

  /**
   * Chooses an empty cell from an available list.
   */
  public chooseCell(emptyCells: Position[]): Position | null {
    if (emptyCells.length === 0) return null;
    const index = Math.floor(this.next() * emptyCells.length);
    return emptyCells[index];
  }
}
