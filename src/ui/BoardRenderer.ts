import { Board } from '../core/Board';
import { MoveResult } from '../core/Types';

interface DomTile {
  id: number;
  value: number;
  row: number;
  col: number;
  element: HTMLElement;
  innerElement: HTMLElement;
}

export class BoardRenderer {
  private boardContainer: HTMLElement;
  private tileContainer: HTMLElement;
  private tiles: Map<number, DomTile> = new Map();
  private nextId: number = 1000;

  private cellSize: number = 0;
  private gridGap: number = 12;

  constructor(boardContainer: HTMLElement, tileContainer: HTMLElement) {
    this.boardContainer = boardContainer;
    this.tileContainer = tileContainer;

    this.calculateDimensions();
    window.addEventListener('resize', () => {
      this.calculateDimensions();
      this.repositionAllTiles();
    });

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            this.calculateDimensions();
            this.repositionAllTiles();
          }
        }
      });
      ro.observe(this.boardContainer);
    }
  }

  public calculateDimensions(): void {
    const width = this.tileContainer.clientWidth || (this.boardContainer.clientWidth - (this.gridGap * 2));
    if (width <= 0) return;
    const computed = window.getComputedStyle(this.boardContainer);
    const gap = parseFloat(computed.getPropertyValue('--grid-gap')) || 12;
    this.gridGap = gap;
    this.cellSize = (width - 3 * this.gridGap) / 4;
  }

  private getPositionPixels(row: number, col: number): { x: number; y: number } {
    return {
      x: col * (this.cellSize + this.gridGap),
      y: row * (this.cellSize + this.gridGap),
    };
  }

  public clear(): void {
    this.tileContainer.innerHTML = '';
    this.tiles.clear();
  }

  public renderInitial(board: Board): void {
    this.clear();
    this.calculateDimensions();

    for (let r = 0; r < board.size; r++) {
      for (let c = 0; c < board.size; c++) {
        const val = board.get(r, c);
        if (val > 0) {
          this.createTileElement(this.nextId++, val, r, c, true);
        }
      }
    }
  }

  public renderMove(result: MoveResult, board: Board): void {
    this.calculateDimensions();

    // Reconcile and render the updated board
    // Clear and redraw with animation states
    this.renderInitial(board);

    // Apply animation classes
    if (result.spawnedTile) {
      // Find the spawned tile element
      for (const tile of this.tiles.values()) {
        if (tile.row === result.spawnedTile.row && tile.col === result.spawnedTile.col && tile.value === result.spawnedTile.value) {
          tile.element.classList.add('tile-new');
        }
      }
    }

    // Mark merged tiles with pulse
    for (const step of result.steps) {
      if (step.mergedWith && step.resultingValue) {
        for (const tile of this.tiles.values()) {
          if (tile.row === step.to.row && tile.col === step.to.col && tile.value === step.resultingValue) {
            tile.element.classList.add('tile-merged');
          }
        }
      }
    }
  }

  public createTileElement(
    id: number,
    value: number,
    row: number,
    col: number,
    isNew: boolean = false
  ): DomTile {
    const el = document.createElement('div');
    el.className = `tile ${this.getTileValueClass(value)}`;
    if (isNew) {
      el.classList.add('tile-new');
    }

    const inner = document.createElement('div');
    inner.className = 'tile-inner';
    inner.textContent = value.toString();
    inner.setAttribute('aria-hidden', 'true'); // Live region handles screen reading
    el.appendChild(inner);

    el.style.width = `${this.cellSize}px`;
    el.style.height = `${this.cellSize}px`;

    const { x, y } = this.getPositionPixels(row, col);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    this.tileContainer.appendChild(el);

    const domTile: DomTile = {
      id,
      value,
      row,
      col,
      element: el,
      innerElement: inner,
    };

    this.tiles.set(id, domTile);
    return domTile;
  }

  private repositionAllTiles(): void {
    for (const tile of this.tiles.values()) {
      tile.element.style.width = `${this.cellSize}px`;
      tile.element.style.height = `${this.cellSize}px`;
      const { x, y } = this.getPositionPixels(tile.row, tile.col);
      tile.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  }

  public shake(): void {
    this.boardContainer.classList.remove('board-shake');
    // Trigger reflow
    void this.boardContainer.offsetWidth;
    this.boardContainer.classList.add('board-shake');
  }

  private getTileValueClass(value: number): string {
    if (value <= 2048) {
      return `tile-${value}`;
    }
    return 'tile-super';
  }
}
