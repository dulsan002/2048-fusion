/**
 * Types according to the official Google for Developers: YouTube Playables SDK specification.
 */
export interface YtGameSDK {
  IN_PLAYABLES_ENV: boolean;
  SDK_VERSION?: string;
  game: {
    firstFrameReady: () => void;
    gameReady: () => void;
    saveData: (data: string) => Promise<void>;
    loadData: () => Promise<string>;
  };
  system: {
    isAudioEnabled: () => boolean;
    onAudioEnabledChange: (callback: (enabled: boolean) => void) => void;
    onPause: (callback: () => void) => void;
    onResume: (callback: () => void) => void;
    getLanguage: () => Promise<string>;
  };
  engagement: {
    sendScore: (score: { value: number }) => Promise<void>;
  };
}

declare global {
  interface Window {
    ytgame?: YtGameSDK;
  }
}

export class PlayablesBridge {
  private static instance: PlayablesBridge;
  private sdk: YtGameSDK | null = null;
  private isPlayablesEnv: boolean = false;
  private isFirstFrameSent: boolean = false;
  private isGameReadySent: boolean = false;

  private pauseCallbacks: Array<() => void> = [];
  private resumeCallbacks: Array<() => void> = [];
  private audioCallbacks: Array<(enabled: boolean) => void> = [];

  private constructor() {
    this.init();
  }

  public static getInstance(): PlayablesBridge {
    if (!PlayablesBridge.instance) {
      PlayablesBridge.instance = new PlayablesBridge();
    }
    return PlayablesBridge.instance;
  }

  private init(): void {
    if (typeof window !== 'undefined' && window.ytgame) {
      this.sdk = window.ytgame;
      this.isPlayablesEnv = !!this.sdk.IN_PLAYABLES_ENV;
      console.log(
        `[PlayablesBridge] YouTube Playables SDK detected. Active Playables environment: ${this.isPlayablesEnv}`
      );

      // Register system lifecycle hooks with the SDK
      try {
        this.sdk.system.onPause(() => {
          console.log('[PlayablesBridge] SDK onPause triggered');
          this.triggerPause();
        });

        this.sdk.system.onResume(() => {
          console.log('[PlayablesBridge] SDK onResume triggered');
          this.triggerResume();
        });

        this.sdk.system.onAudioEnabledChange((enabled: boolean) => {
          console.log(`[PlayablesBridge] SDK onAudioEnabledChange: ${enabled}`);
          this.triggerAudioChange(enabled);
        });
      } catch (err) {
        console.warn('[PlayablesBridge] Error registering SDK system callbacks:', err);
      }
    } else {
      console.log(
        '[PlayablesBridge] YouTube Playables SDK not found or in standalone web mode. Using standalone adapter.'
      );
      this.isPlayablesEnv = false;

      // In standalone web mode, bind to standard browser Page Visibility API
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.triggerPause();
          } else {
            this.triggerResume();
          }
        });
      }
    }
  }

  public isInPlayablesEnv(): boolean {
    return this.isPlayablesEnv;
  }

  public sendFirstFrameReady(): void {
    if (this.isFirstFrameSent) return;
    this.isFirstFrameSent = true;
    if (this.sdk && typeof this.sdk.game?.firstFrameReady === 'function') {
      try {
        this.sdk.game.firstFrameReady();
        console.log('[PlayablesBridge] firstFrameReady() sent to YouTube platform.');
      } catch (e) {
        console.warn('[PlayablesBridge] Failed to signal firstFrameReady:', e);
      }
    }
  }

  public sendGameReady(): void {
    if (this.isGameReadySent) return;
    this.isGameReadySent = true;
    if (this.sdk && typeof this.sdk.game?.gameReady === 'function') {
      try {
        this.sdk.game.gameReady();
        console.log('[PlayablesBridge] gameReady() sent to YouTube platform.');
      } catch (e) {
        console.warn('[PlayablesBridge] Failed to signal gameReady:', e);
      }
    }
  }

  public onPause(callback: () => void): void {
    this.pauseCallbacks.push(callback);
  }

  public onResume(callback: () => void): void {
    this.resumeCallbacks.push(callback);
  }

  public onAudioEnabledChange(callback: (enabled: boolean) => void): void {
    this.audioCallbacks.push(callback);
  }

  private triggerPause(): void {
    for (const cb of this.pauseCallbacks) {
      try {
        cb();
      } catch (err) {
        console.error('[PlayablesBridge] Error in pause callback:', err);
      }
    }
  }

  private triggerResume(): void {
    for (const cb of this.resumeCallbacks) {
      try {
        cb();
      } catch (err) {
        console.error('[PlayablesBridge] Error in resume callback:', err);
      }
    }
  }

  private triggerAudioChange(enabled: boolean): void {
    for (const cb of this.audioCallbacks) {
      try {
        cb(enabled);
      } catch (err) {
        console.error('[PlayablesBridge] Error in audio callback:', err);
      }
    }
  }

  public isAudioEnabled(): boolean {
    if (this.sdk && typeof this.sdk.system?.isAudioEnabled === 'function') {
      try {
        return this.sdk.system.isAudioEnabled();
      } catch (e) {
        console.warn('[PlayablesBridge] Error checking isAudioEnabled:', e);
      }
    }
    return true; // Default to enabled in standard browsers
  }

  public async sendScore(score: number): Promise<void> {
    if (this.sdk && typeof this.sdk.engagement?.sendScore === 'function') {
      try {
        await this.sdk.engagement.sendScore({ value: score });
        console.log(`[PlayablesBridge] sendScore(${score}) succeeded.`);
      } catch (err) {
        console.warn('[PlayablesBridge] sendScore failed:', err);
      }
    }
  }

  public async getLanguage(): Promise<string> {
    if (this.sdk && typeof this.sdk.system?.getLanguage === 'function') {
      try {
        const lang = await this.sdk.system.getLanguage();
        if (lang) return lang;
      } catch (err) {
        console.warn('[PlayablesBridge] getLanguage failed:', err);
      }
    }
    return typeof navigator !== 'undefined' ? navigator.language || 'en' : 'en';
  }

  public getRawSDK(): YtGameSDK | null {
    return this.sdk;
  }
}
