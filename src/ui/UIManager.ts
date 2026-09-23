import { BackgroundThemeId, GameHistoryRecord, GameStats, MusicTrackId } from '../core/Types';
import { A11yAnnouncer } from './A11yAnnouncer';
import { Icons } from './Icons';

export interface UIEventCallbacks {
  onPlay: () => void;
  onNewGame: () => void;
  onPlayAgain?: () => void;
  onUndo: () => void;
  onContinue: () => void;
  onToggleSound: (enabled: boolean) => void;
  onSoundVolume: (volume: number) => void;
  onToggleMusic: (enabled: boolean) => void;
  onMusicVolume: (volume: number) => void;
  onSelectMusicTrack?: (track: MusicTrackId) => void;
  onSelectBackgroundTheme?: (theme: BackgroundThemeId) => void;
  onToggleHighContrast: (enabled: boolean) => void;
  onToggleReducedMotion: (enabled: boolean) => void;
  onToggleHints: (enabled: boolean) => void;
  onToggleConfirmRestart: (enabled: boolean) => void;
  onGetHint?: () => void;
  onOpenStats?: () => void;
}

export class UIManager {
  private viewMenu: HTMLElement;
  private viewGame: HTMLElement;

  private currentScoreEl: HTMLElement;
  private bestScoreEl: HTMLElement;
  private scoreBoxEl: HTMLElement;
  private undoBtn: HTMLButtonElement;

  private winModal: HTMLElement;
  private gameOverModal: HTMLElement;
  private helpModal: HTMLElement;
  private settingsModal: HTMLElement;
  private confirmRestartModal: HTMLElement;
  private statsModal: HTMLElement;

  private hintBannerEl: HTMLElement;
  private hintTextEl: HTMLElement;
  private hintBtnEl: HTMLElement;

  private activeModalCloseTrap: (() => void) | null = null;
  private a11y: A11yAnnouncer;

  private confirmRestartCallback: (() => void) | null = null;
  private lastGameOverScore: number = 0;
  private hintResetTimer: number | null = null;

  constructor(callbacks: UIEventCallbacks) {
    this.a11y = A11yAnnouncer.getInstance();

    this.viewMenu = document.getElementById('view-menu')!;
    this.viewGame = document.getElementById('view-game')!;

    this.currentScoreEl = document.getElementById('current-score')!;
    this.bestScoreEl = document.getElementById('best-score')!;
    this.scoreBoxEl = document.getElementById('score-box')!;
    this.undoBtn = document.getElementById('btn-hud-undo') as HTMLButtonElement;

    this.winModal = document.getElementById('modal-win')!;
    this.gameOverModal = document.getElementById('modal-game-over')!;
    this.helpModal = document.getElementById('modal-help')!;
    this.settingsModal = document.getElementById('modal-settings')!;
    this.confirmRestartModal = document.getElementById('modal-confirm-restart')!;
    this.statsModal = document.getElementById('modal-stats')!;

    this.hintBannerEl = document.getElementById('hint-banner')!;
    this.hintTextEl = document.getElementById('hint-text')!;
    this.hintBtnEl = document.getElementById('btn-get-hint')!;

    this.initIcons();
    this.bindEvents(callbacks);
  }

  /**
   * Inject high-performance SVG vector icons into target placeholders.
   */
  private initIcons(): void {
    const setHtml = (id: string, svg: string) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = svg;
    };

    setHtml('icon-menu-play', Icons.play);
    setHtml('icon-menu-help', Icons.book);
    setHtml('icon-menu-stats', Icons.chart);
    setHtml('icon-menu-settings', Icons.settings);

    setHtml('icon-hud-crown', Icons.crown);
    setHtml('icon-hud-undo', Icons.undo);
    setHtml('icon-hud-restart', Icons.refresh);
    setHtml('icon-hud-settings', Icons.settings);
    setHtml('icon-hud-menu', Icons.pause);
    setHtml('icon-hint-bulb', Icons.bulb);

    setHtml('icon-go-header', Icons.heartBroken);
    setHtml('icon-go-restart', Icons.refresh);
    setHtml('icon-go-menu', Icons.home);
    setHtml('icon-go-share', Icons.share);

    setHtml('icon-win-header', Icons.trophy);
    setHtml('icon-win-continue', Icons.play);
    setHtml('icon-win-restart', Icons.refresh);
    setHtml('icon-win-menu', Icons.home);

    setHtml('icon-stats-header', Icons.chart);
    setHtml('icon-help-header', Icons.book);
    setHtml('guide-swipe-icon', Icons.swipe);

    setHtml('icon-stat-games', Icons.chart);
    setHtml('icon-stat-wins', Icons.trophy);
    setHtml('icon-stat-highest', Icons.crown);
    setHtml('icon-stat-best', Icons.chart);
  }

  // --- View Management ---

  public showMenu(): void {
    this.closeAllModals();
    this.viewGame.classList.remove('active');
    this.viewMenu.classList.add('active');
    this.a11y.announce('Main menu opened.');
  }

  public showGame(): void {
    this.closeAllModals();
    this.viewMenu.classList.remove('active');
    this.viewGame.classList.add('active');
    this.a11y.announce('Game started.');
  }

  public isGameViewActive(): boolean {
    return this.viewGame.classList.contains('active');
  }

  public setPlayButtonText(text: string): void {
    const textEl = document.getElementById('btn-menu-play-text');
    if (textEl) textEl.textContent = text;
  }

  // --- Event Binding ---

  private bindEvents(callbacks: UIEventCallbacks): void {
    // Main Menu Buttons
    document.getElementById('btn-menu-play')?.addEventListener('click', () => {
      this.showGame();
      callbacks.onPlay();
    });

    document.getElementById('btn-menu-help')?.addEventListener('click', () => {
      this.openModal(this.helpModal);
    });

    document.getElementById('btn-menu-stats')?.addEventListener('click', () => {
      if (callbacks.onOpenStats) {
        callbacks.onOpenStats();
      } else {
        this.openModal(this.statsModal);
      }
    });

    document.getElementById('btn-menu-settings')?.addEventListener('click', () => {
      this.openModal(this.settingsModal);
    });

    document.getElementById('btn-menu-bottom-settings')?.addEventListener('click', () => {
      this.openModal(this.settingsModal);
    });

    // Quick Menu Audio Toggle
    document.getElementById('btn-menu-audio-toggle')?.addEventListener('click', () => {
      const soundSwitch = document.getElementById('setting-sound') as HTMLInputElement;
      const newState = !soundSwitch.checked;
      soundSwitch.checked = newState;
      callbacks.onToggleSound(newState);
      this.updateMenuSoundIcon(newState);
    });

    // In-Game HUD Buttons
    this.undoBtn.addEventListener('click', () => callbacks.onUndo());

    document.getElementById('btn-hud-restart')?.addEventListener('click', () => {
      callbacks.onNewGame();
    });

    document.getElementById('btn-hud-settings')?.addEventListener('click', () => {
      this.openModal(this.settingsModal);
    });

    document.getElementById('btn-hud-menu')?.addEventListener('click', () => {
      this.showMenu();
    });

    // Hint triggers (Clicking either the banner or the pill)
    this.hintBannerEl.addEventListener('click', () => {
      if (callbacks.onGetHint) callbacks.onGetHint();
    });

    this.hintBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (callbacks.onGetHint) callbacks.onGetHint();
    });

    // Ambient Flow audio player pill in top-right desktop sidebar
    document.getElementById('btn-ambient-player')?.addEventListener('click', () => {
      const musicSwitch = document.getElementById('setting-music') as HTMLInputElement;
      const newState = !musicSwitch.checked;
      musicSwitch.checked = newState;
      callbacks.onToggleMusic(newState);
      this.setAudioWavePlaying(newState);
    });

    // Game Over Actions — Play Again directly starts fresh game without confirmation
    document.getElementById('btn-game-over-restart')?.addEventListener('click', () => {
      this.closeModal(this.gameOverModal);
      this.showGame();
      if (callbacks.onPlayAgain) {
        callbacks.onPlayAgain();
      } else {
        callbacks.onNewGame();
      }
    });

    document.getElementById('btn-game-over-menu')?.addEventListener('click', () => {
      this.closeModal(this.gameOverModal);
      this.showMenu();
    });

    document.getElementById('btn-game-over-share')?.addEventListener('click', () => {
      this.shareScore(this.lastGameOverScore);
    });

    // Win Modal Actions
    document.getElementById('btn-win-continue')?.addEventListener('click', () => {
      this.closeModal(this.winModal);
      callbacks.onContinue();
    });

    document.getElementById('btn-win-restart')?.addEventListener('click', () => {
      this.closeModal(this.winModal);
      if (callbacks.onPlayAgain) {
        callbacks.onPlayAgain();
      } else {
        callbacks.onNewGame();
      }
    });

    document.getElementById('btn-win-menu')?.addEventListener('click', () => {
      this.closeModal(this.winModal);
      this.showMenu();
    });

    // Confirm Restart Modal Actions
    document.getElementById('btn-confirm-restart-yes')?.addEventListener('click', () => {
      this.closeModal(this.confirmRestartModal);
      if (this.confirmRestartCallback) {
        this.confirmRestartCallback();
        this.confirmRestartCallback = null;
      }
    });

    document.getElementById('btn-confirm-restart-no')?.addEventListener('click', () => {
      this.closeModal(this.confirmRestartModal);
      this.confirmRestartCallback = null;
    });

    // Modal Close Buttons (.btn-close-modal)
    document.querySelectorAll('.btn-close-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = (btn as HTMLElement).closest('.modal-overlay') as HTMLElement;
        if (modal) this.closeModal(modal);
      });
    });

    // High Scores Tabs Switching
    this.setupStatsTabs();

    // --- Settings Panel Controls ---

    // Music Switch & Slider
    const musicSwitch = document.getElementById('setting-music') as HTMLInputElement;
    const musicSlider = document.getElementById('slider-music') as HTMLInputElement;
    const musicVolLabel = document.getElementById('label-music-vol') as HTMLElement;

    musicSwitch?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      callbacks.onToggleMusic(enabled);
    });

    musicSlider?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (musicVolLabel) musicVolLabel.textContent = `${val}%`;
      callbacks.onMusicVolume(val / 100);
    });

    // Sound Switch & Slider
    const soundSwitch = document.getElementById('setting-sound') as HTMLInputElement;
    const soundSlider = document.getElementById('slider-sound') as HTMLInputElement;
    const soundVolLabel = document.getElementById('label-sound-vol') as HTMLElement;

    soundSwitch?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      callbacks.onToggleSound(enabled);
      this.updateMenuSoundIcon(enabled);
    });

    soundSlider?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (soundVolLabel) soundVolLabel.textContent = `${val}%`;
      callbacks.onSoundVolume(val / 100);
    });

    // Display Toggles
    const contrastSwitch = document.getElementById('setting-contrast') as HTMLInputElement;
    contrastSwitch?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      callbacks.onToggleHighContrast(enabled);
      document.body.classList.toggle('high-contrast', enabled);
    });

    const motionSwitch = document.getElementById('setting-motion') as HTMLInputElement;
    motionSwitch?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      callbacks.onToggleReducedMotion(enabled);
      document.body.classList.toggle('reduced-motion', enabled);
    });

    // Game Options Toggles
    const hintsSwitch = document.getElementById('setting-hints') as HTMLInputElement;
    hintsSwitch?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      callbacks.onToggleHints(enabled);
      this.hintBtnEl.style.display = enabled ? 'inline-block' : 'none';
    });

    const confirmRestartSwitch = document.getElementById('setting-confirm-restart') as HTMLInputElement;
    confirmRestartSwitch?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      callbacks.onToggleConfirmRestart(enabled);
    });

    // Non-Copyright Music Soundtrack Selection
    document.querySelectorAll('#track-selector .track-select-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const track = (btn as HTMLElement).dataset.track as MusicTrackId;
        if (!track) return;
        this.setActiveMusicTrack(track);
        if (callbacks.onSelectMusicTrack) {
          callbacks.onSelectMusicTrack(track);
        }
      });
    });

    // Custom Background Theme Selection
    document.querySelectorAll('#theme-selector .theme-card-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = (btn as HTMLElement).dataset.theme as BackgroundThemeId;
        if (!theme) return;
        this.setActiveBackgroundTheme(theme);
        if (callbacks.onSelectBackgroundTheme) {
          callbacks.onSelectBackgroundTheme(theme);
        }
      });
    });

    // Keyboard Shortcuts (Escape to close modals)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // Dismiss modal on backdrop click
    [
      this.winModal,
      this.gameOverModal,
      this.helpModal,
      this.settingsModal,
      this.confirmRestartModal,
      this.statsModal,
    ].forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });
  }

  private setupStatsTabs(): void {
    const tabRecords = document.getElementById('tab-btn-records');
    const tabRecent = document.getElementById('tab-btn-recent');
    const tabOverall = document.getElementById('tab-btn-overall');

    const paneRecords = document.getElementById('pane-records');
    const paneRecent = document.getElementById('pane-recent');
    const paneOverall = document.getElementById('pane-overall');

    const selectTab = (activeTab: HTMLElement, activePane: HTMLElement) => {
      [tabRecords, tabRecent, tabOverall].forEach(t => t?.classList.remove('active'));
      [paneRecords, paneRecent, paneOverall].forEach(p => p?.classList.remove('active'));

      activeTab.classList.add('active');
      activePane.classList.add('active');
    };

    tabRecords?.addEventListener('click', () => {
      if (tabRecords && paneRecords) selectTab(tabRecords, paneRecords);
    });
    tabRecent?.addEventListener('click', () => {
      if (tabRecent && paneRecent) selectTab(tabRecent, paneRecent);
    });
    tabOverall?.addEventListener('click', () => {
      if (tabOverall && paneOverall) selectTab(tabOverall, paneOverall);
    });
  }

  // --- Dynamic UI State Updaters ---

  public updateScores(current: number, best: number, increment: number = 0): void {
    this.currentScoreEl.textContent = current.toLocaleString();
    this.bestScoreEl.textContent = best.toLocaleString();

    if (increment > 0) {
      this.showScoreIncrement(increment);
    }
  }

  private showScoreIncrement(increment: number): void {
    const pop = document.createElement('div');
    pop.className = 'score-addition';
    pop.textContent = `+${increment}`;
    this.scoreBoxEl.appendChild(pop);

    setTimeout(() => {
      pop.remove();
    }, 600);
  }

  public setUndoEnabled(enabled: boolean): void {
    this.undoBtn.disabled = !enabled;
  }

  public updateHint(text: string, isRecommendation: boolean = false): void {
    if (this.hintResetTimer) {
      clearTimeout(this.hintResetTimer);
      this.hintResetTimer = null;
    }

    this.hintTextEl.innerHTML = text;

    if (isRecommendation) {
      this.hintBannerEl.classList.add('hint-active');
      // Automatically reset after 4 seconds so old hint never stays stuck
      this.hintResetTimer = window.setTimeout(() => {
        this.resetHint();
      }, 4000);
    } else {
      this.hintBannerEl.classList.remove('hint-active');
    }
  }

  public resetHint(): void {
    if (this.hintResetTimer) {
      clearTimeout(this.hintResetTimer);
      this.hintResetTimer = null;
    }
    this.hintTextEl.innerHTML = 'Combine identical numbers to reach <span class="hint-highlight">2048!</span>';
    this.hintBannerEl.classList.remove('hint-active');
  }

  public updateSidebarStats(stats: GameStats, bestScore: number): void {
    const gamesEl = document.getElementById('sidebar-stat-games');
    if (gamesEl) gamesEl.textContent = stats.gamesPlayed.toLocaleString();

    const winsEl = document.getElementById('sidebar-stat-wins');
    if (winsEl) winsEl.textContent = stats.gamesWon.toLocaleString();

    const highestEl = document.getElementById('sidebar-stat-highest');
    if (highestEl) highestEl.textContent = (stats.highestTile || 2).toLocaleString();

    const bestEl = document.getElementById('sidebar-stat-best');
    if (bestEl) bestEl.textContent = bestScore.toLocaleString();
  }

  public setAudioWavePlaying(playing: boolean): void {
    const waveEl = document.getElementById('audio-wave-bars');
    if (waveEl) {
      if (playing) {
        waveEl.classList.remove('paused');
      } else {
        waveEl.classList.add('paused');
      }
    }
  }

  public setHintBannerVisible(visible: boolean): void {
    this.hintBannerEl.style.display = visible ? 'flex' : 'none';
  }

  public showGameOverModal(data: {
    score: number;
    bestScore: number;
    highestTile: number;
    moves: number;
  }): void {
    this.lastGameOverScore = data.score;

    const scoreVal = document.getElementById('go-score');
    if (scoreVal) scoreVal.textContent = data.score.toLocaleString();

    const bestVal = document.getElementById('go-best-score');
    if (bestVal) bestVal.textContent = data.bestScore.toLocaleString();

    const tileVal = document.getElementById('go-highest-tile');
    if (tileVal) {
      tileVal.textContent = data.highestTile.toString();
      tileVal.className = `tile-badge tile-${data.highestTile <= 2048 ? data.highestTile : 'super'}`;
    }

    const movesVal = document.getElementById('go-moves');
    if (movesVal) movesVal.textContent = data.moves.toLocaleString();

    // Encouraging quotes rotation
    const quotes = [
      '"Every game gets you closer!"',
      '"Great run! Ready for the 2048 fusion?"',
      '"Strategic moves build the highest cores."',
      '"Practice creates perfection — try again!"',
    ];
    const quoteEl = document.getElementById('go-quote');
    if (quoteEl) {
      quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    }

    this.openModal(this.gameOverModal);
  }

  public showWinModal(data: {
    score: number;
    moves: number;
    elapsedSeconds: number;
  }): void {
    const scoreVal = document.getElementById('win-score');
    if (scoreVal) scoreVal.textContent = data.score.toLocaleString();

    const movesVal = document.getElementById('win-moves');
    if (movesVal) movesVal.textContent = data.moves.toLocaleString();

    const timeVal = document.getElementById('win-time');
    if (timeVal) {
      const mins = Math.floor(data.elapsedSeconds / 60);
      const secs = data.elapsedSeconds % 60;
      timeVal.textContent = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    }

    this.openModal(this.winModal);
  }

  public showStatsModal(stats: {
    bestScore: number;
    highestTile: number;
    gamesPlayed: number;
    gamesWon: number;
  }, history: GameHistoryRecord[] = []): void {
    const bestEl = document.getElementById('stats-best-score');
    if (bestEl) bestEl.textContent = stats.bestScore.toLocaleString();

    const tileEl = document.getElementById('stats-highest-tile');
    if (tileEl) {
      tileEl.textContent = stats.highestTile.toString();
      tileEl.className = `tile-badge tile-${stats.highestTile <= 2048 ? stats.highestTile : 'super'}`;
    }

    const playedEl = document.getElementById('stats-games-played');
    if (playedEl) playedEl.textContent = stats.gamesPlayed.toLocaleString();

    const wonEl = document.getElementById('stats-games-won');
    if (wonEl) wonEl.textContent = stats.gamesWon.toLocaleString();

    const winRateEl = document.getElementById('stats-win-rate');
    if (winRateEl) {
      const rate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
      winRateEl.textContent = `${rate}%`;
    }

    // Populate Tab 1: Best Scores List
    const recordsTable = document.getElementById('table-best-scores');
    if (recordsTable) {
      const sortedRecords = [...history].sort((a, b) => b.score - a.score).slice(0, 5);
      if (sortedRecords.length === 0) {
        recordsTable.innerHTML = `
          <div class="scores-row">
            <span class="scores-rank rank-1">#1</span>
            <span class="scores-value">${stats.bestScore > 0 ? stats.bestScore.toLocaleString() : '0'}</span>
            <span class="scores-date">All-Time Best</span>
          </div>
        `;
      } else {
        recordsTable.innerHTML = sortedRecords.map((r, i) => `
          <div class="scores-row">
            <span class="scores-rank rank-${i + 1}">#${i + 1}</span>
            <span class="scores-value">${r.score.toLocaleString()}</span>
            <span class="tile-badge tile-${r.highestTile <= 2048 ? r.highestTile : 'super'}" style="margin-right: 8px;">${r.highestTile}</span>
            <span class="scores-date">${r.date}</span>
          </div>
        `).join('');
      }
    }

    // Populate Tab 2: Recent Games
    const recentTable = document.getElementById('table-recent-games');
    if (recentTable) {
      if (history.length === 0) {
        recentTable.innerHTML = `<div class="scores-empty">No games recorded yet. Play a run to track history!</div>`;
      } else {
        recentTable.innerHTML = history.slice(0, 6).map((r) => `
          <div class="scores-row">
            <span class="scores-value" style="margin-left: 0;">${r.score.toLocaleString()}</span>
            <span class="tile-badge tile-${r.highestTile <= 2048 ? r.highestTile : 'super'}" style="margin-right: 8px;">${r.highestTile}</span>
            <span class="scores-date">${r.moves} moves • ${r.date}</span>
          </div>
        `).join('');
      }
    }

    this.openModal(this.statsModal);
  }

  private shareScore(score: number): void {
    const text = `I scored ${score.toLocaleString()} points in 2048 Fusion! Can you beat my high score?`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: '2048 Fusion',
        text,
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${text} ${window.location.href}`).then(() => {
        this.a11y.announce('Score copied to clipboard!');
        const shareBtn = document.getElementById('btn-game-over-share');
        if (shareBtn) {
          const original = shareBtn.innerHTML;
          shareBtn.textContent = 'Copied!';
          setTimeout(() => {
            shareBtn.innerHTML = original;
          }, 1500);
        }
      }).catch(() => {});
    }
  }

  public confirmRestart(onConfirm: () => void): void {
    this.confirmRestartCallback = onConfirm;
    this.openModal(this.confirmRestartModal);
  }

  public updateMenuSoundIcon(enabled: boolean): void {
    const icon = document.getElementById('menu-sound-icon');
    if (!icon) return;
    if (enabled) {
      icon.innerHTML = `
        <path d="M11 5L6 9H2V15H6L11 19V5Z"/>
        <path d="M15.54 8.46C16.48 9.4 17 10.66 17 12C17 13.34 16.48 14.6 15.54 15.54"/>
      `;
    } else {
      icon.innerHTML = `
        <path d="M11 5L6 9H2V15H6L11 19V5Z"/>
        <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"/>
        <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"/>
      `;
    }
  }

  // --- Modal Helpers ---

  public openModal(modal: HTMLElement): void {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    this.activeModalCloseTrap = this.a11y.trapFocus(modal);
  }

  public closeModal(modal: HTMLElement): void {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    if (this.activeModalCloseTrap) {
      this.activeModalCloseTrap();
      this.activeModalCloseTrap = null;
    }
  }

  public closeAllModals(): void {
    [
      this.winModal,
      this.gameOverModal,
      this.helpModal,
      this.settingsModal,
      this.confirmRestartModal,
      this.statsModal,
    ].forEach((m) => {
      this.closeModal(m);
    });
  }

  public isAnyModalOpen(): boolean {
    return [
      this.winModal,
      this.gameOverModal,
      this.helpModal,
      this.settingsModal,
      this.confirmRestartModal,
      this.statsModal,
    ].some((m) => m.classList.contains('active'));
  }

  public setActiveMusicTrack(track: MusicTrackId, trackName?: string): void {
    document.querySelectorAll('#track-selector .track-select-btn').forEach((btn) => {
      const isMatch = (btn as HTMLElement).dataset.track === track;
      btn.classList.toggle('active', isMatch);
    });
    const ambientPillTitle = document.getElementById('ambient-pill-title');
    if (ambientPillTitle) {
      const name = trackName || (
        track === 'cyber_pulse' ? 'Cyber Pulse :' :
        track === 'starlight_zen' ? 'Starlight Zen :' :
        track === 'deep_focus' ? 'Deep Focus :' :
        'Ambient Flow :'
      );
      ambientPillTitle.textContent = name;
    }
  }

  public setActiveBackgroundTheme(theme: BackgroundThemeId): void {
    document.querySelectorAll('#theme-selector .theme-card-btn').forEach((btn) => {
      const isMatch = (btn as HTMLElement).dataset.theme === theme;
      btn.classList.toggle('active', isMatch);
    });
    document.body.classList.remove(
      'theme-cosmic', 'theme-cosmic_horizon',
      'theme-nebula', 'theme-nebula_dream',
      'theme-aurora', 'theme-midnight_aurora',
      'theme-void', 'theme-deep_void'
    );
    document.body.classList.add(`theme-${theme}`);
  }
}
