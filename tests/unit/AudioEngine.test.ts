import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * AudioEngine Unit Tests
 *
 * Tests audio state management, volume controls, milestone detection,
 * and graceful fallback behavior. Since Web Audio API is not available
 * in JSDOM, we mock AudioContext and test the engine's state logic.
 */

// Mock AudioContext and related Web Audio nodes
function createMockGainNode() {
  return {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockOscillatorNode() {
  return {
    type: 'sine',
    frequency: {
      value: 440,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    detune: {
      value: 0,
      setValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockBiquadFilter() {
  return {
    type: 'lowpass',
    frequency: {
      value: 350,
      setValueAtTime: vi.fn(),
    },
    Q: {
      value: 1,
      setValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockAudioContext() {
  return {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: {},
    createGain: vi.fn(() => createMockGainNode()),
    createOscillator: vi.fn(() => createMockOscillatorNode()),
    createBiquadFilter: vi.fn(() => createMockBiquadFilter()),
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
  };
}

// Set up mock Playables environment
function setupMockPlayables() {
  const mockSDK = {
    IN_PLAYABLES_ENV: false,
    game: {
      firstFrameReady: vi.fn(),
      gameReady: vi.fn(),
      saveData: vi.fn().mockResolvedValue(undefined),
      loadData: vi.fn().mockResolvedValue(''),
    },
    system: {
      isAudioEnabled: vi.fn(() => true),
      onAudioEnabledChange: vi.fn(),
      onPause: vi.fn(),
      onResume: vi.fn(),
      getLanguage: vi.fn().mockResolvedValue('en'),
    },
    engagement: {
      sendScore: vi.fn().mockResolvedValue(undefined),
    },
  };
  const win = (typeof window !== 'undefined' ? window : {}) as Record<string, unknown>;
  win.ytgame = mockSDK;
  return mockSDK;
}

describe('AudioEngine', () => {
  let AudioEngine: typeof import('../../src/audio/AudioEngine').AudioEngine;
  let mockAudioCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(async () => {
    // Reset singleton for each test
    vi.resetModules();

    // Mock AudioContext globally — must be a proper constructor (not arrow fn)
    mockAudioCtx = createMockAudioContext();
    const MockAudioContextCtor = vi.fn(function(this: ReturnType<typeof createMockAudioContext>) {
      Object.assign(this, mockAudioCtx);
      return this;
    });
    (globalThis as Record<string, unknown>).AudioContext = MockAudioContextCtor;

    // Mock PlayablesBridge
    setupMockPlayables();

    // Dynamic import to get fresh singleton
    const mod = await import('../../src/audio/AudioEngine');
    AudioEngine = mod.AudioEngine;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('State Management', () => {
    it('should default to SFX and music enabled', () => {
      const engine = AudioEngine.getInstance();
      expect(engine.isSfxEnabled()).toBe(true);
      expect(engine.isMusicEnabled()).toBe(true);
    });

    it('should toggle SFX enabled independently', () => {
      const engine = AudioEngine.getInstance();
      engine.setSfxEnabled(false);
      expect(engine.isSfxEnabled()).toBe(false);
      expect(engine.isMusicEnabled()).toBe(true);
    });

    it('should toggle music enabled independently', () => {
      const engine = AudioEngine.getInstance();
      engine.setMusicEnabled(false);
      expect(engine.isMusicEnabled()).toBe(false);
      expect(engine.isSfxEnabled()).toBe(true);
    });

    it('should report isAudioAllowed based on both user and platform state', () => {
      const engine = AudioEngine.getInstance();
      expect(engine.isAudioAllowed()).toBe(true);

      engine.setSfxEnabled(false);
      engine.setMusicEnabled(false);
      expect(engine.isAudioAllowed()).toBe(false);
    });

    it('should maintain backward compatibility with setSoundEnabled', () => {
      const engine = AudioEngine.getInstance();
      engine.setSoundEnabled(false);
      expect(engine.isSoundEnabled()).toBe(false);
      expect(engine.isSfxEnabled()).toBe(false);
    });
  });

  describe('Milestone Detection', () => {
    it('should detect first milestone at 500', () => {
      const engine = AudioEngine.getInstance();
      expect(engine.shouldPlayMilestone(500)).toBe(true);
      expect(engine.shouldPlayMilestone(499)).toBe(false);
    });

    it('should not retrigger same milestone', () => {
      const engine = AudioEngine.getInstance();
      // Unlock audio context first for playMilestone
      engine.unlockAudio();
      expect(engine.shouldPlayMilestone(500)).toBe(true);
      engine.playMilestone(500);
      expect(engine.shouldPlayMilestone(500)).toBe(false);
    });

    it('should detect progressively higher milestones', () => {
      const engine = AudioEngine.getInstance();
      engine.unlockAudio();

      expect(engine.shouldPlayMilestone(500)).toBe(true);
      engine.playMilestone(500);

      expect(engine.shouldPlayMilestone(600)).toBe(false); // Between milestones
      expect(engine.shouldPlayMilestone(1000)).toBe(true);
      engine.playMilestone(1000);

      expect(engine.shouldPlayMilestone(2500)).toBe(true);
    });

    it('should reset milestones on resetMilestones()', () => {
      const engine = AudioEngine.getInstance();
      engine.unlockAudio();

      engine.playMilestone(500);
      expect(engine.shouldPlayMilestone(500)).toBe(false);

      engine.resetMilestones();
      expect(engine.shouldPlayMilestone(500)).toBe(true);
    });
  });

  describe('Graceful Degradation', () => {
    it('should not throw when playMove is called without context', () => {
      const engine = AudioEngine.getInstance();
      // Don't call unlockAudio — ctx is null
      expect(() => engine.playMove()).not.toThrow();
    });

    it('should not throw when playMerge is called without context', () => {
      const engine = AudioEngine.getInstance();
      expect(() => engine.playMerge(4)).not.toThrow();
    });

    it('should not throw when playMergeCombo is called without context', () => {
      const engine = AudioEngine.getInstance();
      expect(() => engine.playMergeCombo(16, 3)).not.toThrow();
    });

    it('should not throw when playWin is called without context', () => {
      const engine = AudioEngine.getInstance();
      expect(() => engine.playWin()).not.toThrow();
    });

    it('should not throw when playGameOver is called without context', () => {
      const engine = AudioEngine.getInstance();
      expect(() => engine.playGameOver()).not.toThrow();
    });

    it('should not throw when playNewGame is called without context', () => {
      const engine = AudioEngine.getInstance();
      expect(() => engine.playNewGame()).not.toThrow();
    });

    it('should not throw when playUndo is called without context', () => {
      const engine = AudioEngine.getInstance();
      expect(() => engine.playUndo()).not.toThrow();
    });

    it('should not throw when playButtonClick is called without context', () => {
      const engine = AudioEngine.getInstance();
      expect(() => engine.playButtonClick()).not.toThrow();
    });

    it('should not throw when playMilestone is called without context', () => {
      const engine = AudioEngine.getInstance();
      expect(() => engine.playMilestone(500)).not.toThrow();
    });
  });

  describe('Audio Unlock', () => {
    it('should create AudioContext on unlockAudio()', () => {
      const engine = AudioEngine.getInstance();
      engine.unlockAudio();
      expect(globalThis.AudioContext).toHaveBeenCalled();
    });

    it('should not create duplicate context on second unlock call', () => {
      const engine = AudioEngine.getInstance();
      engine.unlockAudio();
      engine.unlockAudio();
      // AudioContext constructor should only be called once
      expect(globalThis.AudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Combo Merge', () => {
    it('should delegate to playMerge for comboCount of 1', () => {
      const engine = AudioEngine.getInstance();
      engine.unlockAudio();
      // comboCount 1 delegates to playMerge — should not throw
      expect(() => engine.playMergeCombo(4, 1)).not.toThrow();
    });

    it('should play enhanced sound for comboCount > 1', () => {
      const engine = AudioEngine.getInstance();
      engine.unlockAudio();
      expect(() => engine.playMergeCombo(8, 2)).not.toThrow();
    });

    it('should play cascade for comboCount > 3', () => {
      const engine = AudioEngine.getInstance();
      engine.unlockAudio();
      expect(() => engine.playMergeCombo(16, 4)).not.toThrow();
    });
  });
});
