import { IGameEngine, GameEngineContext } from './types';
import { audio } from '../core/audio';

export class CardEngine implements IGameEngine {
  private playerHand: { val: number; suit: string }[] = [];
  private dealerHand: { val: number; suit: string }[] = [];
  private score: number = 0;
  private message: string = 'Hit or Stand?';
  private roundOver: boolean = false;
  private keyDebounce = false;

  public init(_context: GameEngineContext) {
    this.playerHand = [this.randomCard(), this.randomCard()];
    this.dealerHand = [this.randomCard(), this.randomCard()];
    this.roundOver = false;
    this.message = 'Hit (Space) or Stand (Enter)?';
    audio.playClick();
  }

  private randomCard() {
    const suits = ['♠', '♥', '♦', '♣'];
    const val = Math.floor(Math.random() * 11) + 1;
    return { val, suit: suits[Math.floor(Math.random() * suits.length)] };
  }

  private handTotal(hand: { val: number }[]) {
    return hand.reduce((sum, c) => sum + c.val, 0);
  }

  public update(_dt: number, context: GameEngineContext) {
    if (this.roundOver) return;

    const input = context.playerInputs[0];
    if (!input) return;

    const anyKey = input.action1 || input.action2 || input.up || input.down;
    if (anyKey && !this.keyDebounce) {
      this.keyDebounce = true;

      // Hit (action1 / Space)
      if (input.action1) {
        this.playerHand.push(this.randomCard());
        audio.playClick();
        if (this.handTotal(this.playerHand) > 21) {
          this.message = 'Bust! Dealer Wins.';
          this.roundOver = true;
          audio.playExplosion();
          context.onGameOver(this.score, false);
        }
      }

      // Stand (action2 / Enter)
      if (input.action2) {
        while (this.handTotal(this.dealerHand) < 17) {
          this.dealerHand.push(this.randomCard());
        }
        const pTot = this.handTotal(this.playerHand);
        const dTot = this.handTotal(this.dealerHand);

        if (dTot > 21 || pTot > dTot) {
          this.message = 'You Win!';
          this.score += 200;
          audio.playVictory();
          context.unlockAchievement('first-win');
          context.onGameOver(this.score, true);
        } else if (pTot === dTot) {
          this.message = 'Push (Tie)!';
        } else {
          this.message = 'Dealer Wins.';
          audio.playExplosion();
          context.onGameOver(this.score, false);
        }
        this.roundOver = true;
      }
    } else if (!anyKey) {
      this.keyDebounce = false;
    }

    context.onScoreUpdate(this.score);
  }

  public render(context: GameEngineContext) {
    const { ctx, width, height } = context;

    // Green felt poker table background
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, width, height);

    // Dealer Cards
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Chakra Petch", monospace';
    ctx.fillText(`DEALER HAND: ${this.roundOver ? this.handTotal(this.dealerHand) : '?'}`, 40, 50);

    this.dealerHand.forEach((card, idx) => {
      this.renderCard(ctx, 40 + idx * 75, 70, !this.roundOver && idx === 1 ? '?' : `${card.val}${card.suit}`);
    });

    // Player Cards
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`YOUR HAND: ${this.handTotal(this.playerHand)}`, 40, height * 0.55);

    this.playerHand.forEach((card, idx) => {
      this.renderCard(ctx, 40 + idx * 75, height * 0.55 + 20, `${card.val}${card.suit}`);
    });

    // Bottom banner
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.message, width / 2, height - 30);
  }

  private renderCard(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, 64, 90, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = text.includes('♥') || text.includes('♦') ? '#ef4444' : '#0f172a';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 32, y + 45);
  }

  public destroy() {
    audio.stopAll();
  }
}
