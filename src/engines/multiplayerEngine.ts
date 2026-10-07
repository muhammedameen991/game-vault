import { IGameEngine, GameEngineContext } from './types';
import { audio } from '../core/audio';

interface PlayerObject {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  score: number;
  color: string;
  isTagged?: boolean; // For Bomb Tag
  angle?: number;
  size: number;
  alive: boolean;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  color: string;
  life: number;
}

export class MultiplayerEngine implements IGameEngine {
  private players: PlayerObject[] = [];
  private projectiles: Projectile[] = [];
  private coins: { x: number; y: number; radius: number }[] = [];
  private arenaType: string = 'laser-arena';
  private matchTimer: number = 60;
  private isGameOver: boolean = false;

  public init(context: GameEngineContext) {
    this.arenaType = context.game.id;
    this.matchTimer = 60;
    this.isGameOver = false;
    this.projectiles = [];
    this.coins = [];

    const colors = ['#38bdf8', '#f43f5e', '#a855f7', '#fbbf24'];
    const pCount = Math.max(2, context.isMultiplayer && context.room ? context.room.players.length : 2);

    this.players = [];
    for (let i = 0; i < pCount; i++) {
      this.players.push({
        id: `p${i + 1}`,
        name: `Player ${i + 1}`,
        x: 100 + (i % 2) * (context.width - 200),
        y: 100 + Math.floor(i / 2) * (context.height - 200),
        vx: 0,
        vy: 0,
        score: 0,
        color: colors[i % colors.length],
        isTagged: i === 0 && this.arenaType === 'bomb-tag',
        angle: 0,
        size: 20,
        alive: true
      });
    }

    // Spawn initial coins for Coin Collector / Treasure Hunt
    if (this.arenaType === 'coin-collector' || this.arenaType === 'treasure-hunt') {
      for (let i = 0; i < 8; i++) {
        this.spawnCoin(context);
      }
    }

    audio.startBackgroundMusic('arcade');
  }

  private spawnCoin(context: GameEngineContext) {
    this.coins.push({
      x: 60 + Math.random() * (context.width - 120),
      y: 60 + Math.random() * (context.height - 120),
      radius: 10
    });
  }

  public update(dt: number, context: GameEngineContext) {
    if (this.isGameOver) return;

    this.matchTimer -= dt;
    if (this.matchTimer <= 0) {
      this.isGameOver = true;
      audio.playVictory();
      const topPlayer = [...this.players].sort((a, b) => b.score - a.score)[0];
      context.onGameOver(topPlayer?.score || 100, topPlayer?.id === 'p1');
      return;
    }

    const moveSpeed = 260;

    // Update each player according to input
    this.players.forEach((p, idx) => {
      if (!p.alive) return;

      const input = context.playerInputs[idx] || (idx === 1 && !context.isMultiplayer ? this.getAIBotInput(p) : { up: false, down: false, left: false, right: false, action1: false, action2: false });

      p.vx = 0;
      p.vy = 0;
      if (input.up) p.vy -= moveSpeed;
      if (input.down) p.vy += moveSpeed;
      if (input.left) p.vx -= moveSpeed;
      if (input.right) p.vx += moveSpeed;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Keep within arena bounds
      p.x = Math.max(30, Math.min(context.width - 30, p.x));
      p.y = Math.max(50, Math.min(context.height - 30, p.y));

      // Firing laser (for Laser Arena, Tank Arena, Pixel Battle)
      if (input.action1 && Math.random() < 0.25) {
        audio.playLaser();
        const dirX = p.vx !== 0 ? Math.sign(p.vx) : (idx === 0 ? 1 : -1);
        const dirY = p.vy !== 0 ? Math.sign(p.vy) : 0;
        this.projectiles.push({
          x: p.x,
          y: p.y,
          vx: dirX * 420,
          vy: dirY * 420,
          ownerId: p.id,
          color: p.color,
          life: 1.2
        });
      }

      // Coin Collector check
      for (let c = this.coins.length - 1; c >= 0; c--) {
        const coin = this.coins[c];
        if (Math.hypot(p.x - coin.x, p.y - coin.y) < p.size + coin.radius) {
          p.score += 50;
          this.coins.splice(c, 1);
          audio.playScore();
          this.spawnCoin(context);
        }
      }
    });

    // Bomb Tag collision passing
    if (this.arenaType === 'bomb-tag') {
      for (let i = 0; i < this.players.length; i++) {
        for (let j = i + 1; j < this.players.length; j++) {
          const p1 = this.players[i];
          const p2 = this.players[j];
          if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < p1.size + p2.size) {
            if (p1.isTagged || p2.isTagged) {
              p1.isTagged = !p1.isTagged;
              p2.isTagged = !p2.isTagged;
              audio.playClick();
            }
          }
        }
      }
    }

    // Projectile updates
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;

      // Check hit against other players
      for (const p of this.players) {
        if (p.id !== proj.ownerId && Math.hypot(p.x - proj.x, p.y - proj.y) < p.size) {
          audio.playExplosion();
          proj.life = 0;
          const owner = this.players.find((pl) => pl.id === proj.ownerId);
          if (owner) owner.score += 100;
        }
      }

      if (proj.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    context.onScoreUpdate(this.players[0]?.score || 0);

    // Sync state if host
    if (context.isMultiplayer && context.isHost && context.sendNetworkPacket) {
      context.sendNetworkPacket('ARENA_STATE', {
        players: this.players.map((p) => ({ id: p.id, x: p.x, y: p.y, score: p.score })),
        timer: this.matchTimer
      });
    }
  }

  private getAIBotInput(p: PlayerObject) {
    const target = this.players[0];
    if (!target) return { up: false, down: false, left: false, right: false, action1: false, action2: false };

    const dx = target.x - p.x;
    const dy = target.y - p.y;
    return {
      up: dy < -30,
      down: dy > 30,
      left: dx < -30,
      right: dx > 30,
      action1: Math.random() < 0.05,
      action2: false
    };
  }

  public render(context: GameEngineContext) {
    const { ctx, width, height } = context;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Grid Arena lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 40; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Coins
    for (const c of this.coins) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Players
    for (const p of this.players) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Bomb indicator
      if (p.isTagged) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '16px system-ui';
        ctx.fillText('💣', p.x - 8, p.y - p.size - 4);
      }

      // Player name & score label
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${p.name} (${p.score})`, p.x, p.y + p.size + 14);
      ctx.restore();
    }

    // Projectiles
    for (const proj of this.projectiles) {
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top HUD
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Chakra Petch", monospace';
    ctx.fillText(`${this.arenaType.toUpperCase()} | TIME: ${Math.ceil(this.matchTimer)}s`, 20, 28);
  }

  public handleNetworkPacket(packet: any, _context: GameEngineContext) {
    if (packet.type === 'ARENA_STATE') {
      const netPlayers = packet.data.players;
      this.matchTimer = packet.data.timer;
      netPlayers.forEach((np: any) => {
        const local = this.players.find((p) => p.id === np.id);
        if (local) {
          local.x = np.x;
          local.y = np.y;
          local.score = np.score;
        }
      });
    }
  }

  public destroy() {
    audio.stopAll();
  }
}
