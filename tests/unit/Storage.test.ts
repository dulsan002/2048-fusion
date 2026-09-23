import { describe, expect, it } from 'vitest';
import { StorageAdapter } from '../../src/platform/StorageAdapter';

describe('StorageAdapter Unit Tests', () => {
  const storage = StorageAdapter.getInstance();

  it('validates a correct GameState payload', () => {
    const validState = {
      version: 1,
      grid: [
        [2, 0, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      score: 120,
      bestScore: 500,
      isWon: false,
      isGameOver: false,
      hasContinued: false,
      settings: {
        soundEnabled: true,
        hapticsEnabled: true,
        highContrast: false,
        reducedMotion: false,
      },
      timestamp: 1700000000000,
    };

    expect(storage.validateState(validState)).toBe(true);
  });

  it('rejects an invalid or corrupted payload', () => {
    expect(storage.validateState(null)).toBe(false);
    expect(storage.validateState('corrupted string')).toBe(false);
    expect(storage.validateState({ version: 1, score: -5 })).toBe(false);
    expect(storage.validateState({ version: 1, grid: [[1, 2]] })).toBe(false);
    expect(
      storage.validateState({
        version: 1,
        score: 10,
        bestScore: 20,
        grid: [
          [2, 0, 'invalid', 0],
          [0, 4, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
      })
    ).toBe(false);
  });
});
