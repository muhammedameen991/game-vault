import { IGameEngine, GameEngineContext } from './types';
import { audio } from '../core/audio';

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'coin' | 'laser' | 'meteor' | 'platform' | 'bubble';
  color: string;
  collected?: boolean;
}

export class ArcadeEngine implements IGameEngine {
  private player = {
    x: 80,
    y: 300,
    width: 28,
    height: 36,
    vx: 0,
    vy: 0,
    gravity: 950,
    jumpPower: -420,
    isGrounded: false,
    color: '#38bdf8',
    trail: [] as { x: number; y: number; alpha: number }[]
  };

  private obstacles: Obstacle[] = [];
  private score: number = 0;
  private distance: number = 0;
  private speed: number = 280;
  private isGameOver: boolean = false;
  private gravityDirection: 1 | -1 = 1;
  private spawnTimer: number = 0;
  private particles: { x: number; y: number; vx: number; vy: number; color: string; life: number }[] = [];

  public init(context: GameEngineContext) {
    const isGravityFlip = context.game.id === 'gravity-flip';
    const isSkyJump = context.game.id === 'sky-jump';

    this.player = {
      x: isSkyJump ? context.width / 2 - 14 : 90,
      y: context.height - 120,
      width: 28,
      height: 34,
      vx: 0,
      vy: 0,
      gravity: 950,
      jumpPower: isSkyJump ? -550 : -420,
      isGrounded: false,
      color: context.game.color || '#38bdf8',
      trail: []
    };

    this.gravityDirection = 1;
    this.obstacles = [];
    this.score = 0;
    this.distance = 0;
    this.speed = 300;
    this.isGameOver = false;
    this.spawnTimer = 0;
    this.particles = [];

    // Pre-populate ground obstacles / coins
    for (let i = 0; i < 4; i++) {
      this.spawnObstacle(context, 400 + i * 320);
    }

    audio.startBackgroundMusic('arcade');
  }

  private spawnObstacle(context: GameEngineContext, xOverride?: number) {
    const spawnX = xOverride !== undefined ? xOverride : context.width + 50 + Math.random() * 100;
    const isCoin = Math.random() > 0.45;
    const isLaser = context.game.id === 'laser-dodge' || Math.random() < 0.2;
    const groundY = context.height - 60;

    if (isCoin) {
      this.obstacles.push({
        x: spawnX,
        y: groundY - 40 - Math.random() * 80,
        width: 18,
        height: 18,
        type: 'coin',
        color: '#fbbf24'
      });
    } else if (isLaser) {
      this.obstacles.push({
        x: spawnX,
        y: groundY - 55,
        width: 14,
        height: 55,
        type: 'laser',
        color: '#f43f5e'
      });
    } else {
      this.obstacles.push({
        x: spawnX,
        y: groundY - 32,
        width: 28,
        height: 32,
        type: 'spike',
        color: '#c084fc'
      });
    }
  }

  public update(dt: number, context: GameEngineContext) {
    if (this.isGameOver) return;

    const input = context.playerInputs[0] || { up: false, down: false, left: false, right: false, action1: false, action2: false };
    const groundY = context.height - 60;
    const ceilingY = 50;

    this.distance += this.speed * dt;
    this.score = Math.floor(this.distance / 10);
    context.onScoreUpdate(this.score);

    // Gravity flip mechanic or standard jump
    if (context.game.id === 'gravity-flip') {
      if ((input.action1 || input.up) && (this.player.isGrounded || this.player.y <= ceilingY + 5)) {
        this.gravityDirection = (this.gravityDirection === 1 ? -1 : 1) as 1 | -1;
        audio.playJump();
      }
    } else {
      if ((input.action1 || input.up) && this.player.isGrounded) {
        this.player.vy = this.player.jumpPower;
        this.player.isGrounded = false;
        audio.playJump();

        // Jump particles
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: this.player.x + 14,
            y: this.player.y + 34,
            vx: (Math.random() - 0.5) * 80,
            vy: (Math.random() - 0.5) * 40,
            color: '#38bdf8',
            life: 0.25
          });
        }
      }
    }

    // Horizontal movement if Sky Jump / Meteor Run
    if (context.game.id === 'sky-jump' || context.game.id === 'meteor-run') {
      if (input.left) this.player.x -= 260 * dt;
      if (input.right) this.player.x += 260 * dt;
      this.player.x = Math.max(20, Math.min(context.width - 48, this.player.x));
    }

    // Apply physics
    this.player.vy += this.player.gravity * this.gravityDirection * dt;
    this.player.y += this.player.vy * dt;

    // Ground & Ceiling collision
    if (this.gravityDirection === 1) {
      if (this.player.y + this.player.height >= groundY) {
        this.player.y = groundY - this.player.height;
        this.player.vy = 0;
        this.player.isGrounded = true;
      }
    } else {
      if (this.player.y <= ceilingY) {
        this.player.y = ceilingY;
        this.player.vy = 0;
        this.player.isGrounded = true;
      }
    }

    // Trail effect
    if (Math.random() < 0.4) {
      this.player.trail.push({ x: this.player.x, y: this.player.y, alpha: 0.5 });
    }
    for (let i = this.player.trail.length - 1; i >= 0; i--) {
      this.player.trail[i].alpha -= dt * 2.5;
      if (this.player.trail[i].alpha <= 0) this.player.trail.splice(i, 1);
    }

    // Obstacle movement & collision
    this.spawnTimer += dt;
    if (this.spawnTimer > 1.2) {
      this.spawnTimer = 0;
      this.spawnObstacle(context);
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed * dt;

      // Check collision
      const collides =
        this.player.x < obs.x + obs.width &&
        this.player.x + this.player.width > obs.x &&
        this.player.y < obs.y + obs.height &&
        this.player.y + this.player.height > obs.y;

      if (collides) {
        if (obs.type === 'coin' && !obs.collected) {
          obs.collected = true;
          this.distance += 400; // Bonus points
          audio.playScore();
          // Coin sparkles
          for (let p = 0; p < 8; p++) {
            this.particles.push({
              x: obs.x,
              y: obs.y,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120,
              color: '#fbbf24',
              life: 0.35
            });
          }
          this.obstacles.splice(i, 1);
          continue;
        } else if (obs.type !== 'coin') {
          // Hit hazard!
          this.isGameOver = true;
          audio.playExplosion();
          context.onGameOver(this.score, false);
          if (this.score > 500) context.unlockAchievement('arcade-master');
          return;
        }
      }

      if (obs.x + obs.width < -50) {
        this.obstacles.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Speed scaling
    this.speed = Math.min(550, 300 + this.score * 0.15);
  }

  public render(context: GameEngineContext) {
    const { ctx, width, height } = context;

    // Dark cyberpunk background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    // Parallax background grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    const gridOffset = (this.distance * 0.5) % 40;
    for (let x = -gridOffset; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Ground floor & ceiling
    const groundY = height - 60;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, groundY, width, 60);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, groundY, width, 4);

    if (context.game.id === 'gravity-flip') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, 50);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(0, 46, width, 4);
    }

    // Player motion trail
    for (const t of this.player.trail) {
      ctx.fillStyle = `rgba(56, 189, 248, ${t.alpha * 0.4})`;
      ctx.fillRect(t.x, t.y, this.player.width, this.player.height);
    }

    // Player character (Neon Robot / Runner)
    ctx.save();
    ctx.fillStyle = this.player.color;
    ctx.shadowColor = this.player.color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(this.player.x, this.player.y, this.player.width, this.player.height, 6);
    ctx.fill();

    // Eye visor
    ctx.fillStyle = '#ffffff';
    const eyeY = this.gravityDirection === 1 ? this.player.y + 8 : this.player.y + this.player.height - 14;
    ctx.fillRect(this.player.x + this.player.width - 12, eyeY, 8, 5);
    ctx.restore();

    // Obstacles
    for (const obs of this.obstacles) {
      ctx.save();
      if (obs.type === 'coin') {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillText('$', obs.x + 5, obs.y + 13);
      } else if (obs.type === 'laser') {
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 12;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      } else {
        // Spike triangle
        ctx.fillStyle = obs.color;
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width / 2, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Particles
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top HUD
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.fillText(`SCORE: ${this.score}`, 24, 34);
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SPACE / TAP TO JUMP', width - 180, 34);
  }

  public destroy() {
    audio.stopAll();
    this.particles = [];
  }
}
