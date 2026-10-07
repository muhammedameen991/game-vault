import { IGameEngine, GameEngineContext } from './types';
import { audio } from '../core/audio';

interface Note {
  lane: number; // 0, 1, 2, 3
  y: number;
  hit: boolean;
}

export class RhythmEngine implements IGameEngine {
  private notes: Note[] = [];
  private score: number = 0;
  private combo: number = 0;
  private noteSpeed: number = 320;
  private spawnTimer: number = 0;
  private feedback: string = '';
  private feedbackTimer: number = 0;

  public init(_context: GameEngineContext) {
    this.notes = [];
    this.score = 0;
    this.combo = 0;
    this.noteSpeed = 340;
    this.spawnTimer = 0;
    audio.startBackgroundMusic('arcade');
  }

  public update(dt: number, context: GameEngineContext) {
    this.spawnTimer += dt;
    if (this.spawnTimer > 0.45) {
      this.spawnTimer = 0;
      this.notes.push({
        lane: Math.floor(Math.random() * 4),
        y: 0,
        hit: false
      });
    }

    const input = context.playerInputs[0] || { up: false, down: false, left: false, right: false, action1: false, action2: false };
    const hitY = context.height - 80;
    const hitTolerance = 45;

    // Lane keys: D (left), F (down), J (up), K (right) or Arrow keys
    const lanesPressed = [input.left, input.down, input.up, input.right];

    lanesPressed.forEach((pressed, laneIdx) => {
      if (pressed) {
        // Find closest note in this lane
        const note = this.notes.find((n) => n.lane === laneIdx && !n.hit && Math.abs(n.y - hitY) < hitTolerance);
        if (note) {
          note.hit = true;
          this.combo++;
          this.score += 50 * Math.min(4, this.combo);
          this.feedback = 'PERFECT!';
          this.feedbackTimer = 0.4;
          audio.playClick();
          if (this.combo >= 15) context.unlockAchievement('arcade-master');
        }
      }
    });

    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= dt;
    }

    // Move notes
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      n.y += this.noteSpeed * dt;

      // Missed note
      if (n.y > hitY + hitTolerance && !n.hit) {
        this.combo = 0;
        this.feedback = 'MISS!';
        this.feedbackTimer = 0.3;
        this.notes.splice(i, 1);
      } else if (n.hit || n.y > context.height) {
        this.notes.splice(i, 1);
      }
    }

    context.onScoreUpdate(this.score);
  }

  public render(context: GameEngineContext) {
    const { ctx, width, height } = context;

    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, width, height);

    // 4 vertical lanes
    const laneWidth = 70;
    const startX = (width - 4 * laneWidth) / 2;
    const hitY = height - 80;
    const colors = ['#38bdf8', '#a855f7', '#f43f5e', '#fbbf24'];

    for (let i = 0; i < 4; i++) {
      const lx = startX + i * laneWidth;
      ctx.fillStyle = i % 2 === 0 ? '#111827' : '#1e293b';
      ctx.fillRect(lx, 0, laneWidth, height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.strokeRect(lx, 0, laneWidth, height);

      // Target hit bar at bottom
      ctx.fillStyle = colors[i];
      ctx.fillRect(lx + 4, hitY - 6, laneWidth - 8, 12);
    }

    // Falling notes
    for (const n of this.notes) {
      const nx = startX + n.lane * laneWidth;
      ctx.fillStyle = colors[n.lane];
      ctx.shadowColor = colors[n.lane];
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(nx + 8, n.y - 12, laneWidth - 16, 24, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Feedback & HUD
    if (this.feedbackTimer > 0) {
      ctx.fillStyle = this.feedback === 'PERFECT!' ? '#4ade80' : '#ef4444';
      ctx.font = 'bold 28px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.feedback, width / 2, hitY - 60);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SCORE: ${this.score} | COMBO: ${this.combo}x`, width / 2, 40);
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('KEYS: LEFT (←), DOWN (↓), UP (↑), RIGHT (→)', width / 2, height - 20);
  }

  public destroy() {
    audio.stopAll();
  }
}
