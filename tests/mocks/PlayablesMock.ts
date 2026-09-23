import { YtGameSDK } from '../../src/platform/PlayablesBridge';

export class MockPlayablesSDK implements YtGameSDK {
  public IN_PLAYABLES_ENV: boolean = true;
  public SDK_VERSION: string = '1.0.0-test';

  public firstFrameReadyCalled: boolean = false;
  public gameReadyCalled: boolean = false;
  public cloudStorage: string = '';
  public lastReportedScore: number | null = null;
  public isAudioActive: boolean = true;
  public language: string = 'en-US';

  public pauseListeners: Array<() => void> = [];
  public resumeListeners: Array<() => void> = [];
  public audioListeners: Array<(enabled: boolean) => void> = [];

  public game = {
    firstFrameReady: () => {
      this.firstFrameReadyCalled = true;
    },
    gameReady: () => {
      this.gameReadyCalled = true;
    },
    saveData: async (data: string) => {
      this.cloudStorage = data;
    },
    loadData: async () => {
      return this.cloudStorage;
    },
  };

  public system = {
    isAudioEnabled: () => {
      return this.isAudioActive;
    },
    onAudioEnabledChange: (cb: (enabled: boolean) => void) => {
      this.audioListeners.push(cb);
    },
    onPause: (cb: () => void) => {
      this.pauseListeners.push(cb);
    },
    onResume: (cb: () => void) => {
      this.resumeListeners.push(cb);
    },
    getLanguage: async () => {
      return this.language;
    },
  };

  public engagement = {
    sendScore: async (score: { value: number }) => {
      this.lastReportedScore = score.value;
    },
  };

  public simulatePause(): void {
    this.pauseListeners.forEach((cb) => cb());
  }

  public simulateResume(): void {
    this.resumeListeners.forEach((cb) => cb());
  }

  public simulateAudioChange(enabled: boolean): void {
    this.isAudioActive = enabled;
    this.audioListeners.forEach((cb) => cb(enabled));
  }
}
