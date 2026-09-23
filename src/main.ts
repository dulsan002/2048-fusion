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

  // Initialize UI Manager with action callbacks
  const ui = new UIManager({
    onNewGame: () => {
      audio.playNewGame();
      audio.resetMilestones();
      engine.initNewGame();
      renderer.renderInitial(engine.getBoard());
      ui.updateScores(0, engine.getBestScore());
      ui.setUndoEnabled(false);
      storage.saveState(engine.getState());
      a11y.announce('New game started.');
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

    onToggleMusic: (enabled: boolean) => {
      audio.setMusicEnabled(enabled);
      engine.updateSettings({ musicEnabled: enabled });
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
  });

  // Setup Input Manager
  const input = new InputManager(boardEl);

  input.onMove((direction) => {
    if (ui.isAnyModalOpen()) return;

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
      // Slight delay so milestone doesn't clash with merge sound
      setTimeout(() => audio.playMilestone(newScore), 200);
    }

    // Render tile moves and update scores
    renderer.renderMove(result, engine.getBoard());
    ui.updateScores(engine.getScore(), engine.getBestScore(), result.scoreIncrement);
    ui.setUndoEnabled(engine.canUndo());

    // Screen reader announcement
    a11y.announceMove(result.scoreIncrement, result.highestTile);

    // Save state & send high score
    storage.saveState(engine.getState());
    bridge.sendScore(engine.getBestScore());

    // Check Win
    if (result.isWon) {
      audio.playWin();
      a11y.announceWin();
      setTimeout(() => ui.showWinModal(), 300);
    }

    // Check Game Over
    if (result.isGameOver) {
      audio.playGameOver();
      a11y.announceGameOver(engine.getScore());
      setTimeout(() => ui.showGameOverModal(engine.getScore()), 400);
    }
  });

  input.onRestart(() => {
    if (!ui.isAnyModalOpen()) {
      audio.playNewGame();
      audio.resetMilestones();
      engine.initNewGame();
      renderer.renderInitial(engine.getBoard());
      ui.updateScores(0, engine.getBestScore());
      ui.setUndoEnabled(false);
      storage.saveState(engine.getState());
    }
  });

  input.onUndo(() => {
    if (!ui.isAnyModalOpen() && engine.undo()) {
      audio.playUndo();
      renderer.renderInitial(engine.getBoard());
      ui.updateScores(engine.getScore(), engine.getBestScore());
      ui.setUndoEnabled(engine.canUndo());
      storage.saveState(engine.getState());
    }
  });

  // Playables Pause / Resume Lifecycle integration
  bridge.onPause(() => {
    input.setEnabled(false);
  });

  bridge.onResume(() => {
    input.setEnabled(true);
  });

  // Load saved state (strict Playables requirement: await loadData before saveData)
  const savedState = await storage.loadState();
  if (savedState && engine.restoreState(savedState)) {
    console.log('[2048 Fusion] Restored saved game successfully.');
    renderer.renderInitial(engine.getBoard());
    ui.updateScores(engine.getScore(), engine.getBestScore());
    ui.setUndoEnabled(engine.canUndo());

    // Restore settings
    if (savedState.settings) {
      if (savedState.settings.highContrast) {
        document.body.classList.add('high-contrast');
        const contrastSwitch = document.getElementById('setting-contrast') as HTMLInputElement;
        if (contrastSwitch) contrastSwitch.checked = true;
      }
      if (savedState.settings.reducedMotion || a11y.prefersReducedMotion()) {
        document.body.classList.add('reduced-motion');
        const motionSwitch = document.getElementById('setting-motion') as HTMLInputElement;
        if (motionSwitch) motionSwitch.checked = true;
      }
      if (savedState.settings.soundEnabled === false) {
        audio.setSfxEnabled(false);
        ui.updateSoundIcon(false);
        const soundSwitch = document.getElementById('setting-sound') as HTMLInputElement;
        if (soundSwitch) soundSwitch.checked = false;
      }
      if (savedState.settings.musicEnabled === false) {
        audio.setMusicEnabled(false);
        const musicSwitch = document.getElementById('setting-music') as HTMLInputElement;
        if (musicSwitch) musicSwitch.checked = false;
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
