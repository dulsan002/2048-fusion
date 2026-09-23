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

export type MusicTrackId = 'ambient_flow' | 'cyber_pulse' | 'starlight_zen' | 'deep_focus';
export type BackgroundThemeId = 'cosmic_horizon' | 'nebula_dream' | 'midnight_aurora' | 'deep_void';

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  musicVolume: number; // 0.0 to 1.0
  hapticsEnabled: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  showHints: boolean;
  confirmRestart: boolean;
  musicTrack?: MusicTrackId;
  backgroundTheme?: BackgroundThemeId;
}

export interface GameStats {
  bestScore: number;
  gamesPlayed: number;
  gamesWon: number;
  highestTile: number;
  totalScore: number;
  movesCount: number;
  startTime: number;
  elapsedSeconds: number;
}

export interface GameHistoryRecord {
  id: string;
  score: number;
  highestTile: number;
  moves: number;
  date: string;
  won: boolean;
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
  stats?: Partial<GameStats>;
  history?: GameHistoryRecord[];
  timestamp: number;
}

