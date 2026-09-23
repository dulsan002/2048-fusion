import { Position } from './Types';

export const BOARD_SIZE = 4;

export class Board {
  public readonly size: number;
  private grid: number[][];

  constructor(size: number = BOARD_SIZE, initialGrid?: number[][]) {
    this.size = size;
    if (initialGrid && initialGrid.length === size && initialGrid.every(row => row.length === size)) {
      this.grid = initialGrid.map(row => [...row]);
    } else {
      this.grid = Array.from({ length: size }, () => Array(size).fill(0));
    }
  }

  public get(row: number, col: number): number {
    if (!this.isWithinBounds(row, col)) return 0;
    return this.grid[row][col];
  }

  public set(row: number, col: number, value: number): void {
    if (this.isWithinBounds(row, col)) {
      this.grid[row][col] = value;
    }
  }

  public isWithinBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  public isEmpty(row: number, col: number): boolean {
    return this.get(row, col) === 0;
  }

  public getEmptyCells(): Position[] {
    const emptyCells: Position[] = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }
    return emptyCells;
  }

  public hasEmptyCells(): boolean {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) return true;
      }
    }
    return false;
  }

  public getMaxTile(): number {
    let max = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] > max) {
          max = this.grid[r][c];
        }
      }
    }
    return max;
  }

  /**
   * Returns true if any adjacent cell has the same value or if empty cells exist.
   */
  public hasAvailableMoves(): boolean {
    if (this.hasEmptyCells()) return true;

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const val = this.grid[r][c];
        // Check right
        if (c + 1 < this.size && this.grid[r][c + 1] === val) return true;
        // Check down
        if (r + 1 < this.size && this.grid[r + 1][c] === val) return true;
      }
    }
    return false;
  }

  public toMatrix(): number[][] {
    return this.grid.map(row => [...row]);
  }

  public clone(): Board {
    return new Board(this.size, this.grid);
  }

  public clear(): void {
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
  }
}
