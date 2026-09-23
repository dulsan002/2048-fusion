import { beforeEach, describe, expect, it } from 'vitest';
import { PlayablesBridge } from '../../src/platform/PlayablesBridge';
import { MockPlayablesSDK } from '../mocks/PlayablesMock';

describe('YouTube Playables Integration Tests', () => {
  let mockSdk: MockPlayablesSDK;

  beforeEach(() => {
    mockSdk = new MockPlayablesSDK();
    (window as unknown as { ytgame: MockPlayablesSDK }).ytgame = mockSdk;
  });

  it('correctly detects active YouTube Playables environment', () => {
    // Reset singleton instance to re-initialize with mock SDK
    // @ts-expect-error accessing private instance for testing
    PlayablesBridge.instance = undefined;

    const bridge = PlayablesBridge.getInstance();
    expect(bridge.isInPlayablesEnv()).toBe(true);
  });

  it('transmits firstFrameReady and gameReady signals to the SDK', () => {
    // @ts-expect-error resetting singleton
    PlayablesBridge.instance = undefined;
    const bridge = PlayablesBridge.getInstance();

    expect(mockSdk.firstFrameReadyCalled).toBe(false);
    bridge.sendFirstFrameReady();
    expect(mockSdk.firstFrameReadyCalled).toBe(true);

    expect(mockSdk.gameReadyCalled).toBe(false);
    bridge.sendGameReady();
    expect(mockSdk.gameReadyCalled).toBe(true);
  });

  it('synchronizes pause and resume contracts with platform', () => {
    // @ts-expect-error resetting singleton
    PlayablesBridge.instance = undefined;
    const bridge = PlayablesBridge.getInstance();

    let pauseTriggered = false;
    let resumeTriggered = false;

    bridge.onPause(() => {
      pauseTriggered = true;
    });

    bridge.onResume(() => {
      resumeTriggered = true;
    });

    mockSdk.simulatePause();
    expect(pauseTriggered).toBe(true);

    mockSdk.simulateResume();
    expect(resumeTriggered).toBe(true);
  });

  it('synchronizes real-time audio mute changes from platform', () => {
    // @ts-expect-error resetting singleton
    PlayablesBridge.instance = undefined;
    const bridge = PlayablesBridge.getInstance();

    let observedAudioState = true;
    bridge.onAudioEnabledChange((enabled) => {
      observedAudioState = enabled;
    });

    mockSdk.simulateAudioChange(false);
    expect(observedAudioState).toBe(false);
    expect(bridge.isAudioEnabled()).toBe(false);

    mockSdk.simulateAudioChange(true);
    expect(observedAudioState).toBe(true);
    expect(bridge.isAudioEnabled()).toBe(true);
  });

  it('reports high scores via engagement sendScore API', async () => {
    // @ts-expect-error resetting singleton
    PlayablesBridge.instance = undefined;
    const bridge = PlayablesBridge.getInstance();

    await bridge.sendScore(2048);
    expect(mockSdk.lastReportedScore).toBe(2048);
  });
});
