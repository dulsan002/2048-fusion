import { Direction } from '../core/Types';

export type MoveHandler = (direction: Direction) => void;
export type ActionHandler = () => void;

export class InputManager {
  private moveHandlers: MoveHandler[] = [];
  private restartHandlers: ActionHandler[] = [];
  private pauseHandlers: ActionHandler[] = [];
  private undoHandlers: ActionHandler[] = [];

  private isEnabled: boolean = true;
  private isLocked: boolean = false;
  private minSwipeDistance: number = 30;

  // Pointer / Touch tracking
  private startX: number = 0;
  private startY: number = 0;
  private isPointerDown: boolean = false;
  private hasMovedInGesture: boolean = false;

  private boundKeyHandler: (e: KeyboardEvent) => void;
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundPointerCancel: () => void;

  constructor(targetElement?: HTMLElement) {
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundPointerCancel = this.handlePointerCancel.bind(this);

    this.attach(targetElement);
  }

  public attach(targetElement?: HTMLElement): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', this.boundKeyHandler);

    const el = targetElement || document.body;
    el.addEventListener('pointerdown', this.boundPointerDown, { passive: false });
    window.addEventListener('pointermove', this.boundPointerMove, { passive: false });
    window.addEventListener('pointerup', this.boundPointerUp, { passive: true });
    window.addEventListener('pointercancel', this.boundPointerCancel, { passive: true });
  }

  public detach(targetElement?: HTMLElement): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('keydown', this.boundKeyHandler);

    const el = targetElement || document.body;
    el.removeEventListener('pointerdown', this.boundPointerDown);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointercancel', this.boundPointerCancel);
  }

  public onMove(handler: MoveHandler): void {
    this.moveHandlers.push(handler);
  }

  public onRestart(handler: ActionHandler): void {
    this.restartHandlers.push(handler);
  }

  public onPause(handler: ActionHandler): void {
    this.pauseHandlers.push(handler);
  }

  public onUndo(handler: ActionHandler): void {
    this.undoHandlers.push(handler);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public setLocked(locked: boolean): void {
    this.isLocked = locked;
  }

  private triggerMove(direction: Direction): void {
    if (!this.isEnabled || this.isLocked) return;
    for (const handler of this.moveHandlers) {
      handler(direction);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // If typing in an input or modal is active, ignore game controls
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return;
    }

    if (!this.isEnabled) return;

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        e.preventDefault();
        this.triggerMove('UP');
        break;

      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.triggerMove('DOWN');
        break;

      case 'ArrowLeft':
      case 'KeyA':
        e.preventDefault();
        this.triggerMove('LEFT');
        break;

      case 'ArrowRight':
      case 'KeyD':
        e.preventDefault();
        this.triggerMove('RIGHT');
        break;

      case 'KeyR':
        this.restartHandlers.forEach(h => h());
        break;

      case 'KeyP':
      case 'Escape':
        this.pauseHandlers.forEach(h => h());
        break;

      case 'KeyU':
        this.undoHandlers.forEach(h => h());
        break;
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    // Only primary button
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Check if target is a button or interactive element
    const target = e.target as HTMLElement | null;
    if (target && (target.closest('button') || target.closest('a') || target.closest('.modal-content'))) {
      return;
    }

    this.isPointerDown = true;
    this.hasMovedInGesture = false;
    this.startX = e.clientX;
    this.startY = e.clientY;
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isPointerDown || this.hasMovedInGesture) return;

    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX >= this.minSwipeDistance || absY >= this.minSwipeDistance) {
      e.preventDefault();
      this.hasMovedInGesture = true;

      if (absX > absY) {
        // Horizontal move
        this.triggerMove(deltaX > 0 ? 'RIGHT' : 'LEFT');
      } else {
        // Vertical move
        this.triggerMove(deltaY > 0 ? 'DOWN' : 'UP');
      }
    }
  }

  private handlePointerUp(): void {
    this.isPointerDown = false;
    this.hasMovedInGesture = false;
  }

  private handlePointerCancel(): void {
    this.isPointerDown = false;
    this.hasMovedInGesture = false;
  }
}
