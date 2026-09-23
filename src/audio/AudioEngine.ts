import { PlayablesBridge } from '../platform/PlayablesBridge';
import { MusicTrackId } from '../core/Types';

/**
 * AudioEngine — Procedural audio synthesis for 2048 Fusion.
 *
 * All sounds are generated in real-time using Web Audio API oscillators.
 * Zero external audio files. Zero licensing risk. 100% Non-copyright procedural music.
 *
 * Features:
 *  - 4 Selectable non-copyright ambient music soundscapes (Ambient Flow, Cyber Pulse, Starlight Zen, Deep Focus)
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
  private userSfxVolume: number = 0.8;
  private userMusicVolume: number = 0.6;
  private currentTrack: MusicTrackId = 'ambient_flow';

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
  private melodyTimerId: ReturnType<typeof setTimeout> | null = null;
  private sequencerTimerId: ReturnType<typeof setTimeout> | null = null;
  private oceanTimerId: ReturnType<typeof setTimeout> | null = null;
  private sharedNoiseBuffer: AudioBuffer | null = null;
  private stepIndex: number = 0;
  private isAmbientPlaying: boolean = false;

  // Milestone tracking
  private lastMilestoneTriggered: number = 0;
  private static readonly MILESTONES = [500, 1000, 2500, 5000, 10000, 25000, 50000];

  public static readonly TRACK_CONFIGS: Record<MusicTrackId, {
    name: string;
    description: string;
    genre: string;
  }> = {
    ambient_flow: {
      name: 'Ambient Flow',
      description: 'Lush cosmic pads with gentle bell chimes',
      genre: 'Ethereal Space Ambient',
    },
    cyber_pulse: {
      name: 'Cyber Pulse',
      description: '105 BPM Synthwave groove with punchy bass & retro beat',
      genre: 'Synthwave / Lo-Fi Beat',
    },
    starlight_zen: {
      name: 'Starlight Zen',
      description: 'Acoustic celestial music box & kalimba arpeggios',
      genre: 'Acoustic Music Box / Kalimba',
    },
    deep_focus: {
      name: 'Deep Focus',
      description: 'Binaural theta drone & soothing ocean waves',
      genre: 'Binaural Ocean Waves & Theta Drone',
    },
  };

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
        this.ctx.suspend().catch(() => { });
      }
    });

    this.bridge.onResume(() => {
      if (this.ctx && this.ctx.state === 'suspended' && this.isAudioAllowed()) {
        this.ctx.resume().catch(() => { });
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
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
  }

  /**
   * Initialize AudioContext on first user gesture.
   */
  public unlockAudio(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Master gain → Dynamics Compressor → destination
        this.masterGain = this.ctx.createGain();

        try {
          const compressor = this.ctx.createDynamicsCompressor();
          compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
          compressor.knee.setValueAtTime(8, this.ctx.currentTime);
          compressor.ratio.setValueAtTime(3.5, this.ctx.currentTime);
          compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
          compressor.release.setValueAtTime(0.20, this.ctx.currentTime);
          this.masterGain.connect(compressor);
          compressor.connect(this.ctx.destination);
        } catch {
          this.masterGain.connect(this.ctx.destination);
        }

        // SFX submix → master
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);

        // Music submix → master
        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.masterGain);

        this.updateAllGains();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.userMusicEnabled && !this.isAmbientPlaying && this.isAudioAllowed()) {
          this.startAmbientMusic();
        }
      }).catch(() => { });
    } else if (this.ctx && this.userMusicEnabled && !this.isAmbientPlaying && this.isAudioAllowed()) {
      this.startAmbientMusic();
    }
  }

  public unlock(): void {
    this.unlockAudio();
  }

  public startBackgroundMusic(): void {
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.unlockAudio();
    }
    if (!this.isAmbientPlaying) {
      this.startAmbientMusic();
    }
  }

  public handleVisibilityChange(visible: boolean): void {
    if (!visible) {
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => { });
      }
    } else {
      if (this.ctx && this.ctx.state === 'suspended' && this.isAudioAllowed()) {
        this.ctx.resume().catch(() => { });
      }
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

    if (enabled) {
      if (!this.ctx || this.ctx.state === 'suspended') {
        this.unlockAudio();
      } else if (!this.isAmbientPlaying) {
        this.startAmbientMusic();
      }
    } else if (!enabled && this.isAmbientPlaying) {
      this.stopAmbientMusic();
    }
  }

  public setSfxVolume(volume: number): void {
    this.userSfxVolume = Math.max(0, Math.min(1, volume));
    this.updateSfxGain();
  }

  public setMusicVolume(volume: number): void {
    this.userMusicVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicGain();
  }

  public getSfxVolume(): number {
    return this.userSfxVolume;
  }

  public getMusicVolume(): number {
    return this.userMusicVolume;
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
    const target = this.platformAudioEnabled ? 0.95 : 0;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(target, now + 0.05);
  }

  private updateSfxGain(): void {
    if (!this.sfxGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const target = this.isSfxAllowed() ? (0.75 * this.userSfxVolume) : 0;
    this.sfxGain.gain.setValueAtTime(this.sfxGain.gain.value, now);
    this.sfxGain.gain.linearRampToValueAtTime(target, now + 0.05);
  }

  private updateMusicGain(): void {
    if (!this.musicGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const target = this.isMusicAllowed() ? (0.85 * this.userMusicVolume) : 0;
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(target, now + 0.3);
  }

  /**
   * Duck music volume momentarily during high-energy sound effects so SFX cut cleanly.
   */
  private duckMusic(): void {
    if (!this.ctx || !this.musicGain || !this.isMusicAllowed()) return;
    try {
      const now = this.ctx.currentTime;
      const normal = 0.85 * this.userMusicVolume;
      const ducked = normal * 0.70;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(ducked, now + 0.05);
      this.musicGain.gain.linearRampToValueAtTime(normal, now + 0.45);
    } catch { /* ignore */ }
  }

  /**
   * Set the active procedural non-copyright music track and cross-fade if currently playing.
   */
  public setMusicTrack(track: MusicTrackId): void {
    const isNew = this.currentTrack !== track;
    this.currentTrack = track;
    if (this.isAmbientPlaying && isNew) {
      this.stopAmbientMusic();
      setTimeout(() => {
        if (this.userMusicEnabled && this.isAudioAllowed()) {
          this.startAmbientMusic();
        }
      }, 300);
    } else if (this.userMusicEnabled && !this.isAmbientPlaying && this.isAudioAllowed()) {
      this.startAmbientMusic();
    }
  }

  public getMusicTrack(): MusicTrackId {
    return this.currentTrack;
  }

  public getTrackName(track?: MusicTrackId): string {
    const id = track || this.currentTrack;
    return AudioEngine.TRACK_CONFIGS[id]?.name || 'Ambient Flow';
  }

  // --- Ambient Generative Music ---

  /**
   * Start ambient procedural lounge music using active track configuration.
   */
  // --- Ambient Generative Music ---

  /**
   * Helper to generate a warm pink/brown noise buffer for percussion and ocean surf.
   */
  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    try {
      if (typeof this.ctx.createBuffer !== 'function') return null;
      if (this.sharedNoiseBuffer && this.sharedNoiseBuffer.sampleRate === this.ctx.sampleRate) {
        return this.sharedNoiseBuffer;
      }
      const length = Math.floor(this.ctx.sampleRate * 2.5);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        // Warm natural noise filter
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.10;
        b2 = 0.85 * b2 + white * 0.15;
        data[i] = (b0 + b1 + b2) * 1.5;
      }
      this.sharedNoiseBuffer = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  /**
   * Start procedural non-copyright music according to active track genre.
   */
  public startAmbientMusic(): void {
    if (!this.ctx) {
      this.unlockAudio();
    }
    if (!this.ctx || !this.musicGain || this.isAmbientPlaying || !this.isMusicAllowed()) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => { });
    }

    this.isAmbientPlaying = true;
    this.stepIndex = 0;

    switch (this.currentTrack) {
      case 'cyber_pulse':
        this.startCyberPulse();
        break;
      case 'starlight_zen':
        this.startStarlightZen();
        break;
      case 'deep_focus':
        this.startDeepFocus();
        break;
      case 'ambient_flow':
      default:
        this.startAmbientFlow();
        break;
    }
  }

  // =========================================================================
  // TRACK 1: AMBIENT FLOW (Ethereal Cosmic Space Ambient)
  // =========================================================================

  private static readonly FLOW_CHORDS = [
    [130.81, 196.00, 246.94, 329.63, 392.00], // Cmaj9
    [110.00, 164.81, 196.00, 261.63, 329.63], // Am9
    [174.61, 220.00, 261.63, 329.63, 440.00], // Fmaj7#11
    [196.00, 246.94, 293.66, 392.00, 493.88], // Gadd9
    [164.81, 196.00, 246.94, 293.66, 392.00], // Em7
    [146.83, 220.00, 261.63, 349.23, 440.00], // Dm9
  ];

  private static readonly FLOW_MELODY = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

  private startAmbientFlow(): void {
    if (!this.ctx || !this.musicGain) return;
    try {
      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
      this.ambientFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);
      this.ambientFilter.connect(this.musicGain);

      this.ambientLfo = this.ctx.createOscillator();
      this.ambientLfoGain = this.ctx.createGain();
      this.ambientLfo.type = 'sine';
      this.ambientLfo.frequency.setValueAtTime(0.1, this.ctx.currentTime);
      this.ambientLfoGain.gain.setValueAtTime(400, this.ctx.currentTime);
      this.ambientLfo.connect(this.ambientLfoGain);
      this.ambientLfoGain.connect(this.ambientFilter.frequency);
      this.ambientLfo.start();

      this.playAmbientChord();
      this.scheduleNextChord();

      this.playMelodyNote();
      this.scheduleNextMelodyNote();
    } catch {
      this.isAmbientPlaying = false;
    }
  }

  private playAmbientChord(): void {
    if (!this.ctx || !this.ambientFilter || !this.isAmbientPlaying) return;
    const now = this.ctx.currentTime;
    const chord = AudioEngine.FLOW_CHORDS[this.ambientChordIndex % AudioEngine.FLOW_CHORDS.length];

    // Fade out previous chord
    for (const gain of this.ambientGainNodes) {
      try {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 2.0);
      } catch { /* ignore */ }
    }

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

    for (let i = 0; i < chord.length; i++) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(chord[i], now);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 12, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 1.8);

        osc.connect(gain);
        gain.connect(this.ambientFilter);

        osc.start(now);
        this.ambientOscillators.push(osc);
        this.ambientGainNodes.push(gain);
      } catch { /* ignore */ }
    }

    this.ambientChordIndex++;
  }

  private scheduleNextChord(): void {
    if (!this.isAmbientPlaying || this.currentTrack !== 'ambient_flow') return;
    const interval = 7500 + Math.random() * 2500;
    this.ambientTimerId = setTimeout(() => {
      if (this.isAmbientPlaying && this.isMusicAllowed()) {
        this.playAmbientChord();
        this.scheduleNextChord();
      }
    }, interval);
  }

  private playMelodyNote(): void {
    if (!this.ctx || !this.ambientFilter || !this.isAmbientPlaying || !this.isMusicAllowed()) return;
    try {
      const now = this.ctx.currentTime;
      const noteFreq = AudioEngine.FLOW_MELODY[Math.floor(Math.random() * AudioEngine.FLOW_MELODY.length)];

      const osc = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, now);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(noteFreq * 1.5, now); // Fifth harmonic chime

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.32, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(this.ambientFilter);

      osc.start(now);
      overtone.start(now);
      osc.stop(now + 1.7);
      overtone.stop(now + 1.7);

      setTimeout(() => {
        try {
          osc.disconnect();
          overtone.disconnect();
          gain.disconnect();
        } catch { /* ignore */ }
      }, 1800);
    } catch { /* ignore */ }
  }

  private scheduleNextMelodyNote(): void {
    if (!this.isAmbientPlaying || this.currentTrack !== 'ambient_flow') return;
    const interval = 2400 + Math.random() * 1800;
    this.melodyTimerId = setTimeout(() => {
      if (this.isAmbientPlaying && this.isMusicAllowed()) {
        this.playMelodyNote();
        this.scheduleNextMelodyNote();
      }
    }, interval);
  }

  // =========================================================================
  // TRACK 2: CYBER PULSE (105 BPM Synthwave Groove with Punchy Bass & Beat)
  // =========================================================================

  private startCyberPulse(): void {
    if (!this.ctx || !this.musicGain) return;
    try {
      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(3200, this.ctx.currentTime);
      this.ambientFilter.Q.setValueAtTime(1.1, this.ctx.currentTime);
      this.ambientFilter.connect(this.musicGain);

      this.stepIndex = 0;
      this.tickCyberPulse();
    } catch {
      this.isAmbientPlaying = false;
    }
  }

  private tickCyberPulse(): void {
    if (!this.isAmbientPlaying || !this.isMusicAllowed() || !this.ctx || !this.ambientFilter || this.currentTrack !== 'cyber_pulse') return;

    try {
      const now = this.ctx.currentTime;
      const step = this.stepIndex % 16;
      const bar = Math.floor(this.stepIndex / 16) % 4;

      // 4-Bar Chord Progression: Am -> F -> G -> Em
      const bassRoots = [55.00, 43.65, 49.00, 41.20]; // A1, F1, G1, E1
      const chordNotes = [
        [220.00, 261.63, 329.63], // Am (A3, C4, E4)
        [174.61, 220.00, 261.63], // F (F3, A3, C4)
        [196.00, 246.94, 293.66], // G (G3, B3, D4)
        [164.81, 196.00, 246.94], // Em (E3, G3, B3)
      ];

      // 1. PUNCHY SYNTH BASS (Driving 80s synthwave bassline on steps: 0, 3, 6, 8, 10, 12, 14)
      if ([0, 3, 6, 8, 10, 12, 14].includes(step)) {
        const root = bassRoots[bar];
        const freq = (step === 6 || step === 14) ? root * 2 : root;
        this.playCyberBass(freq, now);
      }

      // 2. SYNTH CHORD STABS (Beat 2 on step 4, syncopated stab on step 11)
      if (step === 4 || step === 11) {
        this.playCyberStab(chordNotes[bar], now);
      }

      // 3. HI-HAT PERCUSSION (Off-beats: 2, 6, 10, 14)
      if ([2, 6, 10, 14].includes(step)) {
        this.playCyberHiHat(now);
      }

      // 4. RETRO SNARE / CLAP (Backbeats: 4 and 12)
      if (step === 4 || step === 12) {
        this.playCyberSnare(now);
      }

      // 5. CYBER ARPEGGIO LEAD (Bars 2 and 3, even steps)
      if ((bar === 2 || bar === 3) && step % 2 === 0) {
        const leadScale = [440.00, 523.25, 659.25, 783.99, 880.00, 1046.50];
        const noteIdx = (step * 2 + bar) % leadScale.length;
        this.playCyberLead(leadScale[noteIdx], now);
      }

      this.stepIndex++;
    } catch { /* ignore */ }

    // 105 BPM 16th note step: 142.86ms
    this.sequencerTimerId = setTimeout(() => {
      this.tickCyberPulse();
    }, 143);
  }

  private playCyberBass(freq: number, now: number): void {
    if (!this.ctx || !this.ambientFilter) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(110, now + 0.10);
      filter.Q.setValueAtTime(2.2, now);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientFilter);

      osc.start(now);
      osc.stop(now + 0.13);

      setTimeout(() => {
        try { osc.disconnect(); filter.disconnect(); gain.disconnect(); } catch { /* ignore */ }
      }, 140);
    } catch { /* ignore */ }
  }

  private playCyberStab(notes: number[], now: number): void {
    if (!this.ctx || !this.ambientFilter) return;
    for (const freq of notes) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ambientFilter);

        osc.start(now);
        osc.stop(now + 0.23);

        setTimeout(() => {
          try { osc.disconnect(); gain.disconnect(); } catch { /* ignore */ }
        }, 250);
      } catch { /* ignore */ }
    }
  }

  private playCyberHiHat(now: number): void {
    if (!this.ctx || !this.ambientFilter) return;
    try {
      const buffer = this.getNoiseBuffer();
      if (buffer && typeof this.ctx.createBufferSource === 'function') {
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(8000, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ambientFilter);

        src.start(now);
        src.stop(now + 0.04);
        setTimeout(() => {
          try { src.disconnect(); filter.disconnect(); gain.disconnect(); } catch { /* ignore */ }
        }, 50);
      } else {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(6000, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.connect(gain);
        gain.connect(this.ambientFilter);
        osc.start(now);
        osc.stop(now + 0.025);
        setTimeout(() => {
          try { osc.disconnect(); gain.disconnect(); } catch { /* ignore */ }
        }, 35);
      }
    } catch { /* ignore */ }
  }

  private playCyberSnare(now: number): void {
    if (!this.ctx || !this.ambientFilter) return;
    try {
      const buffer = this.getNoiseBuffer();
      if (buffer && typeof this.ctx.createBufferSource === 'function') {
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.Q.setValueAtTime(1.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ambientFilter);

        src.start(now);
        src.stop(now + 0.08);
        setTimeout(() => {
          try { src.disconnect(); filter.disconnect(); gain.disconnect(); } catch { /* ignore */ }
        }, 90);
      }

      // Tonal body
      const osc = this.ctx.createOscillator();
      const toneGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.06);

      toneGain.gain.setValueAtTime(0.16, now);
      toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(toneGain);
      toneGain.connect(this.ambientFilter);

      osc.start(now);
      osc.stop(now + 0.07);
      setTimeout(() => {
        try { osc.disconnect(); toneGain.disconnect(); } catch { /* ignore */ }
      }, 80);
    } catch { /* ignore */ }
  }

  private playCyberLead(freq: number, now: number): void {
    if (!this.ctx || !this.ambientFilter) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ambientFilter);

      osc.start(now);
      osc.stop(now + 0.09);

      setTimeout(() => {
        try { osc.disconnect(); gain.disconnect(); } catch { /* ignore */ }
      }, 100);
    } catch { /* ignore */ }
  }

  // =========================================================================
  // TRACK 3: STARLIGHT ZEN (Acoustic Celestial Music Box & Kalimba Arpeggios)
  // =========================================================================

  private static readonly ZEN_MELODIES = [
    // Bar 0: C Lydian celestial arpeggios
    [523.25, 659.25, 783.99, 987.77, 1046.50, 783.99, 659.25, 587.33, 523.25, 659.25, 783.99, 1046.50, 987.77, 783.99, 659.25, 587.33],
    // Bar 1: A Minor celestial
    [440.00, 523.25, 659.25, 880.00, 1046.50, 880.00, 659.25, 523.25, 440.00, 523.25, 659.25, 880.00, 1046.50, 880.00, 659.25, 493.88],
    // Bar 2: F Major 7
    [349.23, 440.00, 523.25, 659.25, 698.46, 523.25, 440.00, 392.00, 349.23, 440.00, 523.25, 659.25, 880.00, 659.25, 523.25, 440.00],
    // Bar 3: G Suspended
    [392.00, 493.88, 587.33, 783.99, 987.77, 783.99, 587.33, 493.88, 392.00, 493.88, 587.33, 783.99, 987.77, 783.99, 587.33, 523.25],
  ];

  private startStarlightZen(): void {
    if (!this.ctx || !this.musicGain) return;
    try {
      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(4500, this.ctx.currentTime);
      this.ambientFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);
      this.ambientFilter.connect(this.musicGain);

      this.stepIndex = 0;
      this.tickStarlightZen();
    } catch {
      this.isAmbientPlaying = false;
    }
  }

  private tickStarlightZen(): void {
    if (!this.isAmbientPlaying || !this.isMusicAllowed() || !this.ctx || !this.ambientFilter || this.currentTrack !== 'starlight_zen') return;

    try {
      const now = this.ctx.currentTime;
      const step = this.stepIndex % 16;
      const bar = Math.floor(this.stepIndex / 16) % 4;

      // Wooden bass pedal on step 0 and 8
      if (step === 0 || step === 8) {
        const bassRoots = [130.81, 110.00, 87.31, 98.00]; // C3, A2, F2, G2
        this.playKalimbaBass(bassRoots[bar], now);
      }

      // Music box tine arpeggio pluck
      const noteFreq = AudioEngine.ZEN_MELODIES[bar][step];
      this.playMusicBoxNote(noteFreq, now);

      this.stepIndex++;
    } catch { /* ignore */ }

    // 130 BPM cadence: 170ms per note
    this.sequencerTimerId = setTimeout(() => {
      this.tickStarlightZen();
    }, 170);
  }

  private playMusicBoxNote(freq: number, now: number): void {
    if (!this.ctx || !this.ambientFilter) return;
    try {
      // 1. Fundamental chime
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.28, now + 0.003);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc1.connect(gain1);
      gain1.connect(this.ambientFilter);

      osc1.start(now);
      osc1.stop(now + 0.34);

      // 2. Metallic steel tine harmonic (2.756x overtone)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.756, now);

      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.linearRampToValueAtTime(0.08, now + 0.003);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc2.connect(gain2);
      gain2.connect(this.ambientFilter);

      osc2.start(now);
      osc2.stop(now + 0.18);

      setTimeout(() => {
        try {
          osc1.disconnect(); gain1.disconnect();
          osc2.disconnect(); gain2.disconnect();
        } catch { /* ignore */ }
      }, 360);
    } catch { /* ignore */ }
  }

  private playKalimbaBass(freq: number, now: number): void {
    if (!this.ctx || !this.ambientFilter) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(this.ambientFilter);

      osc.start(now);
      osc.stop(now + 0.58);

      setTimeout(() => {
        try { osc.disconnect(); gain.disconnect(); } catch { /* ignore */ }
      }, 600);
    } catch { /* ignore */ }
  }

  // =========================================================================
  // TRACK 4: DEEP FOCUS (Binaural Ocean Waves & Theta Sub Drone)
  // =========================================================================

  private startDeepFocus(): void {
    if (!this.ctx || !this.musicGain) return;
    try {
      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      this.ambientFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);
      this.ambientFilter.connect(this.musicGain);

      const now = this.ctx.currentTime;

      // Binaural Theta Drone (58 Hz + 62 Hz = exact 4.0 Hz theta wave)
      const freqs = [
        { f: 58.00, type: 'sine' as OscillatorType, vol: 0.22 },
        { f: 62.00, type: 'sine' as OscillatorType, vol: 0.22 },
        { f: 116.00, type: 'triangle' as OscillatorType, vol: 0.12 },
        { f: 29.00, type: 'sine' as OscillatorType, vol: 0.18 },
      ];

      for (const item of freqs) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = item.type;
        osc.frequency.setValueAtTime(item.f, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(item.vol, now + 2.5);

        osc.connect(gain);
        gain.connect(this.ambientFilter);

        osc.start(now);
        this.ambientOscillators.push(osc);
        this.ambientGainNodes.push(gain);
      }

      // Start continuous ocean wave swells
      this.triggerOceanWave();
    } catch {
      this.isAmbientPlaying = false;
    }
  }

  private triggerOceanWave(): void {
    if (!this.isAmbientPlaying || !this.isMusicAllowed() || !this.ctx || !this.ambientFilter || this.currentTrack !== 'deep_focus') return;

    try {
      const buffer = this.getNoiseBuffer();
      if (buffer && typeof this.ctx.createBufferSource === 'function') {
        const now = this.ctx.currentTime;
        const waveDuration = 7.0;

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(2.2, now);
        filter.frequency.setValueAtTime(180, now);
        filter.frequency.linearRampToValueAtTime(850, now + 3.8);
        filter.frequency.linearRampToValueAtTime(180, now + waveDuration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.linearRampToValueAtTime(0.38, now + 3.5);
        gain.gain.linearRampToValueAtTime(0.01, now + waveDuration);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ambientFilter);

        src.start(now);
        src.stop(now + waveDuration);

        setTimeout(() => {
          try { src.disconnect(); filter.disconnect(); gain.disconnect(); } catch { /* ignore */ }
        }, (waveDuration + 0.2) * 1000);
      }
    } catch { /* ignore */ }

    // Wave swell recurrence
    this.oceanTimerId = setTimeout(() => {
      this.triggerOceanWave();
    }, 7200);
  }

  // =========================================================================
  // AMBIENT LIFECYCLE MANAGEMENT (Clean Cross-Fades & Stop)
  // =========================================================================

  public stopAmbientMusic(): void {
    this.isAmbientPlaying = false;

    if (this.ambientTimerId) {
      clearTimeout(this.ambientTimerId);
      this.ambientTimerId = null;
    }
    if (this.melodyTimerId) {
      clearTimeout(this.melodyTimerId);
      this.melodyTimerId = null;
    }
    if (this.sequencerTimerId) {
      clearTimeout(this.sequencerTimerId);
      this.sequencerTimerId = null;
    }
    if (this.oceanTimerId) {
      clearTimeout(this.oceanTimerId);
      this.oceanTimerId = null;
    }

    if (this.ctx) {
      const now = this.ctx.currentTime;

      // Fade out all ambient oscillators
      for (const gain of this.ambientGainNodes) {
        try {
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.6);
        } catch { /* ignore */ }
      }

      // Capture currently active nodes in local constants so future startAmbientMusic is NOT affected
      const oscsToClean = [...this.ambientOscillators];
      const gainsToClean = [...this.ambientGainNodes];
      const lfoToClean = this.ambientLfo;
      const lfoGainToClean = this.ambientLfoGain;
      const filterToClean = this.ambientFilter;

      this.ambientOscillators = [];
      this.ambientGainNodes = [];
      this.ambientLfo = null;
      this.ambientLfoGain = null;
      this.ambientFilter = null;

      // Stop and disconnect captured nodes after fade
      setTimeout(() => {
        for (const osc of oscsToClean) {
          try { osc.stop(); osc.disconnect(); } catch { /* ignore */ }
        }
        for (const gain of gainsToClean) {
          try { gain.disconnect(); } catch { /* ignore */ }
        }

        try { lfoToClean?.stop(); lfoToClean?.disconnect(); } catch { /* ignore */ }
        try { lfoGainToClean?.disconnect(); } catch { /* ignore */ }
        try { filterToClean?.disconnect(); } catch { /* ignore */ }
      }, 700);
    }
  }

  private suspendAmbient(): void {
    if (this.ambientTimerId) {
      clearTimeout(this.ambientTimerId);
      this.ambientTimerId = null;
    }
    if (this.melodyTimerId) {
      clearTimeout(this.melodyTimerId);
      this.melodyTimerId = null;
    }
    if (this.sequencerTimerId) {
      clearTimeout(this.sequencerTimerId);
      this.sequencerTimerId = null;
    }
    if (this.oceanTimerId) {
      clearTimeout(this.oceanTimerId);
      this.oceanTimerId = null;
    }
  }

  private resumeAmbient(): void {
    if (this.isAmbientPlaying && this.isMusicAllowed()) {
      this.stopAmbientMusic();
      this.startAmbientMusic();
    }
  }

  // --- Sound Effects ---

  /**
   * Tile move whoosh: soft filtered sine sweep
   */
  public playMove(): void {
    if (!this.isSfxAllowed()) return;
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.unlockAudio();
    }
    if (!this.ctx || !this.sfxGain) return;
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
    if (!this.isSfxAllowed()) return;
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.unlockAudio();
    }
    if (!this.ctx || !this.sfxGain) return;
    this.duckMusic();
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

    if (!this.isSfxAllowed()) return;
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.unlockAudio();
    }
    if (!this.ctx || !this.sfxGain) return;
    this.duckMusic();

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
    if (!this.isSfxAllowed()) return;
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.unlockAudio();
    }
    if (!this.ctx || !this.sfxGain) return;

    // Find the highest milestone we've crossed
    const milestone = AudioEngine.MILESTONES.find(m => score >= m && m > this.lastMilestoneTriggered);
    if (!milestone) return;

    this.lastMilestoneTriggered = milestone;
    this.duckMusic();

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
    if (!this.isSfxAllowed()) return;
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.unlockAudio();
    }
    if (!this.ctx || !this.sfxGain) return;
    this.duckMusic();
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
    if (!this.isSfxAllowed()) return;
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.unlockAudio();
    }
    if (!this.ctx || !this.sfxGain) return;
    this.duckMusic();
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
    if (!this.isSfxAllowed()) return;
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.unlockAudio();
    }
    if (!this.ctx || !this.sfxGain) return;
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
    if (!this.isSfxAllowed()) return;
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.unlockAudio();
    }
    if (!this.ctx || !this.sfxGain) return;
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
    if (!this.isSfxAllowed()) return;
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.unlockAudio();
    }
    if (!this.ctx || !this.sfxGain) return;
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
