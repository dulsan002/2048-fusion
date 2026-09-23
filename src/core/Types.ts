export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  row: number;
  col: number;
}

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  previousPosition?: Position;
  mergedFrom?: Tile[];
  isNew?: boolean;
}

export interface MoveStep {
  from: Position;
  to: Position;
  value: number;
  mergedWith?: Position;
  resultingValue?: number;
}

export interface MoveResult {
  moved: boolean;
  scoreIncrement: number;
  highestTile: number;
  steps: MoveStep[];
  spawnedTile: Tile | null;
  isWon: boolean;
  isGameOver: boolean;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface GameState {
  version: number;
  grid: number[][]; // 4x4 matrix
  score: number;
  bestScore: number;
  isWon: boolean;
  isGameOver: boolean;
  hasContinued: boolean;
  settings: GameSettings;
  timestamp: number;
}
