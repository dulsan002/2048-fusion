import { GameState } from '../core/Types';
import { PlayablesBridge } from './PlayablesBridge';

const STORAGE_KEY = '2048_fusion_game_state';

export class StorageAdapter {
  private static instance: StorageAdapter;
  private bridge: PlayablesBridge;
  private hasLoadedOnce: boolean = false;
  private pendingSaveTimeout: number | null = null;
  private lastSavedPayload: string | null = null;

  private constructor() {
    this.bridge = PlayablesBridge.getInstance();
  }

  public static getInstance(): StorageAdapter {
    if (!StorageAdapter.instance) {
      StorageAdapter.instance = new StorageAdapter();
    }
    return StorageAdapter.instance;
  }

  /**
   * Loads saved game state.
   * Required by YouTube Playables: Must be called and resolved before saveData is allowed.
   */
  public async loadState(): Promise<GameState | null> {
    try {
      let rawData: string | null = null;

      if (this.bridge.isInPlayablesEnv()) {
        const rawSdk = this.bridge.getRawSDK();
        if (rawSdk && typeof rawSdk.game?.loadData === 'function') {
          console.log('[StorageAdapter] Loading data from YouTube Playables cloud save...');
          rawData = await rawSdk.game.loadData();
        }
      }

      // Fallback to localStorage if not in Playables or Playables returned null/empty
      if (!rawData && typeof window !== 'undefined' && window.localStorage) {
        rawData = window.localStorage.getItem(STORAGE_KEY);
      }

      this.hasLoadedOnce = true;

      if (!rawData) {
        console.log('[StorageAdapter] No existing save data found. Starting fresh.');
        return null;
      }

      const parsed = JSON.parse(rawData);
      if (this.validateState(parsed)) {
        console.log('[StorageAdapter] Game state loaded successfully.');
        this.lastSavedPayload = rawData;
        return parsed as GameState;
      } else {
        console.warn('[StorageAdapter] Saved state failed validation. Discarding invalid save.');
        return null;
      }
    } catch (err) {
      console.warn('[StorageAdapter] Error loading saved state (corrupt data):', err);
      this.hasLoadedOnce = true;
      return null;
    }
  }

  /**
   * Saves game state with debouncing.
   * Playables Rule: Games must await loadData() before calling saveData().
   */
  public async saveState(state: GameState, debounceMs: number = 300): Promise<void> {
    if (!this.hasLoadedOnce) {
      console.warn('[StorageAdapter] Cannot call saveState before loadState has completed.');
      return;
    }

    if (this.pendingSaveTimeout !== null) {
      clearTimeout(this.pendingSaveTimeout);
    }

    return new Promise((resolve) => {
      this.pendingSaveTimeout = window.setTimeout(async () => {
        await this.executeSave(state);
        this.pendingSaveTimeout = null;
        resolve();
      }, debounceMs);
    });
  }

  private async executeSave(state: GameState): Promise<void> {
    try {
      const serialized = JSON.stringify(state);
      if (serialized === this.lastSavedPayload) {
        return; // No change
      }

      this.lastSavedPayload = serialized;

      if (this.bridge.isInPlayablesEnv()) {
        const rawSdk = this.bridge.getRawSDK();
        if (rawSdk && typeof rawSdk.game?.saveData === 'function') {
          await rawSdk.game.saveData(serialized);
          console.log('[StorageAdapter] State saved to YouTube Playables cloud.');
        }
      }

      // Always save to localStorage as backup / standalone cache
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, serialized);
      }
    } catch (err) {
      console.warn('[StorageAdapter] Failed to save game state:', err);
    }
  }

  public async clearState(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      if (this.bridge.isInPlayablesEnv()) {
        const rawSdk = this.bridge.getRawSDK();
        if (rawSdk && typeof rawSdk.game?.saveData === 'function') {
          await rawSdk.game.saveData('');
        }
      }
      this.lastSavedPayload = null;
      console.log('[StorageAdapter] Saved game state cleared.');
    } catch (err) {
      console.warn('[StorageAdapter] Error clearing state:', err);
    }
  }

  /**
   * Validates schema integrity of loaded data.
   */
  public validateState(data: unknown): data is GameState {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Partial<GameState>;

    if (typeof obj.version !== 'number') return false;
    if (typeof obj.score !== 'number' || obj.score < 0) return false;
    if (typeof obj.bestScore !== 'number' || obj.bestScore < 0) return false;
    if (!Array.isArray(obj.grid) || obj.grid.length !== 4) return false;

    for (const row of obj.grid) {
      if (!Array.isArray(row) || row.length !== 4) return false;
      for (const cell of row) {
        if (typeof cell !== 'number' || cell < 0) return false;
      }
    }

    return true;
  }
}
