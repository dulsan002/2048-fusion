export class A11yAnnouncer {
  private static instance: A11yAnnouncer;
  private liveRegion: HTMLElement | null = null;

  private constructor() {
    this.createLiveRegion();
  }

  public static getInstance(): A11yAnnouncer {
    if (!A11yAnnouncer.instance) {
      A11yAnnouncer.instance = new A11yAnnouncer();
    }
    return A11yAnnouncer.instance;
  }

  private createLiveRegion(): void {
    if (typeof document === 'undefined') return;

    let el = document.getElementById('a11y-live-region');
    if (!el) {
      el = document.createElement('div');
      el.id = 'a11y-live-region';
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      el.className = 'sr-only';
      document.body.appendChild(el);
    }
    this.liveRegion = el;
  }

  public announce(message: string): void {
    if (!this.liveRegion) return;
    // Clear and set to ensure screen readers pick up duplicate text
    this.liveRegion.textContent = '';
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    }, 50);
  }

  public announceMove(scoreIncrement: number, highestTile: number): void {
    if (scoreIncrement > 0) {
      this.announce(`Merged tiles for plus ${scoreIncrement} points. Highest tile: ${highestTile}.`);
    } else {
      this.announce('Tiles shifted.');
    }
  }

  public announceWin(): void {
    this.announce('Congratulations! You reached the 2048 Fusion Core!');
  }

  public announceGameOver(finalScore: number): void {
    this.announce(`Game over. No more moves available. Final score: ${finalScore}.`);
  }

  public prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Traps focus inside a modal dialog for keyboard accessibility.
   */
  public trapFocus(modal: HTMLElement): () => void {
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) {
      firstElement.focus();
    }

    const keyListener = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', keyListener);

    return () => {
      modal.removeEventListener('keydown', keyListener);
    };
  }
}
