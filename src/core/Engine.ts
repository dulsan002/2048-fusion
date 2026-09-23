import { Board, BOARD_SIZE } from './Board';
import { RandomGenerator } from './Random';
import { Direction, GameHistoryRecord, GameSettings, GameState, GameStats, MoveResult, MoveStep, Position, Tile } from './Types';

export class GameEngine {
  private board: Board;
  private score: number = 0;
  private bestScore: number = 0;
  private isWon: boolean = false;
  private isGameOver: boolean = false;
  private hasContinued: boolean = false;
  private random: RandomGenerator;
  private nextTileId: number = 1;
  private previousSnapshot: { board: Board; score: number } | null = null;
  private settings: GameSettings = {
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 0.8,
    musicVolume: 0.6,
    hapticsEnabled: true,
    highContrast: false,
    reducedMotion: false,
    showHints: false,
    confirmRestart: true,
    musicTrack: 'ambient_flow',
    backgroundTheme: 'cosmic_horizon',
  };

  private movesCount: number = 0;
  private startTime: number = Date.now();
  private gamesPlayed: number = 1;
  private gamesWon: number = 0;
  private history: GameHistoryRecord[] = [];

  constructor(randomGenerator?: RandomGenerator, initialBoard?: Board) {
    this.random = randomGenerator || new RandomGenerator();
    this.board = initialBoard || new Board(BOARD_SIZE);
  }

  public initNewGame(): { tiles: Tile[] } {
    this.board.clear();
    this.score = 0;
    this.isWon = false;
    this.isGameOver = false;
    this.hasContinued = false;
    this.previousSnapshot = null;
    this.nextTileId = 1;
    this.movesCount = 0;
    this.startTime = Date.now();
    this.gamesPlayed++;

    // Standard 2048 rule: start with 2 tiles
    const spawnedTiles: Tile[] = [];
    const t1 = this.spawnTile();
    if (t1) spawnedTiles.push(t1);
    const t2 = this.spawnTile();
    if (t2) spawnedTiles.push(t2);

    return { tiles: spawnedTiles };
  }

  public spawnTile(): Tile | null {
    const emptyCells = this.board.getEmptyCells();
    const cell = this.random.chooseCell(emptyCells);
    if (!cell) return null;

    const value = this.random.spawnValue();
    this.board.set(cell.row, cell.col, value);

    const tile: Tile = {
      id: this.nextTileId++,
      value,
      row: cell.row,
      col: cell.col,
      isNew: true,
    };

    return tile;
  }

  public move(direction: Direction): MoveResult {
    if (this.isGameOver) {
      return {
        moved: false,
        scoreIncrement: 0,
        highestTile: this.board.getMaxTile(),
        steps: [],
        spawnedTile: null,
        isWon: this.isWon,
        isGameOver: true,
      };
    }

    const { moved, scoreIncrement, steps } = this.calculateMove(this.board, direction);

    if (!moved) {
      return {
        moved: false,
        scoreIncrement: 0,
        highestTile: this.board.getMaxTile(),
        steps: [],
        spawnedTile: null,
        isWon: this.isWon,
        isGameOver: !this.board.hasAvailableMoves(),
      };
    }

    // Save snapshot for 1-step undo
    this.previousSnapshot = {
      board: this.board.clone(),
      score: this.score,
    };

    // Apply move steps to current board
    this.applySteps(steps);
    this.movesCount++;

    // Update score
    this.score += scoreIncrement;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }

    // Check 2048 win condition
    const highest = this.board.getMaxTile();
    let justWon = false;
    if (highest >= 2048 && !this.isWon && !this.hasContinued) {
      this.isWon = true;
      justWon = true;
      this.gamesWon++;
    }

    // Spawn new tile in empty cell
    const spawnedTile = this.spawnTile();

    // Check game over
    if (!this.board.hasAvailableMoves()) {
      this.isGameOver = true;
    }

    return {
      moved: true,
      scoreIncrement,
      highestTile: highest,
      steps,
      spawnedTile,
      isWon: justWon,
      isGameOver: this.isGameOver,
    };
  }

  public canMove(direction: Direction): boolean {
    const testBoard = this.board.clone();
    const result = this.calculateMove(testBoard, direction);
    return result.moved;
  }

  public canMoveAny(): boolean {
    return this.board.hasAvailableMoves();
  }

  public continueGame(): void {
    this.hasContinued = true;
  }

  public undo(): boolean {
    if (!this.previousSnapshot) return false;
    this.board = this.previousSnapshot.board.clone();
    this.score = this.previousSnapshot.score;
    this.previousSnapshot = null;
    this.isGameOver = false;
    if (this.movesCount > 0) this.movesCount--;
    return true;
  }

  public canUndo(): boolean {
    return this.previousSnapshot !== null;
  }

  /**
   * Deterministic 1D line move calculation with strict single-merge rule.
   */
  private calculateMove(
    board: Board,
    direction: Direction
  ): { moved: boolean; scoreIncrement: number; steps: MoveStep[] } {
    let moved = false;
    let scoreIncrement = 0;
    const steps: MoveStep[] = [];
    const size = board.size;

    const isHorizontal = direction === 'LEFT' || direction === 'RIGHT';
    const isForward = direction === 'LEFT' || direction === 'UP';

    for (let i = 0; i < size; i++) {
      // Extract line items with original positions
      const lineCells: { pos: Position; value: number }[] = [];
      for (let j = 0; j < size; j++) {
        const row = isHorizontal ? i : j;
        const col = isHorizontal ? j : i;
        const value = board.get(row, col);
        lineCells.push({ pos: { row, col }, value });
      }

      // If moving RIGHT or DOWN, reverse traversal so movement destination is index 0 of working array
      const orderedCells = isForward ? lineCells : [...lineCells].reverse();
      const nonZero = orderedCells.filter(c => c.value !== 0);

      const targetPositions = isForward
        ? orderedCells.map(c => c.pos)
        : [...orderedCells.map(c => c.pos)];

      let targetIndex = 0;
      let k = 0;

      while (k < nonZero.length) {
        const current = nonZero[k];
        const next = k + 1 < nonZero.length ? nonZero[k + 1] : null;
        const targetPos = targetPositions[targetIndex];

        if (next && current.value === next.value) {
          // Merge two tiles into one
          const mergedValue = current.value * 2;
          scoreIncrement += mergedValue;

          steps.push({
            from: current.pos,
            to: targetPos,
            value: current.value,
            mergedWith: next.pos,
            resultingValue: mergedValue,
          });

          steps.push({
            from: next.pos,
            to: targetPos,
            value: next.value,
            mergedWith: current.pos,
            resultingValue: mergedValue,
          });

          if (
            current.pos.row !== targetPos.row ||
            current.pos.col !== targetPos.col ||
            next.pos.row !== targetPos.row ||
            next.pos.col !== targetPos.col
          ) {
            moved = true;
          } else {
            // Even if positions were same (e.g. 2+2 at start of row), a merge constitutes a move!
            moved = true;
          }

          k += 2; // Strict anti-double merge: advances past both merged tiles
          targetIndex++;
        } else {
          // Single tile slide without merge
          steps.push({
            from: current.pos,
            to: targetPos,
            value: current.value,
          });

          if (current.pos.row !== targetPos.row || current.pos.col !== targetPos.col) {
            moved = true;
          }

          k += 1;
          targetIndex++;
        }
      }
    }

    return { moved, scoreIncrement, steps };
  }

  private applySteps(steps: MoveStep[]): void {
    this.board.clear();
    for (const step of steps) {
      const val = step.resultingValue !== undefined ? step.resultingValue : step.value;
      this.board.set(step.to.row, step.to.col, val);
    }
  }

  public getBoard(): Board {
    return this.board;
  }

  public getScore(): number {
    return this.score;
  }

  public getBestScore(): number {
    return this.bestScore;
  }

  public setBestScore(best: number): void {
    this.bestScore = Math.max(this.bestScore, best);
  }

  public isGameWon(): boolean {
    return this.isWon;
  }

  public isGameEnded(): boolean {
    return this.isGameOver;
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getMovesCount(): number {
    return this.movesCount;
  }

  public getElapsedTime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  public getMaxTile(): number {
    return this.board.getMaxTile();
  }

  public getStats(): GameStats {
    return {
      bestScore: this.bestScore,
      gamesPlayed: this.gamesPlayed,
      gamesWon: this.gamesWon,
      highestTile: this.board.getMaxTile(),
      totalScore: this.bestScore,
      movesCount: this.movesCount,
      startTime: this.startTime,
      elapsedSeconds: this.getElapsedTime(),
    };
  }

  public getBestHintDirection(): Direction | null {
    const directions: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
    let bestDirection: Direction | null = null;
    let maxGain = -1;

    for (const dir of directions) {
      const clone = this.board.clone();
      const sim = this.calculateMove(clone, dir);
      if (sim.moved) {
        if (sim.scoreIncrement > maxGain) {
          maxGain = sim.scoreIncrement;
          bestDirection = dir;
        }
      }
    }

    return bestDirection;
  }

  public recordGameEnd(won: boolean): void {
    if (this.score === 0) return;
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const record: GameHistoryRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      score: this.score,
      highestTile: this.board.getMaxTile(),
      moves: this.movesCount,
      date: dateStr,
      won,
    };
    this.history.unshift(record);
    if (this.history.length > 10) {
      this.history.pop();
    }
    if (won) {
      this.gamesWon++;
    }
  }

  public getHistory(): GameHistoryRecord[] {
    return [...this.history];
  }

  public getState(): GameState {
    return {
      version: 1,
      grid: this.board.toMatrix(),
      score: this.score,
      bestScore: this.bestScore,
      isWon: this.isWon,
      isGameOver: this.isGameOver,
      hasContinued: this.hasContinued,
      settings: { ...this.settings },
      stats: this.getStats(),
      history: [...this.history],
      timestamp: Date.now(),
    };
  }

  public restoreState(state: GameState): boolean {
    if (!state || !state.grid || state.grid.length !== BOARD_SIZE) {
      return false;
    }
    this.board = new Board(BOARD_SIZE, state.grid);
    this.score = Math.max(0, state.score || 0);
    this.bestScore = Math.max(this.score, state.bestScore || 0);
    this.isWon = !!state.isWon;
    this.isGameOver = !!state.isGameOver || !this.board.hasAvailableMoves();
    this.hasContinued = !!state.hasContinued;
    if (state.settings) {
      this.settings = { ...this.settings, ...state.settings };
    }
    if (state.stats) {
      if (typeof state.stats.gamesPlayed === 'number') this.gamesPlayed = state.stats.gamesPlayed;
      if (typeof state.stats.gamesWon === 'number') this.gamesWon = state.stats.gamesWon;
      if (typeof state.stats.movesCount === 'number') this.movesCount = state.stats.movesCount;
      if (typeof state.stats.startTime === 'number') this.startTime = state.stats.startTime;
    }
    if (Array.isArray(state.history)) {
      this.history = [...state.history];
    }
    this.previousSnapshot = null;
    return true;
  }
}
