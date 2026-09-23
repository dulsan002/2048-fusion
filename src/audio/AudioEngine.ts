import { PlayablesBridge } from '../platform/PlayablesBridge';

/**
 * AudioEngine — Procedural audio synthesis for 2048 Fusion.
 *
 * All sounds are generated in real-time using Web Audio API oscillators.
 * Zero external audio files. Zero licensing risk.
 *
 * Features:
 *  - Ambient generative music (pentatonic pad with LFO modulation)
 *  - Enhanced merge SFX with harmonic layering
 *  - Combo/streak merge escalation
 *  - Score milestone fanfares
 *  - Dedicated undo sound
 *  - Independent music/SFX volume controls
 *  - YouTube Playables platform mute/pause compliance
 *  - Smooth first-unlock fade-in
 */
export class AudioEngine {
  private static instance: AudioEngine;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private bridge: PlayablesBridge;

  // User preferences (persisted)
  private userSfxEnabled: boolean = true;
  private userMusicEnabled: boolean = true;

  // Platform override
  private platformAudioEnabled: boolean = true;

  // Ambient music state
  private ambientOscillators: OscillatorNode[] = [];
  private ambientGainNodes: GainNode[] = [];
  private ambientFilter: BiquadFilterNode | null = null;
  private ambientLfo: OscillatorNode | null = null;
  private ambientLfoGain: GainNode | null = null;
  private ambientChordIndex: number = 0;
  private ambientTimerId: ReturnType<typeof setTimeout> | null = null;
  private isAmbientPlaying: boolean = false;

  // Milestone tracking
  private lastMilestoneTriggered: number = 0;
  private static readonly MILESTONES = [500, 1000, 2500, 5000, 10000, 25000, 50000];

  // Pentatonic scale chord progressions for ambient pad (Hz values)
  // Using C pentatonic: C, D, E, G, A across octaves 3-4
  private static readonly AMBIENT_CHORDS: number[][] = [
    [130.81, 164.81, 196.00],  // C3, E3, G3  — C major triad
    [146.83, 196.00, 220.00],  // D3, G3, A3  — Dsus4
    [164.81, 196.00, 261.63],  // E3, G3, C4  — Em/C
    [196.00, 261.63, 329.63],  // G3, C4, E4  — C major (1st inv)
    [220.00, 261.63, 329.63],  // A3, C4, E4  — Am
    [196.00, 246.94, 329.63],  // G3, B3, E4  — Em (1st inv)
    [130.81, 196.00, 261.63],  // C3, G3, C4  — C5 (power)
  ];

  private constructor() {
    this.bridge = PlayablesBridge.getInstance();
    this.platformAudioEnabled = this.bridge.isAudioEnabled();

    // Listen to platform mute changes from YouTube Playables
    this.bridge.onAudioEnabledChange((enabled: boolean) => {
      this.platformAudioEnabled = enabled;
      this.updateAllGains();
      if (!enabled) {
        this.suspendAmbient();
      } else if (this.userMusicEnabled && this.isAmbientPlaying) {
        this.resumeAmbient();
      }
    });

    // Pause audio when platform requests pause
    this.bridge.onPause(() => {
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    });

    this.bridge.onResume(() => {
      if (this.ctx && this.ctx.state === 'suspended' && this.isAudioAllowed()) {
        this.ctx.resume().catch(() => {});
      }
    });

    this.setupUnlockListeners();
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private setupUnlockListeners(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  /**
   * Initialize AudioContext on first user gesture.
   * Uses smooth fade-in to prevent audio pop.
   */
  public unlockAudio(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Master gain → destination
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        // SFX submix → master
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);

        // Music submix → master
        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.masterGain);

        // Smooth fade-in from silence (prevent jarring start)
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(
          this.isAudioAllowed() ? 0.35 : 0,
          this.ctx.currentTime + 0.5
        );

        this.updateAllGains();

        // Auto-start ambient music if user hasn't disabled it
        if (this.userMusicEnabled) {
          this.startAmbientMusic();
        }
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // --- Volume Control ---

  public setSfxEnabled(enabled: boolean): void {
    this.userSfxEnabled = enabled;
    this.updateSfxGain();
  }

  public setMusicEnabled(enabled: boolean): void {
    this.userMusicEnabled = enabled;
    this.updateMusicGain();

    if (enabled && !this.isAmbientPlaying && this.ctx) {
      this.startAmbientMusic();
    } else if (!enabled && this.isAmbientPlaying) {
      this.stopAmbientMusic();
    }
  }

  /** @deprecated Use setSfxEnabled instead. Kept for backward compatibility. */
  public setSoundEnabled(enabled: boolean): void {
    this.setSfxEnabled(enabled);
  }

  public isSfxEnabled(): boolean {
    return this.userSfxEnabled;
  }

  public isMusicEnabled(): boolean {
    return this.userMusicEnabled;
  }

  /** @deprecated Use isSfxEnabled instead. */
  public isSoundEnabled(): boolean {
    return this.userSfxEnabled;
  }

  public isAudioAllowed(): boolean {
    return (this.userSfxEnabled || this.userMusicEnabled) && this.platformAudioEnabled;
  }

  private isSfxAllowed(): boolean {
    return this.userSfxEnabled && this.platformAudioEnabled;
  }

  private isMusicAllowed(): boolean {
    return this.userMusicEnabled && this.platformAudioEnabled;
  }

  private updateAllGains(): void {
    this.updateMasterGain();
    this.updateSfxGain();
    this.updateMusicGain();
  }

  private updateMasterGain(): void {
    if (!this.masterGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const target = this.platformAudioEnabled ? 0.35 : 0;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(target, now + 0.05);
  }

  private updateSfxGain(): void {
    if (!this.sfxGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const target = this.isSfxAllowed() ? 1.0 : 0;
    this.sfxGain.gain.setValueAtTime(this.sfxGain.gain.value, now);
    this.sfxGain.gain.linearRampToValueAtTime(target, now + 0.05);
  }

  private updateMusicGain(): void {
    if (!this.musicGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Music is quieter — sits underneath SFX
    const target = this.isMusicAllowed() ? 0.4 : 0;
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(target, now + 0.3);
  }

  // --- Ambient Generative Music ---

  /**
   * Start ambient pad music — pentatonic chord progression with gentle LFO.
   * Creates 3 detuned oscillators forming a warm, evolving pad texture.
   */
  public startAmbientMusic(): void {
    if (!this.ctx || !this.musicGain || this.isAmbientPlaying) return;

    try {
      this.isAmbientPlaying = true;

      // Low-pass filter for warmth
      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(900, this.ctx.currentTime);
      this.ambientFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);
      this.ambientFilter.connect(this.musicGain);

      // LFO for gentle filter modulation (breathing effect)
      this.ambientLfo = this.ctx.createOscillator();
      this.ambientLfoGain = this.ctx.createGain();
      this.ambientLfo.type = 'sine';
      this.ambientLfo.frequency.setValueAtTime(0.15, this.ctx.currentTime); // Very slow LFO
      this.ambientLfoGain.gain.setValueAtTime(200, this.ctx.currentTime); // Modulation depth
      this.ambientLfo.connect(this.ambientLfoGain);
      this.ambientLfoGain.connect(this.ambientFilter.frequency);
      this.ambientLfo.start();

      // Start first chord
      this.playAmbientChord();

      // Schedule chord transitions
      this.scheduleNextChord();
    } catch {
      this.isAmbientPlaying = false;
    }
  }

  private playAmbientChord(): void {
    if (!this.ctx || !this.ambientFilter) return;

    const now = this.ctx.currentTime;
    const chord = AudioEngine.AMBIENT_CHORDS[this.ambientChordIndex % AudioEngine.AMBIENT_CHORDS.length];

    // Fade out existing oscillators
    for (const gain of this.ambientGainNodes) {
      try {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 2.0);
      } catch { /* ignore */ }
    }

    // Schedule cleanup of old oscillators
    const oldOscs = [...this.ambientOscillators];
    const oldGains = [...this.ambientGainNodes];
    setTimeout(() => {
      for (const osc of oldOscs) {
        try { osc.stop(); osc.disconnect(); } catch { /* ignore */ }
      }
      for (const gain of oldGains) {
        try { gain.disconnect(); } catch { /* ignore */ }
      }
    }, 2500);

    this.ambientOscillators = [];
    this.ambientGainNodes = [];

    // Create 3 oscillators for the chord with slight detuning for richness
    for (let i = 0; i < chord.length; i++) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Alternate between sine and triangle for textural depth
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(chord[i], now);

        // Slight random detuning (±5 cents) for analog warmth
        osc.detune.setValueAtTime((Math.random() - 0.5) * 10, now);

        // Fade in smoothly
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 2.0);

        osc.connect(gain);
        gain.connect(this.ambientFilter!);

        osc.start(now);

        this.ambientOscillators.push(osc);
        this.ambientGainNodes.push(gain);
      } catch { /* ignore individual oscillator failures */ }
    }

    this.ambientChordIndex++;
  }

  private scheduleNextChord(): void {
    if (!this.isAmbientPlaying) return;

    // Chord changes every 8-12 seconds (randomized for organic feel)
    const interval = 8000 + Math.random() * 4000;
    this.ambientTimerId = setTimeout(() => {
      if (this.isAmbientPlaying && this.isMusicAllowed()) {
        this.playAmbientChord();
        this.scheduleNextChord();
      }
    }, interval);
  }

  public stopAmbientMusic(): void {
    this.isAmbientPlaying = false;

    if (this.ambientTimerId) {
      clearTimeout(this.ambientTimerId);
      this.ambientTimerId = null;
    }

    if (this.ctx) {
      const now = this.ctx.currentTime;

      // Fade out all ambient oscillators
      for (const gain of this.ambientGainNodes) {
        try {
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0, now + 1.0);
        } catch { /* ignore */ }
      }

      // Stop and disconnect after fade
      setTimeout(() => {
        for (const osc of this.ambientOscillators) {
          try { osc.stop(); osc.disconnect(); } catch { /* ignore */ }
        }
        for (const gain of this.ambientGainNodes) {
          try { gain.disconnect(); } catch { /* ignore */ }
        }
        this.ambientOscillators = [];
        this.ambientGainNodes = [];

        try { this.ambientLfo?.stop(); this.ambientLfo?.disconnect(); } catch { /* ignore */ }
        try { this.ambientLfoGain?.disconnect(); } catch { /* ignore */ }
        try { this.ambientFilter?.disconnect(); } catch { /* ignore */ }
        this.ambientLfo = null;
        this.ambientLfoGain = null;
        this.ambientFilter = null;
      }, 1200);
    }
  }

  private suspendAmbient(): void {
    // Mute but don't destroy (for quick resume)
    if (this.ambientTimerId) {
      clearTimeout(this.ambientTimerId);
      this.ambientTimerId = null;
    }
  }

  private resumeAmbient(): void {
    if (this.isAmbientPlaying && !this.ambientTimerId) {
      this.scheduleNextChord();
    }
  }

  // --- Sound Effects ---

  /**
   * Tile move whoosh: soft filtered sine sweep
   */
  public playMove(): void {
    if (!this.isSfxAllowed() || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio playback fails gracefully
    }
  }

  /**
   * Tile merge chime: pitch scales with tile value.
   * Enhanced with secondary harmonic oscillator for richer tone.
   */
  public playMerge(tileValue: number): void {
    if (!this.isSfxAllowed() || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;

      // Pitch lookup table for harmonic progression
      const frequencies: Record<number, number> = {
        4: 261.63, // C4
        8: 293.66, // D4
        16: 329.63, // E4
        32: 392.0, // G4
        64: 440.0, // A4
        128: 493.88, // B4
        256: 523.25, // C5
        512: 659.25, // E5
        1024: 783.99, // G5
        2048: 1046.5, // C6
      };

      const freq = frequencies[tileValue] || 523.25;

      // Primary oscillator
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc1.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain);
      osc1.start(now);
      osc1.stop(now + 0.21);

      // Secondary harmonic (+octave, softer) for richness
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);
      osc2.frequency.exponentialRampToValueAtTime(freq * 2.5, now + 0.12);
      gain2.gain.setValueAtTime(0.08, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(now);
      osc2.stop(now + 0.17);
    } catch {
      // Graceful error ignore
    }
  }

  /**
   * Enhanced merge with combo escalation.
   * comboCount > 1: pitch rises by semitones, adds shimmer.
   * comboCount > 3: rapid ascending cascade overlay.
   */
  public playMergeCombo(tileValue: number, comboCount: number): void {
    if (comboCount <= 1) {
      this.playMerge(tileValue);
      return;
    }

    if (!this.isSfxAllowed() || !this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;

      const frequencies: Record<number, number> = {
        4: 261.63, 8: 293.66, 16: 329.63, 32: 392.0,
        64: 440.0, 128: 493.88, 256: 523.25, 512: 659.25,
        1024: 783.99, 2048: 1046.5,
      };

      // Base frequency with semitone escalation per combo
      const baseFreq = frequencies[tileValue] || 523.25;
      const semitoneFactor = Math.pow(2, (comboCount - 1) / 12);
      const freq = baseFreq * semitoneFactor;

      // Primary merge tone (elevated pitch)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc1.frequency.exponentialRampToValueAtTime(freq * 1.4, now + 0.18);
      gain1.gain.setValueAtTime(0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain);
      osc1.start(now);
      osc1.stop(now + 0.23);

      // Shimmer tremolo for combo > 1
      const shimmer = this.ctx.createOscillator();
      const shimmerGain = this.ctx.createGain();
      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(freq * 3, now);
      shimmerGain.gain.setValueAtTime(0.06, now);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(this.sfxGain);
      shimmer.start(now);
      shimmer.stop(now + 0.13);

      // Cascade chime for combo > 3
      if (comboCount > 3) {
        const cascadeNotes = [freq, freq * 1.25, freq * 1.5, freq * 2];
        cascadeNotes.forEach((noteFreq, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const noteTime = now + 0.04 * i;
          const cascOsc = this.ctx.createOscillator();
          const cascGain = this.ctx.createGain();
          cascOsc.type = 'sine';
          cascOsc.frequency.setValueAtTime(noteFreq, noteTime);
          cascGain.gain.setValueAtTime(0.10, noteTime);
          cascGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.15);
          cascOsc.connect(cascGain);
          cascGain.connect(this.sfxGain);
          cascOsc.start(noteTime);
          cascOsc.stop(noteTime + 0.16);
        });
      }
    } catch {
      // Graceful error ignore
    }
  }

  /**
   * Score milestone celebration fanfare.
   * Ascending major triad with additional notes for higher milestones.
   */
  public playMilestone(score: number): void {
    if (!this.isSfxAllowed() || !this.ctx || !this.sfxGain) return;

    // Find the highest milestone we've crossed
    const milestone = AudioEngine.MILESTONES.find(m => score >= m && m > this.lastMilestoneTriggered);
    if (!milestone) return;

    this.lastMilestoneTriggered = milestone;

    try {
      const now = this.ctx.currentTime;
      // Base arpeggio notes — more notes for higher milestones
      const baseNotes = [523.25, 659.25, 783.99]; // C5, E5, G5
      const milestoneIndex = AudioEngine.MILESTONES.indexOf(milestone);

      // Add octave notes for higher milestones
      if (milestoneIndex >= 2) baseNotes.push(1046.5); // C6
      if (milestoneIndex >= 4) baseNotes.push(1318.5); // E6

      baseNotes.forEach((freq, i) => {
        if (!this.ctx || !this.sfxGain) return;
        const noteTime = now + i * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.22, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.30);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(noteTime);
        osc.stop(noteTime + 0.31);
      });
    } catch {
      // Graceful error ignore
    }
  }

  /**
   * Check if a score has crossed a new milestone.
   */
  public shouldPlayMilestone(score: number): boolean {
    return AudioEngine.MILESTONES.some(m => score >= m && m > this.lastMilestoneTriggered);
  }

  /**
   * Reset milestone tracking (e.g., on new game).
   */
  public resetMilestones(): void {
    this.lastMilestoneTriggered = 0;
  }

  /**
   * Win Fanfare: Major arpeggio
   */
  public playWin(): void {
    if (!this.isSfxAllowed() || !this.ctx || !this.sfxGain) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = this.ctx.currentTime;

      notes.forEach((freq, index) => {
        if (!this.ctx || !this.sfxGain) return;
        const noteTime = now + index * 0.1;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.3, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.36);
      });
    } catch {
      // Graceful error ignore
    }
  }

  /**
   * Game Over: Soft descending minor tones
   */
  public playGameOver(): void {
    if (!this.isSfxAllowed() || !this.ctx || !this.sfxGain) return;
    try {
      const notes = [440.0, 392.0, 329.63, 261.63];
      const now = this.ctx.currentTime;

      notes.forEach((freq, index) => {
        if (!this.ctx || !this.sfxGain) return;
        const noteTime = now + index * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.2, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.26);
      });
    } catch {
      // Graceful error ignore
    }
  }

  /**
   * Button click / UI tap
   */
  public playButtonClick(): void {
    if (!this.isSfxAllowed() || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Graceful error ignore
    }
  }

  /**
   * New Game sound: bright two-tone ascending sweep
   */
  public playNewGame(): void {
    if (!this.isSfxAllowed() || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Graceful error ignore
    }
  }

  /**
   * Undo sound: soft descending two-tone (inverse of new game).
   * Gentle "rewind" feel.
   */
  public playUndo(): void {
    if (!this.isSfxAllowed() || !this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Graceful error ignore
    }
  }
}
