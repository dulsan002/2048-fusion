import { AudioEngine } from './audio/AudioEngine';
import { GameEngine } from './core/Engine';
import { InputManager } from './input/InputManager';
import { PlayablesBridge } from './platform/PlayablesBridge';
import { StorageAdapter } from './platform/StorageAdapter';
import './styles/main.css';
import { A11yAnnouncer } from './ui/A11yAnnouncer';
import { BoardRenderer } from './ui/BoardRenderer';
import { UIManager } from './ui/UIManager';

async function bootstrap() {
  console.log('[2048 Fusion] Initializing application...');

  const bridge = PlayablesBridge.getInstance();
  const engine = new GameEngine();
  const storage = StorageAdapter.getInstance();
  const audio = AudioEngine.getInstance();
  const a11y = A11yAnnouncer.getInstance();

  const boardEl = document.getElementById('game-board')!;
  const tileContainerEl = document.getElementById('tile-container')!;

  const renderer = new BoardRenderer(boardEl, tileContainerEl);

  // Playables requirement: Notify platform of first frame paint
  bridge.sendFirstFrameReady();

  // Helper for starting new game with optional confirmation
  const startNewGame = (force = false) => {
    // Only confirm restart if the game is actively ongoing (NOT game over) and score > 0
    if (!force && !engine.isGameEnded() && engine.getSettings().confirmRestart && engine.getScore() > 0) {
      ui.confirmRestart(() => startNewGame(true));
      return;
    }
    audio.playNewGame();
    audio.resetMilestones();
    engine.initNewGame();
    renderer.renderInitial(engine.getBoard());
    ui.updateScores(0, engine.getBestScore());
    ui.setUndoEnabled(false);
    ui.setPlayButtonText('Resume Game');
    ui.resetHint();
    ui.updateSidebarStats(engine.getStats(), engine.getBestScore());
    storage.saveState(engine.getState());
    a11y.announce('New game started.');
  };

  // Initialize UI Manager with full callbacks
  const ui = new UIManager({
    onPlay: () => {
      audio.unlock();
      audio.startBackgroundMusic();
      renderer.calculateDimensions();
      renderer.renderInitial(engine.getBoard());
      a11y.announce('Game board ready.');
    },

    onNewGame: () => {
      startNewGame(false);
    },

    onPlayAgain: () => {
      startNewGame(true);
    },

    onUndo: () => {
      if (engine.undo()) {
        audio.playUndo();
        renderer.renderInitial(engine.getBoard());
        ui.updateScores(engine.getScore(), engine.getBestScore());
        ui.setUndoEnabled(engine.canUndo());
        storage.saveState(engine.getState());
        a11y.announce('Move undone.');
      }
    },

    onContinue: () => {
      engine.continueGame();
      storage.saveState(engine.getState());
      a11y.announce('Continuing game beyond 2048.');
    },

    onToggleSound: (enabled: boolean) => {
      audio.setSfxEnabled(enabled);
      engine.updateSettings({ soundEnabled: enabled });
      storage.saveState(engine.getState());
    },

    onSoundVolume: (volume: number) => {
      audio.setSfxVolume(volume);
      engine.updateSettings({ soundVolume: volume });
      storage.saveState(engine.getState());
    },

    onToggleMusic: (enabled: boolean) => {
      audio.setMusicEnabled(enabled);
      engine.updateSettings({ musicEnabled: enabled });
      storage.saveState(engine.getState());
      ui.setAudioWavePlaying(enabled);
    },

    onMusicVolume: (volume: number) => {
      audio.setMusicVolume(volume);
      engine.updateSettings({ musicVolume: volume });
      storage.saveState(engine.getState());
    },

    onToggleHighContrast: (enabled: boolean) => {
      engine.updateSettings({ highContrast: enabled });
      storage.saveState(engine.getState());
    },

    onToggleReducedMotion: (enabled: boolean) => {
      engine.updateSettings({ reducedMotion: enabled });
      storage.saveState(engine.getState());
    },

    onToggleHints: (enabled: boolean) => {
      engine.updateSettings({ showHints: enabled });
      storage.saveState(engine.getState());
      ui.setHintBannerVisible(enabled);
      if (enabled) {
        ui.resetHint();
      }
    },

    onToggleConfirmRestart: (enabled: boolean) => {
      engine.updateSettings({ confirmRestart: enabled });
      storage.saveState(engine.getState());
    },

    onSelectMusicTrack: (track) => {
      audio.setMusicTrack(track);
      engine.updateSettings({ musicTrack: track });
      storage.saveState(engine.getState());
      ui.setActiveMusicTrack(track, audio.getTrackName(track));
      a11y.announce(`Selected soundtrack ${audio.getTrackName(track)}`);
    },

    onSelectBackgroundTheme: (theme) => {
      engine.updateSettings({ backgroundTheme: theme });
      storage.saveState(engine.getState());
      ui.setActiveBackgroundTheme(theme);
      a11y.announce(`Selected wallpaper theme ${theme}`);
    },

    onGetHint: () => {
      if (!engine.getSettings().showHints) return;
      const bestDir = engine.getBestHintDirection();
      if (bestDir) {
        ui.updateHint(`Recommended Move: <strong style="color:var(--accent-cyan); font-weight:800;">${bestDir.toUpperCase()}</strong>`, true);
        audio.playMove();
        a11y.announce(`Recommended move is ${bestDir}`);
      } else {
        ui.updateHint('No clear move found', true);
      }
    },

    onOpenStats: () => {
      ui.showStatsModal(engine.getStats(), engine.getHistory());
    },
  });

  // Setup Input Manager
  const input = new InputManager(boardEl);

  input.onMove((direction) => {
    if (ui.isAnyModalOpen() || !ui.isGameViewActive()) return;

    // Ensure audio context is running on user input
    audio.unlock();
    audio.startBackgroundMusic();

    const result = engine.move(direction);

    if (!result.moved) {
      renderer.shake();
      return;
    }

    // Count merge combos within this single move
    const mergeSteps = result.steps.filter(s => s.mergedWith !== undefined && s.resultingValue !== undefined);
    // Each merge involves 2 steps (both tiles), so unique merges = steps / 2
    const mergeCount = mergeSteps.length / 2;

    // Play sounds with combo escalation
    audio.playMove();
    if (mergeCount > 0) {
      audio.playMergeCombo(result.highestTile, mergeCount);
    }

    // Check for score milestone
    const newScore = engine.getScore();
    if (audio.shouldPlayMilestone(newScore)) {
      setTimeout(() => audio.playMilestone(newScore), 200);
    }

    // Render tile moves and update scores
    renderer.renderMove(result, engine.getBoard());
    ui.updateScores(engine.getScore(), engine.getBestScore(), result.scoreIncrement);
    ui.setUndoEnabled(engine.canUndo());

    // Reset hint to default status so old move recommendation does not stay stuck
    ui.resetHint();

    // Update live desktop sidebar stats
    ui.updateSidebarStats(engine.getStats(), engine.getBestScore());

    // Screen reader announcement
    a11y.announceMove(result.scoreIncrement, result.highestTile);

    // Save state & send high score
    storage.saveState(engine.getState());
    bridge.sendScore(engine.getBestScore());

    // Update play button text in menu
    ui.setPlayButtonText('Resume Game');

    // Check Win
    if (result.isWon) {
      engine.recordGameEnd(true);
      storage.saveState(engine.getState());
      audio.playWin();
      a11y.announceWin();
      setTimeout(() => {
        ui.showWinModal({
          score: engine.getScore(),
          moves: engine.getMovesCount(),
          elapsedSeconds: engine.getElapsedTime(),
        });
      }, 300);
    }

    // Check Game Over
    if (result.isGameOver) {
      engine.recordGameEnd(false);
      storage.saveState(engine.getState());
      audio.playGameOver();
      a11y.announceGameOver(engine.getScore());
      setTimeout(() => {
        ui.showGameOverModal({
          score: engine.getScore(),
          bestScore: engine.getBestScore(),
          highestTile: engine.getMaxTile(),
          moves: engine.getMovesCount(),
        });
      }, 400);
    }
  });

  input.onRestart(() => {
    if (ui.isGameViewActive() && !ui.isAnyModalOpen()) {
      startNewGame(false);
    }
  });

  input.onUndo(() => {
    if (ui.isGameViewActive() && !ui.isAnyModalOpen() && engine.undo()) {
      audio.playUndo();
      renderer.renderInitial(engine.getBoard());
      ui.updateScores(engine.getScore(), engine.getBestScore());
      ui.setUndoEnabled(engine.canUndo());
      storage.saveState(engine.getState());
    }
  });

  input.onPause(() => {
    if (ui.isGameViewActive() && !ui.isAnyModalOpen()) {
      ui.showMenu();
    }
  });

  // Playables Pause / Resume Lifecycle integration
  bridge.onPause(() => {
    input.setEnabled(false);
    audio.handleVisibilityChange(false);
  });

  bridge.onResume(() => {
    input.setEnabled(true);
    audio.handleVisibilityChange(true);
  });

  // Load saved state (strict Playables requirement: await loadData before saveData)
  const savedState = await storage.loadState();
  if (savedState && engine.restoreState(savedState)) {
    console.log('[2048 Fusion] Restored saved game successfully.');
    renderer.renderInitial(engine.getBoard());
    ui.updateScores(engine.getScore(), engine.getBestScore());
    ui.setUndoEnabled(engine.canUndo());
    if (engine.getScore() > 0) {
      ui.setPlayButtonText('Resume Game');
    }

    // Restore settings
    const settings = engine.getSettings();
    if (settings) {
      // High Contrast
      if (settings.highContrast) {
        document.body.classList.add('high-contrast');
        const contrastSwitch = document.getElementById('setting-contrast') as HTMLInputElement;
        if (contrastSwitch) contrastSwitch.checked = true;
      }

      // Reduced Motion
      if (settings.reducedMotion || a11y.prefersReducedMotion()) {
        document.body.classList.add('reduced-motion');
        const motionSwitch = document.getElementById('setting-motion') as HTMLInputElement;
        if (motionSwitch) motionSwitch.checked = true;
      }

      // Sound FX Toggle & Volume
      if (settings.soundEnabled === false) {
        audio.setSfxEnabled(false);
        ui.updateMenuSoundIcon(false);
        const soundSwitch = document.getElementById('setting-sound') as HTMLInputElement;
        if (soundSwitch) soundSwitch.checked = false;
      }
      if (typeof settings.soundVolume === 'number') {
        audio.setSfxVolume(settings.soundVolume);
        const soundSlider = document.getElementById('slider-sound') as HTMLInputElement;
        const soundLabel = document.getElementById('label-sound-vol');
        if (soundSlider) soundSlider.value = Math.round(settings.soundVolume * 100).toString();
        if (soundLabel) soundLabel.textContent = `${Math.round(settings.soundVolume * 100)}%`;
      }

      // Music Toggle & Volume
      if (settings.musicEnabled === false) {
        audio.setMusicEnabled(false);
        const musicSwitch = document.getElementById('setting-music') as HTMLInputElement;
        if (musicSwitch) musicSwitch.checked = false;
      }
      if (typeof settings.musicVolume === 'number') {
        audio.setMusicVolume(settings.musicVolume);
        const musicSlider = document.getElementById('slider-music') as HTMLInputElement;
        const musicLabel = document.getElementById('label-music-vol');
        if (musicSlider) musicSlider.value = Math.round(settings.musicVolume * 100).toString();
        if (musicLabel) musicLabel.textContent = `${Math.round(settings.musicVolume * 100)}%`;
      }

      // Hints Visibility
      if (settings.showHints !== undefined) {
        const hintSwitch = document.getElementById('setting-hints') as HTMLInputElement;
        if (hintSwitch) hintSwitch.checked = settings.showHints;
        ui.setHintBannerVisible(settings.showHints);
      }
      ui.resetHint();

      // Confirm Restart
      if (settings.confirmRestart !== undefined) {
        const confirmSwitch = document.getElementById('setting-confirm-restart') as HTMLInputElement;
        if (confirmSwitch) confirmSwitch.checked = settings.confirmRestart;
      }
    }
  } else {
    console.log('[2048 Fusion] Initializing brand new game.');
    engine.initNewGame();
    renderer.renderInitial(engine.getBoard());
    ui.updateScores(0, engine.getBestScore());
    ui.setUndoEnabled(false);
    storage.saveState(engine.getState());
  }

  // Populate live stats and ambient audio wave state
  ui.updateSidebarStats(engine.getStats(), engine.getBestScore());
  ui.setAudioWavePlaying(engine.getSettings().musicEnabled !== false);

  // Restore music track and background theme from settings
  const initialTrack = engine.getSettings().musicTrack || 'ambient_flow';
  audio.setMusicTrack(initialTrack);
  ui.setActiveMusicTrack(initialTrack, audio.getTrackName(initialTrack));

  const initialTheme = engine.getSettings().backgroundTheme || 'cosmic_horizon';
  ui.setActiveBackgroundTheme(initialTheme);

  // Playables requirement: Notify platform when game is loaded, interactive and ready
  bridge.sendGameReady();
  console.log('[2048 Fusion] Game ready for player input.');
}

// Bootstrap once DOM content is parsed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootstrap());
} else {
  bootstrap();
}
