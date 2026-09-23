import { describe, expect, it } from 'vitest';
import { Board } from '../../src/core/Board';
import { GameEngine } from '../../src/core/Engine';
import { RandomGenerator } from '../../src/core/Random';

describe('GameEngine Unit Tests', () => {
  it('starts a new game with exactly 2 spawned tiles and zero score', () => {
    const engine = new GameEngine();
    const result = engine.initNewGame();
    expect(result.tiles.length).toBe(2);
    expect(engine.getScore()).toBe(0);
    expect(engine.isGameWon()).toBe(false);
    expect(engine.isGameEnded()).toBe(false);

    const nonZeroCount = engine
      .getBoard()
      .toMatrix()
      .flat()
      .filter(v => v !== 0).length;
    expect(nonZeroCount).toBe(2);
  });

  describe('Anti-Double-Merge Verification', () => {
    it('rule 1: [2, 2, 2, 2] moving LEFT becomes [4, 4, 0, 0] with +8 score, NOT [8, 0, 0, 0]', () => {
      const customGrid = [
        [2, 2, 2, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      // Seed random generator to avoid unpredictable spawn interfering with row 0 if possible
      const random = new RandomGenerator(42);
      const engine = new GameEngine(random, new Board(4, customGrid));

      const moveResult = engine.move('LEFT');
      expect(moveResult.moved).toBe(true);
      expect(moveResult.scoreIncrement).toBe(8);
      expect(engine.getScore()).toBe(8);

      const row0 = engine.getBoard().toMatrix()[0];
      // The first two positions must be 4 and 4
      expect(row0[0]).toBe(4);
      expect(row0[1]).toBe(4);
      // It should NOT be [8, 0, 0, 0]
      expect(row0[0]).not.toBe(8);
    });

    it('rule 2: [2, 2, 2, 0] moving LEFT becomes [4, 2, 0, 0] with +4 score', () => {
      const customGrid = [
        [2, 2, 2, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      const moveResult = engine.move('LEFT');
      expect(moveResult.moved).toBe(true);
      expect(moveResult.scoreIncrement).toBe(4);

      const row0 = engine.getBoard().toMatrix()[0];
      expect(row0[0]).toBe(4);
      expect(row0[1]).toBe(2);
    });

    it('rule 3: [0, 2, 2, 2] moving RIGHT becomes [0, 0, 2, 4] with +4 score', () => {
      const customGrid = [
        [0, 2, 2, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      const moveResult = engine.move('RIGHT');
      expect(moveResult.moved).toBe(true);
      expect(moveResult.scoreIncrement).toBe(4);

      const row0 = engine.getBoard().toMatrix()[0];
      expect(row0[2]).toBe(2);
      expect(row0[3]).toBe(4);
    });

    it('rule 4: [4, 2, 2, 0] moving LEFT becomes [4, 4, 0, 0] with +4 score', () => {
      const customGrid = [
        [4, 2, 2, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      const moveResult = engine.move('LEFT');
      expect(moveResult.moved).toBe(true);
      expect(moveResult.scoreIncrement).toBe(4);

      const row0 = engine.getBoard().toMatrix()[0];
      expect(row0[0]).toBe(4);
      expect(row0[1]).toBe(4);
    });

    it('rule 5: [2, 0, 2, 4] moving LEFT becomes [4, 4, 0, 0] with +4 score', () => {
      const customGrid = [
        [2, 0, 2, 4],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      const moveResult = engine.move('LEFT');
      expect(moveResult.moved).toBe(true);
      expect(moveResult.scoreIncrement).toBe(4);

      const row0 = engine.getBoard().toMatrix()[0];
      expect(row0[0]).toBe(4);
      expect(row0[1]).toBe(4);
    });
  });

  describe('Directional Movement Tests', () => {
    it('moves tiles UP correctly', () => {
      const customGrid = [
        [0, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 2, 0, 0],
        [0, 4, 0, 0],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      const moveResult = engine.move('UP');
      expect(moveResult.moved).toBe(true);
      expect(moveResult.scoreIncrement).toBe(4);

      const matrix = engine.getBoard().toMatrix();
      expect(matrix[0][1]).toBe(4);
      expect(matrix[1][1]).toBe(4);
    });

    it('moves tiles DOWN correctly', () => {
      const customGrid = [
        [0, 4, 0, 0],
        [0, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 2, 0, 0],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      const moveResult = engine.move('DOWN');
      expect(moveResult.moved).toBe(true);
      expect(moveResult.scoreIncrement).toBe(4);

      const matrix = engine.getBoard().toMatrix();
      expect(matrix[2][1]).toBe(4);
      expect(matrix[3][1]).toBe(4);
    });
  });

  describe('Edge Cases and Invalidation', () => {
    it('does not spawn a tile or add score when a move is invalid', () => {
      const customGrid = [
        [2, 0, 0, 0],
        [4, 0, 0, 0],
        [8, 0, 0, 0],
        [16, 0, 0, 0],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      // Moving LEFT when all tiles are already leftmost and cannot merge
      const moveResult = engine.move('LEFT');
      expect(moveResult.moved).toBe(false);
      expect(moveResult.scoreIncrement).toBe(0);
      expect(moveResult.spawnedTile).toBeNull();
      expect(engine.getScore()).toBe(0);
    });
  });

  describe('Win and Game Over Conditions', () => {
    it('detects win when a 2048 tile is created', () => {
      const customGrid = [
        [1024, 1024, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      const moveResult = engine.move('LEFT');
      expect(moveResult.moved).toBe(true);
      expect(moveResult.isWon).toBe(true);
      expect(engine.isGameWon()).toBe(true);
    });

    it('allows continuing game past 2048 without re-triggering win flag', () => {
      const customGrid = [
        [1024, 1024, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      engine.move('LEFT');
      expect(engine.isGameWon()).toBe(true);

      engine.continueGame();
      const nextMove = engine.move('DOWN');
      expect(nextMove.isWon).toBe(false);
    });

    it('detects game over when board fills and no moves remain', () => {
      const customGrid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [512, 1024, 2, 4],
        [8, 16, 32, 0], // Only (3,3) is empty
      ];
      // Configure random generator to spawn a 2 at (3,3) that cannot merge
      const random = new RandomGenerator(10);
      const engine = new GameEngine(random, new Board(4, customGrid));

      // Before move, can move
      expect(engine.isGameEnded()).toBe(false);

      // Now fill with a non-matching tile to trigger game over
      const fullGrid = [
        [2, 4, 8, 16],
        [32, 64, 128, 256],
        [2, 4, 8, 16],
        [32, 64, 128, 256],
      ];
      const fullEngine = new GameEngine(random, new Board(4, fullGrid));
      expect(fullEngine.canMoveAny()).toBe(false);
    });
  });

  describe('Undo & State Serialization', () => {
    it('restores previous board and score on undo', () => {
      const customGrid = [
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      expect(engine.canUndo()).toBe(false);

      engine.move('LEFT');
      expect(engine.getScore()).toBe(4);
      expect(engine.canUndo()).toBe(true);

      const undoSuccess = engine.undo();
      expect(undoSuccess).toBe(true);
      expect(engine.getScore()).toBe(0);
      expect(engine.getBoard().get(0, 0)).toBe(2);
      expect(engine.getBoard().get(0, 1)).toBe(2);
      expect(engine.canUndo()).toBe(false);
    });

    it('serializes and deserializes state accurately', () => {
      const engine = new GameEngine();
      engine.initNewGame();
      const state = engine.getState();
      expect(state.version).toBe(1);
      expect(state.grid.length).toBe(4);

      const engine2 = new GameEngine();
      const restored = engine2.restoreState(state);
      expect(restored).toBe(true);
      expect(engine2.getScore()).toBe(engine.getScore());
      expect(engine2.getBoard().toMatrix()).toEqual(engine.getBoard().toMatrix());
    });
  });

  describe('Stats & Hint Engine', () => {
    it('tracks moves count and game stats accurately', () => {
      const customGrid = [
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      expect(engine.getMovesCount()).toBe(0);

      engine.move('LEFT');
      expect(engine.getMovesCount()).toBe(1);

      const stats = engine.getStats();
      expect(stats.movesCount).toBe(1);
      expect(stats.highestTile).toBe(4);
      expect(stats.gamesPlayed).toBe(1);
    });

    it('recommends the optimal move direction with getBestHintDirection()', () => {
      const customGrid = [
        [4, 0, 0, 0],
        [4, 0, 0, 0],
        [8, 2, 4, 8],
        [16, 32, 64, 128],
      ];
      const engine = new GameEngine(new RandomGenerator(42), new Board(4, customGrid));
      // Moving UP merges 4+4=8 (+8 points), higher than any other direction
      const hint = engine.getBestHintDirection();
      expect(hint).toBe('UP');
    });

    it('persists and updates extended settings (volume, hints, confirmRestart)', () => {
      const engine = new GameEngine();
      engine.updateSettings({
        soundVolume: 0.5,
        musicVolume: 0.7,
        showHints: true,
        confirmRestart: false,
      });

      const settings = engine.getSettings();
      expect(settings.soundVolume).toBe(0.5);
      expect(settings.musicVolume).toBe(0.7);
      expect(settings.showHints).toBe(true);
      expect(settings.confirmRestart).toBe(false);

      const state = engine.getState();
      const engine2 = new GameEngine();
      engine2.restoreState(state);
      expect(engine2.getSettings().soundVolume).toBe(0.5);
      expect(engine2.getSettings().showHints).toBe(true);
      expect(engine2.getSettings().confirmRestart).toBe(false);
    });
  });
});
