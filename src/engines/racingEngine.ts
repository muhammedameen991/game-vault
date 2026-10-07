import { IGameEngine, GameEngineContext } from './types';
import { audio } from '../core/audio';

interface Car {
  x: number; // -1 to 1 track offset
  y: number; // Distance along track
  speed: number;
  maxSpeed: number;
  color: string;
  name: string;
  isPlayer: boolean;
  playerIndex?: number;
}

export class RacingEngine implements IGameEngine {
  private playerCar: Car = {
    x: 0,
    y: 0,
    speed: 0,
    maxSpeed: 220,
    color: '#06b6d4',
    name: 'You',
    isPlayer: true,
    playerIndex: 0
  };

  private aiCars: Car[] = [];
  private trackLength: number = 6000;
  private currentLap: number = 1;
  private totalLaps: number = 3;
  private roadCurves: number[] = [];
  private boostTimer: number = 0;
  private particles: { x: number; y: number; vx: number; vy: number; color: string; life: number }[] = [];
  private isFinished: boolean = false;
  private gameTime: number = 0;

  public init(context: GameEngineContext) {
    this.playerCar = {
      x: 0,
      y: 0,
      speed: 0,
      maxSpeed: context.game.id === 'rocket-racing' ? 260 : 220,
      color: context.game.color || '#38bdf8',
      name: 'Player 1',
      isPlayer: true,
      playerIndex: 0
    };

    this.currentLap = 1;
    this.totalLaps = 3;
    this.isFinished = false;
    this.gameTime = 0;
    this.boostTimer = 0;
    this.particles = [];

    // Generate procedural road curves
    this.roadCurves = [];
    for (let i = 0; i < 50; i++) {
      this.roadCurves.push((Math.sin(i * 0.4) * 0.8) + (Math.cos(i * 0.2) * 0.5));
    }

    // Spawn competitor cars
    const colors = ['#f43f5e', '#a855f7', '#eab308', '#10b981', '#ec4899'];
    this.aiCars = [
      { x: -0.4, y: 300, speed: 170, maxSpeed: 190, color: colors[0], name: 'Blaze', isPlayer: false },
      { x: 0.4, y: 700, speed: 180, maxSpeed: 195, color: colors[1], name: 'Viper', isPlayer: false },
      { x: -0.2, y: 1200, speed: 175, maxSpeed: 188, color: colors[2], name: 'Pulse', isPlayer: false },
      { x: 0.3, y: 1800, speed: 185, maxSpeed: 200, color: colors[3], name: 'Ghost', isPlayer: false }
    ];

    audio.startBackgroundMusic('racer');
  }

  public update(dt: number, context: GameEngineContext) {
    if (this.isFinished) return;

    this.gameTime += dt;
    const input = context.playerInputs[0] || { up: false, down: false, left: false, right: false, action1: false, action2: false };

    // Acceleration & Braking
    const accelRate = 120;
    const decelRate = 80;
    let targetMax = this.playerCar.maxSpeed;

    if (input.action1 && this.boostTimer <= 0) {
      this.boostTimer = 2.5;
      audio.playLaser();
    }

    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      targetMax += 60;
      // Boost flame particles
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: context.width / 2 + (Math.random() - 0.5) * 20,
          y: context.height - 70,
          vx: (Math.random() - 0.5) * 60,
          vy: 80 + Math.random() * 100,
          color: Math.random() > 0.5 ? '#38bdf8' : '#c084fc',
          life: 0.3
        });
      }
    }

    if (input.up) {
      this.playerCar.speed = Math.min(targetMax, this.playerCar.speed + accelRate * dt);
      if (Math.random() < 0.15) audio.playEngine(this.playerCar.speed / 160);
    } else if (input.down) {
      this.playerCar.speed = Math.max(0, this.playerCar.speed - decelRate * 1.5 * dt);
    } else {
      this.playerCar.speed = Math.max(0, this.playerCar.speed - decelRate * 0.5 * dt);
    }

    // Steering
    const steerSpeed = (1.5 + (this.playerCar.speed / this.playerCar.maxSpeed) * 0.5);
    if (input.left) {
      this.playerCar.x -= steerSpeed * dt;
    }
    if (input.right) {
      this.playerCar.x += steerSpeed * dt;
    }

    // Off-road friction penalty
    if (Math.abs(this.playerCar.x) > 0.85) {
      this.playerCar.speed = Math.max(0, this.playerCar.speed - 150 * dt);
      if (Math.random() < 0.2) {
        this.particles.push({
          x: context.width / 2 + (this.playerCar.x * 120),
          y: context.height - 60,
          vx: (Math.random() - 0.5) * 50,
          vy: -20,
          color: '#e2e8f0',
          life: 0.2
        });
      }
    }

    // Track progression
    this.playerCar.y += this.playerCar.speed * 1.5 * dt;

    // Check lap completion
    if (this.playerCar.y >= this.trackLength) {
      this.playerCar.y -= this.trackLength;
      this.currentLap++;
      audio.playScore();

      if (this.currentLap > this.totalLaps) {
        this.isFinished = true;
        const finalScore = Math.max(100, Math.floor(10000 - this.gameTime * 100));
        context.onScoreUpdate(finalScore);
        context.onGameOver(finalScore, true);
        context.unlockAchievement('first-win');
        context.unlockAchievement('racing-master');
        return;
      }
    }

    // AI Cars update
    for (const car of this.aiCars) {
      car.y += car.speed * 1.5 * dt;
      if (car.y >= this.trackLength) car.y -= this.trackLength;
      // Slight weaving
      car.x += Math.sin(this.gameTime + car.y * 0.01) * 0.15 * dt;

      // Collision check with player
      const dist = Math.abs(this.playerCar.y - car.y);
      if (dist < 80 && Math.abs(this.playerCar.x - car.x) < 0.35) {
        audio.playExplosion();
        this.playerCar.speed *= 0.6;
        this.playerCar.x += this.playerCar.x > car.x ? 0.2 : -0.2;
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

    // Update real-time score based on speed and lap
    const currentScore = Math.floor((this.currentLap - 1) * 2000 + (this.playerCar.y / this.trackLength) * 2000 + this.playerCar.speed * 5);
    context.onScoreUpdate(currentScore);

    // Multiplayer sync if host or client
    if (context.isMultiplayer && context.sendNetworkPacket) {
      context.sendNetworkPacket('RACER_POS', {
        x: this.playerCar.x,
        y: this.playerCar.y,
        speed: this.playerCar.speed,
        lap: this.currentLap
      });
    }
  }

  public render(context: GameEngineContext) {
    const { ctx, width, height } = context;

    // Background gradient: Cyberpunk neon night sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height / 2);
    skyGrad.addColorStop(0, '#030712');
    skyGrad.addColorStop(0.7, '#1e1b4b');
    skyGrad.addColorStop(1, '#431407');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Distant Neon Sun / Horizon Grid
    const horizonY = height * 0.45;
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, horizonY - 10, 70, Math.PI, 0);
    const sunGrad = ctx.createLinearGradient(width / 2, horizonY - 80, width / 2, horizonY);
    sunGrad.addColorStop(0, '#fbbf24');
    sunGrad.addColorStop(0.5, '#ec4899');
    sunGrad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = sunGrad;
    ctx.fill();
    ctx.restore();

    // City skyline silhouette
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < width; i += 36) {
      const h = 25 + Math.sin(i * 99) * 20;
      ctx.fillRect(i, horizonY - h, 32, h);
    }

    // Road rendering: 2.5D pseudo-3D perspective
    const roadTopY = horizonY;
    const roadBottomY = height;
    const roadLines = 60;

    for (let i = roadLines; i >= 1; i--) {
      const p1 = (i - 1) / roadLines;
      const p2 = i / roadLines;

      const y1 = roadTopY + Math.pow(p1, 2) * (roadBottomY - roadTopY);
      const y2 = roadTopY + Math.pow(p2, 2) * (roadBottomY - roadTopY);

      const w1 = 40 + Math.pow(p1, 2) * (width * 0.85);
      const w2 = 40 + Math.pow(p2, 2) * (width * 0.85);

      const curveIdx = Math.floor(((this.playerCar.y + i * 20) / 200) % this.roadCurves.length);
      const curveOffset = this.roadCurves[curveIdx] || 0;
      const cx1 = width / 2 + curveOffset * (1 - p1) * 90;
      const cx2 = width / 2 + curveOffset * (1 - p2) * 90;

      // Alternating road segments
      const isAlt = Math.floor((this.playerCar.y / 20) + i) % 2 === 0;
      ctx.fillStyle = isAlt ? '#111827' : '#1f2937';

      // Draw road polygon
      ctx.beginPath();
      ctx.moveTo(cx1 - w1 / 2, y1);
      ctx.lineTo(cx1 + w1 / 2, y1);
      ctx.lineTo(cx2 + w2 / 2, y2);
      ctx.lineTo(cx2 - w2 / 2, y2);
      ctx.closePath();
      ctx.fill();

      // Neon curbstones
      const curbW1 = w1 * 0.08;
      const curbW2 = w2 * 0.08;
      ctx.fillStyle = isAlt ? '#ec4899' : '#06b6d4';
      ctx.fillRect(cx2 - w2 / 2 - curbW2, y2, curbW2, y2 - y1);
      ctx.fillRect(cx2 + w2 / 2, y2, curbW2, y2 - y1);

      // Center dashed road markings
      if (isAlt) {
        ctx.fillStyle = '#f8fafc';
        const centerW = 4 * p2;
        ctx.fillRect(cx2 - centerW / 2, y2, centerW, y2 - y1);
      }
    }

    // Render AI Cars on track
    for (const car of this.aiCars) {
      const relY = car.y - this.playerCar.y;
      if (relY > 0 && relY < 1800) {
        const p = 1 - (relY / 1800);
        const y = roadTopY + Math.pow(p, 2) * (roadBottomY - roadTopY);
        const w = 40 + Math.pow(p, 2) * (width * 0.85);
        const carX = width / 2 + (car.x * (w / 2));
        const carSize = 20 + p * 40;

        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.roundRect(carX - carSize / 2, y - carSize * 0.6, carSize, carSize * 0.6, 6);
        ctx.fill();
        // Red taillights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(carX - carSize / 2 + 3, y - 6, 6, 4);
        ctx.fillRect(carX + carSize / 2 - 9, y - 6, 6, 4);
      }
    }

    // Render Player Car in foreground
    const playerX = width / 2 + (this.playerCar.x * (width * 0.38));
    const playerY = height - 90;
    const playerWidth = 84;
    const playerHeight = 44;

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(playerX, playerY + playerHeight / 2 + 4, playerWidth / 2, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car Body (Futuristic Neon Supercar)
    const carGrad = ctx.createLinearGradient(playerX - playerWidth / 2, playerY, playerX + playerWidth / 2, playerY + playerHeight);
    carGrad.addColorStop(0, '#38bdf8');
    carGrad.addColorStop(0.5, '#6366f1');
    carGrad.addColorStop(1, '#a855f7');
    ctx.fillStyle = carGrad;
    ctx.beginPath();
    ctx.roundRect(playerX - playerWidth / 2, playerY - playerHeight / 2, playerWidth, playerHeight, 10);
    ctx.fill();

    // Roof & Windshield
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(playerX - playerWidth * 0.35, playerY - playerHeight * 0.4, playerWidth * 0.7, playerHeight * 0.5, 6);
    ctx.fill();

    // Glowing Neon Taillights & Exhaust
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 12;
    ctx.fillRect(playerX - playerWidth / 2 + 6, playerY + playerHeight / 2 - 8, 16, 6);
    ctx.fillRect(playerX + playerWidth / 2 - 22, playerY + playerHeight / 2 - 8, 16, 6);

    // Boost effect
    if (this.boostTimer > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 20;
      ctx.fillRect(playerX - 10, playerY + playerHeight / 2 - 4, 20, 10);
    }
    ctx.restore();

    // Render particles
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // In-game HUD: LAP, POSITION, SPEEDOMETER (matches design reference POS 1/4, LAP 1/3, 142 KM/H)
    ctx.save();
    // Top-Left: Position & Lap
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.roundRect(20, 20, 120, 60, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui';
    ctx.fillText('POSITION', 32, 38);
    ctx.fillText('LAP', 95, 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Chakra Petch", monospace';
    // Calculate position
    const ahead = this.aiCars.filter((c) => c.y > this.playerCar.y).length;
    const pos = ahead + 1;
    ctx.fillText(`${pos}/5`, 32, 62);
    ctx.fillText(`${Math.min(this.totalLaps, this.currentLap)}/${this.totalLaps}`, 95, 62);

    // Bottom-Right: Speedometer Dial (Matches 142 KM/H dial in image)
    const speedX = width - 80;
    const speedY = height - 70;
    ctx.beginPath();
    ctx.arc(speedX, speedY, 44, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    const displaySpeed = Math.round(this.playerCar.speed);
    ctx.fillText(`${displaySpeed}`, speedX, speedY + 4);
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('KM/H', speedX, speedY + 18);

    // Boost Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(width / 2 - 80, 25, 160, 8);
    ctx.fillStyle = this.boostTimer > 0 ? '#38bdf8' : '#ec4899';
    const boostRatio = this.boostTimer > 0 ? (this.boostTimer / 2.5) : 1;
    ctx.fillRect(width / 2 - 80, 25, 160 * boostRatio, 8);
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.boostTimer > 0 ? 'NITRO ACTIVE' : 'PRESS SPACE FOR NITRO', width / 2, 48);

    ctx.restore();
  }

  public handleNetworkPacket(packet: any, _context: GameEngineContext) {
    if (packet.type === 'RACER_POS') {
      let car = this.aiCars.find((c) => c.name === packet.senderId);
      if (!car) {
        car = {
          x: packet.data.x,
          y: packet.data.y,
          speed: packet.data.speed,
          maxSpeed: 230,
          color: '#ec4899',
          name: packet.senderId,
          isPlayer: false
        };
        this.aiCars.push(car);
      } else {
        car.x = packet.data.x;
        car.y = packet.data.y;
        car.speed = packet.data.speed;
      }
    }
  }

  public destroy() {
    audio.stopAll();
    this.particles = [];
  }
}
