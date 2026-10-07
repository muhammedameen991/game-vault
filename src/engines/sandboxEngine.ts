import { IGameEngine, GameEngineContext } from './types';
import { audio } from '../core/audio';

type TileType = 'grass' | 'water' | 'road' | 'house' | 'tree' | 'npc';

export class SandboxEngine implements IGameEngine {
  private grid: TileType[][] = [];
  private cols: number = 14;
  private rows: number = 10;
  private cursor = { r: 5, c: 7 };
  private selectedBrush: TileType = 'grass';
  private dayTime: number = 0; // 0 to 1 for day/night
  private keyDebounce = false;

  public init(context: GameEngineContext) {
    this.cols = 14;
    this.rows = 10;
    this.cursor = { r: 5, c: 7 };
    this.selectedBrush = 'house';
    this.dayTime = 0.2;

    // Load saved world if exists or generate default terrain
    context.loadData('world_tiles').then((saved) => {
      if (saved && Array.isArray(saved)) {
        this.grid = saved;
      } else {
        this.generateDefaultWorld();
      }
    });

    audio.startBackgroundMusic('chill');
  }

  private generateDefaultWorld() {
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill('grass'));
    // River in the middle
    for (let r = 0; r < this.rows; r++) {
      this.grid[r][3] = 'water';
      this.grid[r][4] = 'water';
    }
    // Trees on left
    this.grid[1][1] = 'tree';
    this.grid[2][2] = 'tree';
    this.grid[6][1] = 'tree';
    // Road & houses on right
    for (let c = 5; c < this.cols; c++) this.grid[5][c] = 'road';
    this.grid[4][8] = 'house';
    this.grid[4][10] = 'house';
    this.grid[6][8] = 'npc';
  }

  public update(dt: number, context: GameEngineContext) {
    // Day / night cycle
    this.dayTime = (this.dayTime + dt * 0.02) % 1;

    const input = context.playerInputs[0];
    if (!input) return;

    const anyKey = input.up || input.down || input.left || input.right || input.action1 || input.action2;
    if (anyKey && !this.keyDebounce) {
      this.keyDebounce = true;
      if (input.up) this.cursor.r = Math.max(0, this.cursor.r - 1);
      if (input.down) this.cursor.r = Math.min(this.rows - 1, this.cursor.r + 1);
      if (input.left) this.cursor.c = Math.max(0, this.cursor.c - 1);
      if (input.right) this.cursor.c = Math.min(this.cols - 1, this.cursor.c + 1);

      // Cycle tile brush with action2
      if (input.action2) {
        const brushes: TileType[] = ['grass', 'road', 'house', 'tree', 'water', 'npc'];
        const idx = brushes.indexOf(this.selectedBrush);
        this.selectedBrush = brushes[(idx + 1) % brushes.length];
        audio.playClick();
      }

      // Place tile with action1
      if (input.action1) {
        if (this.grid[this.cursor.r]) {
          this.grid[this.cursor.r][this.cursor.c] = this.selectedBrush;
          audio.playClick();
          context.saveData('world_tiles', this.grid);
          context.unlockAchievement('first-win');
        }
      }
    } else if (!anyKey) {
      this.keyDebounce = false;
    }

    context.onScoreUpdate(100);
  }

  public render(context: GameEngineContext) {
    const { ctx, width, height } = context;

    // Day / night ambient background tint
    const darkness = Math.sin(this.dayTime * Math.PI) * 0.4;
    ctx.fillStyle = `rgba(11, 15, 25, ${0.8 + darkness})`;
    ctx.fillRect(0, 0, width, height);

    const cellSize = 42;
    const startX = (width - this.cols * cellSize) / 2;
    const startY = 60;

    const tileEmojis: Record<TileType, string> = {
      grass: '🌱',
      water: '🌊',
      road: '🛤️',
      house: '🏡',
      tree: '🌲',
      npc: '🧙‍♂️'
    };

    const tileColors: Record<TileType, string> = {
      grass: '#15803d',
      water: '#0284c7',
      road: '#64748b',
      house: '#b45309',
      tree: '#166534',
      npc: '#a855f7'
    };

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const type = this.grid[r]?.[c] || 'grass';
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;

        ctx.fillStyle = tileColors[type];
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Icon
        ctx.font = '22px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tileEmojis[type], x + cellSize / 2, y + cellSize / 2);

        // Cursor
        if (this.cursor.r === r && this.cursor.c === c) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Top HUD
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    const timePhase = this.dayTime < 0.5 ? '☀️ DAY' : '🌙 NIGHT';
    ctx.fillText(`MINI WORLD BUILDER | ${timePhase}`, width / 2, 34);

    // Bottom HUD
    ctx.font = '13px system-ui';
    ctx.fillText(
      `TOOL: ${tileEmojis[this.selectedBrush]} ${this.selectedBrush.toUpperCase()} | SPACE: Place | SHIFT: Change Tool`,
      width / 2,
      height - 24
    );
  }

  public destroy() {
    audio.stopAll();
  }
}
