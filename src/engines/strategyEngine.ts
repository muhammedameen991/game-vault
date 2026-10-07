import { IGameEngine, GameEngineContext } from './types';
import { audio } from '../core/audio';

interface Building {
  r: number;
  c: number;
  type: 'farm' | 'barracks' | 'tower' | 'mine';
  level: number;
}

export class StrategyEngine implements IGameEngine {
  private resources = { gold: 120, energy: 50, food: 80 };
  private grid: (Building | null)[][] = [];
  private selectedBuildType: 'farm' | 'barracks' | 'tower' | 'mine' = 'farm';
  private cursor = { r: 3, c: 3 };
  private waveTimer: number = 25;
  private waveCount: number = 1;
  private keyDebounce = false;

  public init(_context: GameEngineContext) {
    this.resources = { gold: 150, energy: 60, food: 100 };
    this.grid = Array.from({ length: 7 }, () => Array(9).fill(null));
    this.cursor = { r: 3, c: 4 };
    this.waveTimer = 25;
    this.waveCount = 1;
    this.selectedBuildType = 'farm';

    // Place initial Town Center / Farm
    this.grid[3][4] = { r: 3, c: 4, type: 'farm', level: 1 };
    audio.startBackgroundMusic('chill');
  }

  public update(dt: number, context: GameEngineContext) {
    // Resource tick
    this.resources.gold += 3 * dt;
    this.resources.energy += 2 * dt;
    this.resources.food += 2 * dt;

    // Wave countdown
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.waveTimer = 30;
      this.waveCount++;
      // Tower defense battle check
      let towerCount = 0;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 9; c++) {
          if (this.grid[r][c]?.type === 'tower') towerCount++;
        }
      }
      if (towerCount >= this.waveCount - 1) {
        audio.playScore();
        context.unlockAchievement('first-win');
      } else {
        // Penalty
        this.resources.gold = Math.max(0, this.resources.gold - 50);
        audio.playExplosion();
      }
    }

    const input = context.playerInputs[0];
    if (input) {
      const anyAction = input.up || input.down || input.left || input.right || input.action1 || input.action2;
      if (anyAction && !this.keyDebounce) {
        this.keyDebounce = true;
        if (input.up) this.cursor.r = Math.max(0, this.cursor.r - 1);
        if (input.down) this.cursor.r = Math.min(6, this.cursor.r + 1);
        if (input.left) this.cursor.c = Math.max(0, this.cursor.c - 1);
        if (input.right) this.cursor.c = Math.min(8, this.cursor.c + 1);

        // Cycle building type with action2
        if (input.action2) {
          const types: ('farm' | 'barracks' | 'tower' | 'mine')[] = ['farm', 'barracks', 'tower', 'mine'];
          const idx = types.indexOf(this.selectedBuildType);
          this.selectedBuildType = types[(idx + 1) % types.length];
          audio.playClick();
        }

        // Build with action1
        if (input.action1) {
          this.tryBuild(this.cursor.r, this.cursor.c, context);
        }
      } else if (!anyAction) {
        this.keyDebounce = false;
      }
    }

    const totalScore = Math.floor(this.resources.gold + this.waveCount * 500);
    context.onScoreUpdate(totalScore);
  }

  private tryBuild(r: number, c: number, _context: GameEngineContext) {
    if (this.grid[r][c] !== null) return;
    const cost = 40;
    if (this.resources.gold >= cost) {
      this.resources.gold -= cost;
      this.grid[r][c] = { r, c, type: this.selectedBuildType, level: 1 };
      audio.playClick();
    }
  }

  public render(context: GameEngineContext) {
    const { ctx, width, height } = context;

    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);

    // Top Resource Bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, 48);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 15px "Chakra Petch", monospace';
    ctx.fillText(`🪙 GOLD: ${Math.floor(this.resources.gold)}`, 24, 30);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`⚡ ENERGY: ${Math.floor(this.resources.energy)}`, 160, 30);
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`🌾 FOOD: ${Math.floor(this.resources.food)}`, 320, 30);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`⚔️ WAVE ${this.waveCount} IN ${Math.ceil(this.waveTimer)}s`, width - 200, 30);

    // Grid rendering
    const cellSize = 54;
    const startX = (width - 9 * cellSize) / 2;
    const startY = 70;

    const buildingIcons = { farm: '🌾', barracks: '🛡️', tower: '🏹', mine: '⛏️' };
    const buildingColors = { farm: '#166534', barracks: '#1e3a8a', tower: '#991b1b', mine: '#854d0e' };

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 9; c++) {
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;
        const b = this.grid[r][c];

        ctx.fillStyle = b ? buildingColors[b.type] : '#1e293b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 8);
        ctx.fill();
        ctx.stroke();

        if (b) {
          ctx.font = '24px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(buildingIcons[b.type], x + cellSize / 2, y + cellSize / 2);
        }

        // Selected cursor
        if (this.cursor.r === r && this.cursor.c === c) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Bottom action bar
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(
      `SELECTED: ${this.selectedBuildType.toUpperCase()} (Cost: 40🪙) | SPACE: Build | SHIFT: Cycle Type`,
      width / 2,
      height - 30
    );
  }

  public destroy() {
    audio.stopAll();
  }
}
