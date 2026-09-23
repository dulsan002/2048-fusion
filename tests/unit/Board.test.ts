import { describe, expect, it } from 'vitest';
import { Board, BOARD_SIZE } from '../../src/core/Board';

describe('Board Unit Tests', () => {
  it('initializes a 4x4 empty board by default', () => {
    const board = new Board();
    expect(board.size).toBe(BOARD_SIZE);
    expect(board.getEmptyCells().length).toBe(16);
    expect(board.hasEmptyCells()).toBe(true);
    expect(board.getMaxTile()).toBe(0);
  });

  it('correctly sets and gets cell values', () => {
    const board = new Board();
    board.set(1, 2, 16);
    expect(board.get(1, 2)).toBe(16);
    expect(board.isEmpty(1, 2)).toBe(false);
    expect(board.getEmptyCells().length).toBe(15);
  });

  it('handles boundary conditions safely', () => {
    const board = new Board();
    expect(board.isWithinBounds(-1, 0)).toBe(false);
    expect(board.isWithinBounds(0, 4)).toBe(false);
    expect(board.isWithinBounds(4, 4)).toBe(false);
    expect(board.isWithinBounds(2, 2)).toBe(true);
    expect(board.get(-1, 0)).toBe(0);
    expect(board.get(5, 5)).toBe(0);
  });

  it('detects available moves when empty cells exist', () => {
    const board = new Board();
    board.set(0, 0, 2);
    expect(board.hasAvailableMoves()).toBe(true);
  });

  it('detects available moves when board is full but has horizontal matches', () => {
    const grid = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 2, 2], // horizontal match at (2,2) and (2,3)
      [4, 8, 16, 32],
    ];
    const board = new Board(4, grid);
    expect(board.hasEmptyCells()).toBe(false);
    expect(board.hasAvailableMoves()).toBe(true);
  });

  it('detects available moves when board is full but has vertical matches', () => {
    const grid = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 4, 8],
      [512, 2, 16, 32], // vertical match at (2,0) and (3,0)
    ];
    const board = new Board(4, grid);
    expect(board.hasEmptyCells()).toBe(false);
    expect(board.hasAvailableMoves()).toBe(true);
  });

  it('detects game over when board is completely full and no matches exist', () => {
    const grid = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [2, 4, 8, 16],
      [32, 64, 128, 256],
    ];
    const board = new Board(4, grid);
    expect(board.hasEmptyCells()).toBe(false);
    expect(board.hasAvailableMoves()).toBe(false);
  });

  it('creates an independent deep clone', () => {
    const board = new Board();
    board.set(0, 0, 8);
    const clone = board.clone();
    clone.set(0, 0, 16);
    expect(board.get(0, 0)).toBe(8);
    expect(clone.get(0, 0)).toBe(16);
  });
});
