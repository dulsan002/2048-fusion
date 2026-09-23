import { A11yAnnouncer } from './A11yAnnouncer';

export interface UIEventCallbacks {
  onNewGame: () => void;
  onUndo: () => void;
  onContinue: () => void;
  onToggleSound: (enabled: boolean) => void;
  onToggleMusic: (enabled: boolean) => void;
  onToggleHighContrast: (enabled: boolean) => void;
  onToggleReducedMotion: (enabled: boolean) => void;
}

export class UIManager {
  private currentScoreEl: HTMLElement;
  private bestScoreEl: HTMLElement;
  private scoreBoxEl: HTMLElement;
  private undoBtn: HTMLButtonElement;
  private soundBtn: HTMLButtonElement;
  private soundIcon: HTMLElement;

  private winModal: HTMLElement;
  private gameOverModal: HTMLElement;
  private helpModal: HTMLElement;
  private settingsModal: HTMLElement;

  private activeModalCloseTrap: (() => void) | null = null;
  private a11y: A11yAnnouncer;

  constructor(callbacks: UIEventCallbacks) {
    this.a11y = A11yAnnouncer.getInstance();

    this.currentScoreEl = document.getElementById('current-score')!;
    this.bestScoreEl = document.getElementById('best-score')!;
    this.scoreBoxEl = document.getElementById('score-box')!;
    this.undoBtn = document.getElementById('btn-undo') as HTMLButtonElement;
    this.soundBtn = document.getElementById('btn-sound') as HTMLButtonElement;
    this.soundIcon = document.getElementById('sound-icon')!;

    this.winModal = document.getElementById('modal-win')!;
    this.gameOverModal = document.getElementById('modal-game-over')!;
    this.helpModal = document.getElementById('modal-help')!;
    this.settingsModal = document.getElementById('modal-settings')!;

    this.bindEvents(callbacks);
  }

  private bindEvents(callbacks: UIEventCallbacks): void {
    // Top bar buttons
    document.getElementById('btn-new-game')?.addEventListener('click', () => callbacks.onNewGame());
    this.undoBtn.addEventListener('click', () => callbacks.onUndo());
    document.getElementById('btn-help')?.addEventListener('click', () => this.openModal(this.helpModal));
    document.getElementById('btn-settings')?.addEventListener('click', () => this.openModal(this.settingsModal));

    // Sound toggle
    this.soundBtn.addEventListener('click', () => {
      const isMuted = this.soundBtn.classList.toggle('muted');
      callbacks.onToggleSound(!isMuted);
      this.updateSoundIcon(!isMuted);
    });

    // Win Modal actions
    document.getElementById('btn-win-continue')?.addEventListener('click', () => {
      this.closeModal(this.winModal);
      callbacks.onContinue();
    });
    document.getElementById('btn-win-restart')?.addEventListener('click', () => {
      this.closeModal(this.winModal);
      callbacks.onNewGame();
    });

    // Game Over Modal actions
    document.getElementById('btn-game-over-restart')?.addEventListener('click', () => {
      this.closeModal(this.gameOverModal);
      callbacks.onNewGame();
    });

    // Modal Close Buttons
    document.querySelectorAll('.btn-close-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = (btn as HTMLElement).closest('.modal-overlay') as HTMLElement;
        if (modal) this.closeModal(modal);
      });
    });

    // Settings switches
    const musicSwitch = document.getElementById('setting-music') as HTMLInputElement;
    musicSwitch?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      callbacks.onToggleMusic(enabled);
    });

    const soundSwitch = document.getElementById('setting-sound') as HTMLInputElement;
    soundSwitch?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      callbacks.onToggleSound(enabled);
      this.updateSoundIcon(enabled);
    });

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

    // Close on Escape or click outside
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    [this.winModal, this.gameOverModal, this.helpModal, this.settingsModal].forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });
  }

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

  public updateSoundIcon(enabled: boolean): void {
    if (enabled) {
      this.soundBtn.classList.remove('muted');
      this.soundIcon.innerHTML = `
        <path d="M11 5L6 9H2V15H6L11 19V5Z"/>
        <path d="M15.54 8.46C16.48 9.4 17 10.66 17 12C17 13.34 16.48 14.6 15.54 15.54"/>
        <path d="M19.07 4.93C20.95 6.81 22 9.34 22 12C22 14.66 20.95 17.19 19.07 19.07"/>
      `;
    } else {
      this.soundBtn.classList.add('muted');
      this.soundIcon.innerHTML = `
        <path d="M11 5L6 9H2V15H6L11 19V5Z"/>
        <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"/>
        <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"/>
      `;
    }
  }

  public showWinModal(): void {
    this.openModal(this.winModal);
  }

  public showGameOverModal(finalScore: number): void {
    const scoreVal = document.getElementById('game-over-final-score');
    if (scoreVal) scoreVal.textContent = finalScore.toLocaleString();
    this.openModal(this.gameOverModal);
  }

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
    [this.winModal, this.gameOverModal, this.helpModal, this.settingsModal].forEach((m) => {
      this.closeModal(m);
    });
  }

  public isAnyModalOpen(): boolean {
    return [this.winModal, this.gameOverModal, this.helpModal, this.settingsModal].some((m) =>
      m.classList.contains('active')
    );
  }
}
