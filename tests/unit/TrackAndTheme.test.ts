import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/core/Engine';
import { AudioEngine } from '../../src/audio/AudioEngine';

describe('Track & Theme Customization and Restart Mechanics', () => {
  let engine: GameEngine;
  let audio: AudioEngine;

  beforeEach(() => {
    engine = new GameEngine();
    audio = AudioEngine.getInstance();
  });

  it('defaults to ambient_flow track and cosmic_horizon theme', () => {
    const settings = engine.getSettings();
    expect(settings.musicTrack).toBe('ambient_flow');
    expect(settings.backgroundTheme).toBe('cosmic_horizon');
    expect(audio.getMusicTrack()).toBe('ambient_flow');
  });

  it('updates and persists music track selection', () => {
    audio.setMusicTrack('cyber_pulse');
    expect(audio.getMusicTrack()).toBe('cyber_pulse');
    expect(audio.getTrackName('cyber_pulse')).toBe('Cyber Pulse');

    engine.updateSettings({ musicTrack: 'cyber_pulse' });
    expect(engine.getSettings().musicTrack).toBe('cyber_pulse');
  });

  it('updates and persists background theme selection', () => {
    engine.updateSettings({ backgroundTheme: 'nebula_dream' });
    expect(engine.getSettings().backgroundTheme).toBe('nebula_dream');
  });

  it('exposes correct track names for all 4 tracks', () => {
    expect(audio.getTrackName('ambient_flow')).toBe('Ambient Flow');
    expect(audio.getTrackName('cyber_pulse')).toBe('Cyber Pulse');
    expect(audio.getTrackName('starlight_zen')).toBe('Starlight Zen');
    expect(audio.getTrackName('deep_focus')).toBe('Deep Focus');
  });

  it('correctly reports game ended status for restart bypass', () => {
    expect(engine.isGameEnded()).toBe(false);
  });
});
