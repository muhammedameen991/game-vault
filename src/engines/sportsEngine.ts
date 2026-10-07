import { IGameEngine, GameEngineContext } from './types';
import { audio } from '../core/audio';

export class SportsEngine implements IGameEngine {
  private gameType: string = 'mini-golf';
  private score: number = 0;
  private isGameOver: boolean = false;

  // Ball physics
  private ball = {
    x: 150,
    y: 300,
    radius: 12,
    vx: 0,
    vy: 0,
    friction: 0.985,
    inMotion: false
  };

  // Mini Golf specific
  private hole = { x: 500, y: 200, radius: 18 };
  private strokes: number = 0;
  private aimAngle: number = 0;
  private aimPower: number = 200;
  private powerDirection: number = 1;

  // Basketball specific
  private hoop = { x: 520, y: 160, width: 60 };
  private streak: number = 0;

  // Air Hockey specific (2 player)
  private paddle1 = { x: 80, y: 200, radius: 24 };
  private paddle2 = { x: 560, y: 200, radius: 24 };
  private scoreP1: number = 0;
  private scoreP2: number = 0;

  public init(context: GameEngineContext) {
    this.gameType = context.game.id;
    this.score = 0;
    this.isGameOver = false;

    if (this.gameType === 'mini-golf' || this.gameType === 'gravity-golf') {
      this.ball = { x: 120, y: context.height / 2, radius: 10, vx: 0, vy: 0, friction: 0.982, inMotion: false };
      this.hole = { x: context.width - 120, y: context.height / 2, radius: 18 };
      this.strokes = 0;
    } else if (this.gameType === 'basketball-hoops') {
      this.ball = { x: 100, y: context.height - 120, radius: 16, vx: 0, vy: 0, friction: 0.995, inMotion: false };
      this.hoop = { x: context.width - 140, y: context.height * 0.35, width: 64 };
      this.streak = 0;
    } else {
      // Air Hockey / Tennis Mini
      this.ball = { x: context.width / 2, y: context.height / 2, radius: 14, vx: 220, vy: 140, friction: 0.999, inMotion: true };
      this.paddle1 = { x: 80, y: context.height / 2, radius: 26 };
      this.paddle2 = { x: context.width - 80, y: context.height / 2, radius: 26 };
      this.scoreP1 = 0;
      this.scoreP2 = 0;
    }

    audio.startBackgroundMusic('arcade');
  }

  public update(dt: number, context: GameEngineContext) {
    if (this.isGameOver) return;

    const inputP1 = context.playerInputs[0] || { up: false, down: false, left: false, right: false, action1: false, action2: false };
    const inputP2 = context.playerInputs[1] || { up: false, down: false, left: false, right: false, action1: false, action2: false };

    if (this.gameType === 'mini-golf' || this.gameType === 'gravity-golf') {
      // Aiming when ball stopped
      if (!this.ball.inMotion) {
        if (inputP1.up) this.aimAngle -= 2 * dt;
        if (inputP1.down) this.aimAngle += 2 * dt;

        // Power oscillator
        this.aimPower += this.powerDirection * 300 * dt;
        if (this.aimPower > 500) { this.aimPower = 500; this.powerDirection = -1; }
        if (this.aimPower < 80) { this.aimPower = 80; this.powerDirection = 1; }

        if (inputP1.action1) {
          // Shoot!
          this.ball.vx = Math.cos(this.aimAngle) * this.aimPower;
          this.ball.vy = Math.sin(this.aimAngle) * this.aimPower;
          this.ball.inMotion = true;
          this.strokes++;
          audio.playClick();
        }
      } else {
        // Move ball
        this.ball.x += this.ball.vx * dt;
        this.ball.y += this.ball.vy * dt;
        this.ball.vx *= this.ball.friction;
        this.ball.vy *= this.ball.friction;

        // Wall rebounds
        if (this.ball.x - this.ball.radius < 40 || this.ball.x + this.ball.radius > context.width - 40) {
          this.ball.vx *= -0.8;
          audio.playClick();
        }
        if (this.ball.y - this.ball.radius < 60 || this.ball.y + this.ball.radius > context.height - 60) {
          this.ball.vy *= -0.8;
          audio.playClick();
        }

        // Stop threshold
        if (Math.hypot(this.ball.vx, this.ball.vy) < 8) {
          this.ball.vx = 0;
          this.ball.vy = 0;
          this.ball.inMotion = false;
        }

        // Check Hole In
        const distToHole = Math.hypot(this.ball.x - this.hole.x, this.ball.y - this.hole.y);
        if (distToHole < this.hole.radius && Math.hypot(this.ball.vx, this.ball.vy) < 180) {
          this.score += Math.max(100, 1000 - this.strokes * 150);
          audio.playVictory();
          context.unlockAchievement('first-win');
          context.onScoreUpdate(this.score);
          // Reset ball for next hole
          this.ball.x = 120;
          this.ball.y = context.height / 2;
          this.ball.vx = 0;
          this.ball.vy = 0;
          this.ball.inMotion = false;
          this.strokes = 0;
        }
      }
    } else if (this.gameType === 'basketball-hoops') {
      if (!this.ball.inMotion) {
        if (inputP1.up) this.aimAngle = Math.max(-1.4, this.aimAngle - dt);
        if (inputP1.down) this.aimAngle = Math.min(-0.2, this.aimAngle + dt);

        this.aimPower += this.powerDirection * 350 * dt;
        if (this.aimPower > 650) { this.aimPower = 650; this.powerDirection = -1; }
        if (this.aimPower < 200) { this.aimPower = 200; this.powerDirection = 1; }

        if (inputP1.action1) {
          this.ball.vx = Math.cos(this.aimAngle) * this.aimPower;
          this.ball.vy = Math.sin(this.aimAngle) * this.aimPower;
          this.ball.inMotion = true;
          audio.playJump();
        }
      } else {
        // Gravity on basketball
        this.ball.vy += 850 * dt;
        this.ball.x += this.ball.vx * dt;
        this.ball.y += this.ball.vy * dt;

        // Check Hoop Score
        if (
          this.ball.x > this.hoop.x &&
          this.ball.x < this.hoop.x + this.hoop.width &&
          Math.abs(this.ball.y - this.hoop.y) < 20 &&
          this.ball.vy > 0
        ) {
          this.streak++;
          this.score += 100 * this.streak;
          audio.playScore();
          context.onScoreUpdate(this.score);
          if (this.streak >= 3) context.unlockAchievement('arcade-master');
        }

        // Ground rebound or reset
        if (this.ball.y > context.height - 80) {
          this.ball.x = 100;
          this.ball.y = context.height - 120;
          this.ball.vx = 0;
          this.ball.vy = 0;
          this.ball.inMotion = false;
        }
      }
    } else {
      // Air Hockey / Tennis Mini
      const paddleSpeed = 320;
      if (inputP1.up) this.paddle1.y = Math.max(80, this.paddle1.y - paddleSpeed * dt);
      if (inputP1.down) this.paddle1.y = Math.min(context.height - 80, this.paddle1.y + paddleSpeed * dt);

      // Player 2 or AI paddle
      if (context.isMultiplayer) {
        if (inputP2.up) this.paddle2.y = Math.max(80, this.paddle2.y - paddleSpeed * dt);
        if (inputP2.down) this.paddle2.y = Math.min(context.height - 80, this.paddle2.y + paddleSpeed * dt);
      } else {
        // AI tracking
        const dy = this.ball.y - this.paddle2.y;
        this.paddle2.y += Math.sign(dy) * Math.min(Math.abs(dy), paddleSpeed * 0.85) * dt;
      }

      // Ball move
      this.ball.x += this.ball.vx * dt;
      this.ball.y += this.ball.vy * dt;

      // Top / Bottom wall bounds
      if (this.ball.y - this.ball.radius < 40 || this.ball.y + this.ball.radius > context.height - 40) {
        this.ball.vy *= -1;
        audio.playClick();
      }

      // Paddle collisions
      const distP1 = Math.hypot(this.ball.x - this.paddle1.x, this.ball.y - this.paddle1.y);
      if (distP1 < this.ball.radius + this.paddle1.radius) {
        this.ball.vx = Math.abs(this.ball.vx) * 1.05;
        this.ball.vy = (this.ball.y - this.paddle1.y) * 8;
        audio.playClick();
      }

      const distP2 = Math.hypot(this.ball.x - this.paddle2.x, this.ball.y - this.paddle2.y);
      if (distP2 < this.ball.radius + this.paddle2.radius) {
        this.ball.vx = -Math.abs(this.ball.vx) * 1.05;
        this.ball.vy = (this.ball.y - this.paddle2.y) * 8;
        audio.playClick();
      }

      // Goals
      if (this.ball.x < 30) {
        this.scoreP2++;
        audio.playScore();
        this.resetPuck(context);
      } else if (this.ball.x > context.width - 30) {
        this.scoreP1++;
        audio.playScore();
        this.resetPuck(context);
      }

      context.onScoreUpdate(this.scoreP1 * 100);
      if (this.scoreP1 >= 5 || this.scoreP2 >= 5) {
        this.isGameOver = true;
        context.onGameOver(this.scoreP1 * 100, this.scoreP1 > this.scoreP2);
      }
    }
  }

  private resetPuck(context: GameEngineContext) {
    this.ball.x = context.width / 2;
    this.ball.y = context.height / 2;
    this.ball.vx = (Math.random() > 0.5 ? 220 : -220);
    this.ball.vy = (Math.random() - 0.5) * 160;
  }

  public render(context: GameEngineContext) {
    const { ctx, width, height } = context;

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    if (this.gameType === 'mini-golf' || this.gameType === 'gravity-golf') {
      // Green course
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.roundRect(40, 50, width - 80, height - 100, 20);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Hole & Flag
      ctx.fillStyle = '#022c22';
      ctx.beginPath();
      ctx.arc(this.hole.x, this.hole.y, this.hole.radius, 0, Math.PI * 2);
      ctx.fill();
      // Flagpole
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.hole.x, this.hole.y);
      ctx.lineTo(this.hole.x, this.hole.y - 40);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(this.hole.x, this.hole.y - 40, 20, 12);

      // Ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Aim Line
      if (!this.ball.inMotion) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.ball.x, this.ball.y);
        ctx.lineTo(
          this.ball.x + Math.cos(this.aimAngle) * (this.aimPower * 0.25),
          this.ball.y + Math.sin(this.aimAngle) * (this.aimPower * 0.25)
        );
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`MINI GOLF - STROKES: ${this.strokes} | SCORE: ${this.score}`, width / 2, 34);
    } else if (this.gameType === 'basketball-hoops') {
      // Court floor & Backboard
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, height - 80, width, 80);

      // Backboard & Rim
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.hoop.x + this.hoop.width - 6, this.hoop.y - 70, 8, 80);
      // Red Rim
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(this.hoop.x, this.hoop.y, this.hoop.width, 6);

      // Basketball
      ctx.fillStyle = '#ea580c';
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`BASKETBALL HOOPS - STREAK: x${this.streak} | SCORE: ${this.score}`, width / 2, 34);
    } else {
      // Air Hockey / Tennis Mini Rink
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      // Center divider
      ctx.beginPath();
      ctx.moveTo(width / 2, 30);
      ctx.lineTo(width / 2, height - 30);
      ctx.stroke();

      // Puck
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Paddles
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(this.paddle1.x, this.paddle1.y, this.paddle1.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(this.paddle2.x, this.paddle2.y, this.paddle2.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.scoreP1}  -  ${this.scoreP2}`, width / 2, 60);
    }
  }

  public destroy() {
    audio.stopAll();
  }
}
