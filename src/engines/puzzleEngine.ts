import { IGameEngine, GameEngineContext } from './types';
import { audio } from '../core/audio';

export class PuzzleEngine implements IGameEngine {
  private mode: string = '2048';
  private score: number = 0;
  private isGameOver: boolean = false;
  private hasWon: boolean = false;

  // 2048 state
  private grid2048: number[][] = [];

  // Minesweeper state
  private mineGrid: { isMine: boolean; revealed: boolean; flagged: boolean; neighborCount: number }[][] = [];
  private mineCols = 9;
  private mineRows = 9;
  private totalMines = 10;

  // Match 3 state
  private match3Grid: number[][] = [];
  private selectedGem: { r: number; c: number } | null = null;

  // Lights Out state
  private lightsGrid: boolean[][] = [];

  public init(context: GameEngineContext) {
    this.mode = context.game.id;
    this.score = 0;
    this.isGameOver = false;
    this.hasWon = false;

    if (this.mode === '2048' || this.mode === 'number-merge') {
      this.init2048();
    } else if (this.mode === 'minesweeper') {
      this.initMinesweeper();
    } else if (this.mode === 'match-3' || this.mode === 'tile-master' || this.mode === 'color-match') {
      this.initMatch3();
    } else if (this.mode === 'lights-out' || this.mode === 'pattern-lock') {
      this.initLightsOut();
    } else {
      // Default to 2048 mechanics
      this.init2048();
    }

    audio.startBackgroundMusic('puzzle');
  }

  // --- 2048 LOGIC ---
  private init2048() {
    this.grid2048 = Array.from({ length: 4 }, () => Array(4).fill(0));
    this.spawn2048Tile();
    this.spawn2048Tile();
  }

  private spawn2048Tile() {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.grid2048[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length > 0) {
      const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.grid2048[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  private slide2048(direction: 'left' | 'right' | 'up' | 'down', context: GameEngineContext): boolean {
    let moved = false;

    const slideRow = (row: number[]) => {
      let filtered = row.filter((val) => val !== 0);
      for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] === filtered[i + 1]) {
          filtered[i] *= 2;
          this.score += filtered[i];
          filtered[i + 1] = 0;
          audio.playScore();
          if (filtered[i] === 2048) {
            context.unlockAchievement('puzzle-master');
          }
        }
      }
      filtered = filtered.filter((val) => val !== 0);
      while (filtered.length < 4) filtered.push(0);
      return filtered;
    };

    if (direction === 'left') {
      for (let r = 0; r < 4; r++) {
        const original = [...this.grid2048[r]];
        this.grid2048[r] = slideRow(this.grid2048[r]);
        if (original.some((v, i) => v !== this.grid2048[r][i])) moved = true;
      }
    } else if (direction === 'right') {
      for (let r = 0; r < 4; r++) {
        const original = [...this.grid2048[r]];
        this.grid2048[r] = slideRow(this.grid2048[r].reverse()).reverse();
        if (original.some((v, i) => v !== this.grid2048[r][i])) moved = true;
      }
    } else if (direction === 'up') {
      for (let c = 0; c < 4; c++) {
        const col = [this.grid2048[0][c], this.grid2048[1][c], this.grid2048[2][c], this.grid2048[3][c]];
        const newCol = slideRow(col);
        for (let r = 0; r < 4; r++) {
          if (this.grid2048[r][c] !== newCol[r]) moved = true;
          this.grid2048[r][c] = newCol[r];
        }
      }
    } else if (direction === 'down') {
      for (let c = 0; c < 4; c++) {
        const col = [this.grid2048[3][c], this.grid2048[2][c], this.grid2048[1][c], this.grid2048[0][c]];
        const newCol = slideRow(col);
        for (let r = 0; r < 4; r++) {
          if (this.grid2048[3 - r][c] !== newCol[r]) moved = true;
          this.grid2048[3 - r][c] = newCol[r];
        }
      }
    }

    if (moved) {
      this.spawn2048Tile();
      context.onScoreUpdate(this.score);
      audio.playClick();
    }
    return moved;
  }

  // --- MINESWEEPER LOGIC ---
  private initMinesweeper() {
    this.mineGrid = Array.from({ length: this.mineRows }, () =>
      Array.from({ length: this.mineCols }, () => ({
        isMine: false,
        revealed: false,
        flagged: false,
        neighborCount: 0
      }))
    );

    // Plant random mines
    let planted = 0;
    while (planted < this.totalMines) {
      const r = Math.floor(Math.random() * this.mineRows);
      const c = Math.floor(Math.random() * this.mineCols);
      if (!this.mineGrid[r][c].isMine) {
        this.mineGrid[r][c].isMine = true;
        planted++;
      }
    }

    // Count neighbors
    for (let r = 0; r < this.mineRows; r++) {
      for (let c = 0; c < this.mineCols; c++) {
        if (!this.mineGrid[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < this.mineRows && nc >= 0 && nc < this.mineCols && this.mineGrid[nr][nc].isMine) {
                count++;
              }
            }
          }
          this.mineGrid[r][c].neighborCount = count;
        }
      }
    }
  }

  private revealMineCell(r: number, c: number, context: GameEngineContext) {
    if (r < 0 || r >= this.mineRows || c < 0 || c >= this.mineCols) return;
    const cell = this.mineGrid[r][c];
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    if (cell.isMine) {
      audio.playExplosion();
      this.isGameOver = true;
      context.onGameOver(this.score, false);
      return;
    }

    this.score += 20;
    context.onScoreUpdate(this.score);
    audio.playClick();

    if (cell.neighborCount === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          this.revealMineCell(r + dr, c + dc, context);
        }
      }
    }

    // Check victory
    let unrevealedSafe = 0;
    for (let row = 0; row < this.mineRows; row++) {
      for (let col = 0; col < this.mineCols; col++) {
        if (!this.mineGrid[row][col].isMine && !this.mineGrid[row][col].revealed) {
          unrevealedSafe++;
        }
      }
    }
    if (unrevealedSafe === 0) {
      this.hasWon = true;
      audio.playVictory();
      context.unlockAchievement('puzzle-master');
      context.onGameOver(this.score + 500, true);
    }
  }

  // --- MATCH 3 LOGIC ---
  private initMatch3() {
    this.match3Grid = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => Math.floor(Math.random() * 5) + 1)
    );
    this.selectedGem = null;
  }

  // --- LIGHTS OUT LOGIC ---
  private initLightsOut() {
    this.lightsGrid = Array.from({ length: 5 }, () => Array(5).fill(false));
    // Toggle random pattern
    for (let i = 0; i < 8; i++) {
      const r = Math.floor(Math.random() * 5);
      const c = Math.floor(Math.random() * 5);
      this.toggleLight(r, c);
    }
  }

  private toggleLight(r: number, c: number) {
    const coords = [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    coords.forEach(([row, col]) => {
      if (row >= 0 && row < 5 && col >= 0 && col < 5) {
        this.lightsGrid[row][col] = !this.lightsGrid[row][col];
      }
    });
  }

  // Cooldown flag to prevent continuous triggering on held key
  private keyDebounce = false;

  public update(_dt: number, context: GameEngineContext) {
    if (this.isGameOver || this.hasWon) return;

    const input = context.playerInputs[0];
    if (!input) return;

    // Arrow keys for 2048
    if (this.mode === '2048' || this.mode === 'number-merge') {
      const anyDirection = input.left || input.right || input.up || input.down;
      if (anyDirection && !this.keyDebounce) {
        this.keyDebounce = true;
        if (input.left) this.slide2048('left', context);
        else if (input.right) this.slide2048('right', context);
        else if (input.up) this.slide2048('up', context);
        else if (input.down) this.slide2048('down', context);
      } else if (!anyDirection) {
        this.keyDebounce = false;
      }
    }
  }

  public render(context: GameEngineContext) {
    const { ctx, width, height } = context;

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    if (this.mode === '2048' || this.mode === 'number-merge') {
      this.render2048(ctx, width, height);
    } else if (this.mode === 'minesweeper') {
      this.renderMinesweeper(ctx, width, height);
    } else if (this.mode === 'match-3' || this.mode === 'tile-master' || this.mode === 'color-match') {
      this.renderMatch3(ctx, width, height);
    } else {
      this.renderLightsOut(ctx, width, height);
    }
  }

  private render2048(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const boardSize = Math.min(width, height) * 0.75;
    const startX = (width - boardSize) / 2;
    const startY = (height - boardSize) / 2;
    const cellSize = (boardSize - 40) / 4;

    // Board container
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(startX, startY, boardSize, boardSize, 16);
    ctx.fill();

    const colors: Record<number, { bg: string; text: string }> = {
      2: { bg: '#e2e8f0', text: '#0f172a' },
      4: { bg: '#bae6fd', text: '#0f172a' },
      8: { bg: '#38bdf8', text: '#ffffff' },
      16: { bg: '#60a5fa', text: '#ffffff' },
      32: { bg: '#818cf8', text: '#ffffff' },
      64: { bg: '#a855f7', text: '#ffffff' },
      128: { bg: '#c084fc', text: '#ffffff' },
      256: { bg: '#f43f5e', text: '#ffffff' },
      512: { bg: '#fbbf24', text: '#ffffff' },
      1024: { bg: '#eab308', text: '#ffffff' },
      2048: { bg: '#10b981', text: '#ffffff' }
    };

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = this.grid2048[r][c];
        const cx = startX + 10 + c * (cellSize + 8);
        const cy = startY + 10 + r * (cellSize + 8);

        ctx.fillStyle = val > 0 ? (colors[val]?.bg || '#10b981') : '#0f172a';
        ctx.beginPath();
        ctx.roundRect(cx, cy, cellSize, cellSize, 10);
        ctx.fill();

        if (val > 0) {
          ctx.fillStyle = colors[val]?.text || '#ffffff';
          ctx.font = `bold ${val >= 1000 ? 20 : 28}px "Chakra Petch", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${val}`, cx + cellSize / 2, cy + cellSize / 2);
        }
      }
    }

    // Top instructions
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`2048 - SCORE: ${this.score}`, width / 2, startY - 20);
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Swipe or use Arrow Keys / WASD to merge tiles', width / 2, startY + boardSize + 28);
  }

  private renderMinesweeper(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cellSize = 36;
    const startX = (width - this.mineCols * cellSize) / 2;
    const startY = (height - this.mineRows * cellSize) / 2;

    for (let r = 0; r < this.mineRows; r++) {
      for (let c = 0; c < this.mineCols; c++) {
        const cell = this.mineGrid[r][c];
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;

        ctx.fillStyle = cell.revealed ? '#1e293b' : '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeRect(x, y, cellSize, cellSize);

        if (cell.revealed) {
          if (cell.isMine) {
            ctx.fillStyle = '#f43f5e';
            ctx.font = '18px system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', x + cellSize / 2, y + cellSize / 2);
          } else if (cell.neighborCount > 0) {
            const numColors = ['', '#38bdf8', '#4ade80', '#f87171', '#818cf8', '#fb923c'];
            ctx.fillStyle = numColors[cell.neighborCount] || '#ffffff';
            ctx.font = 'bold 16px "Chakra Petch", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${cell.neighborCount}`, x + cellSize / 2, y + cellSize / 2);
          }
        }
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`MINESWEEPER - MINES: ${this.totalMines}`, width / 2, startY - 20);
  }

  private renderMatch3(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cellSize = 42;
    const startX = (width - 8 * cellSize) / 2;
    const startY = (height - 8 * cellSize) / 2;
    const gemColors = ['', '#f43f5e', '#38bdf8', '#fbbf24', '#4ade80', '#a855f7'];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const gem = this.match3Grid[r][c];
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

        if (gem > 0) {
          ctx.fillStyle = gemColors[gem] || '#ffffff';
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`MATCH 3 - SCORE: ${this.score}`, width / 2, startY - 20);
  }

  private renderLightsOut(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cellSize = 54;
    const startX = (width - 5 * cellSize) / 2;
    const startY = (height - 5 * cellSize) / 2;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const on = this.lightsGrid[r][c];
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;

        ctx.fillStyle = on ? '#38bdf8' : '#1e293b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 8);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LIGHTS OUT - TURN OFF ALL LIGHTS', width / 2, startY - 20);
  }

  public destroy() {
    audio.stopAll();
  }
}
