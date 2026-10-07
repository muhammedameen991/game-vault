import { IGameEngine, GameEngineContext } from './types';
import { audio } from '../core/audio';

export class BoardEngine implements IGameEngine {
  private gameType: string = 'chess';
  private turn: 1 | 2 = 1;
  private winner: 0 | 1 | 2 = 0;
  private isAIEnabled: boolean = true;

  // Generic 8x8 board for Chess / Checkers / Reversi
  private board8x8: (string | null)[][] = [];
  private selectedCell: { r: number; c: number } | null = null;

  // Connect Four 7x6 board
  private connectFourBoard: number[][] = [];

  // Tic-Tac-Toe 3x3 board
  private tttBoard: number[][] = [];

  // Cursor for controller/keyboard navigation
  private cursor = { r: 0, c: 0 };
  private keyDebounce = false;

  public init(context: GameEngineContext) {
    this.gameType = context.game.id;
    this.turn = 1;
    this.winner = 0;
    this.selectedCell = null;
    this.cursor = { r: 3, c: 3 };
    this.isAIEnabled = !context.isMultiplayer;

    if (this.gameType === 'connect-four') {
      this.connectFourBoard = Array.from({ length: 6 }, () => Array(7).fill(0));
    } else if (this.gameType === 'tic-tac-toe') {
      this.tttBoard = Array.from({ length: 3 }, () => Array(3).fill(0));
    } else if (this.gameType === 'checkers') {
      this.initCheckers();
    } else {
      // Default to Chess
      this.initChess();
    }
  }

  private initChess() {
    this.board8x8 = Array.from({ length: 8 }, () => Array(8).fill(null));
    // Black pieces (top: player 2 / AI)
    const backRow = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let c = 0; c < 8; c++) {
      this.board8x8[0][c] = 'b_' + backRow[c];
      this.board8x8[1][c] = 'b_p';
      this.board8x8[6][c] = 'w_p';
      this.board8x8[7][c] = 'w_' + backRow[c];
    }
  }

  private initCheckers() {
    this.board8x8 = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) this.board8x8[r][c] = 'b_c';
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) this.board8x8[r][c] = 'w_c';
      }
    }
  }

  public update(_dt: number, context: GameEngineContext) {
    if (this.winner !== 0) return;

    const inputP1 = context.playerInputs[0] || { up: false, down: false, left: false, right: false, action1: false, action2: false };
    const inputP2 = context.playerInputs[1] || { up: false, down: false, left: false, right: false, action1: false, action2: false };
    const activeInput = this.turn === 1 ? inputP1 : (this.isAIEnabled ? null : inputP2);

    if (activeInput) {
      const anyDir = activeInput.up || activeInput.down || activeInput.left || activeInput.right || activeInput.action1;
      if (anyDir && !this.keyDebounce) {
        this.keyDebounce = true;
        const maxR = this.gameType === 'connect-four' ? 5 : (this.gameType === 'tic-tac-toe' ? 2 : 7);
        const maxC = this.gameType === 'connect-four' ? 6 : (this.gameType === 'tic-tac-toe' ? 2 : 7);

        if (activeInput.up) this.cursor.r = Math.max(0, this.cursor.r - 1);
        if (activeInput.down) this.cursor.r = Math.min(maxR, this.cursor.r + 1);
        if (activeInput.left) this.cursor.c = Math.max(0, this.cursor.c - 1);
        if (activeInput.right) this.cursor.c = Math.min(maxC, this.cursor.c + 1);

        if (activeInput.action1) {
          this.handleAction(this.cursor.r, this.cursor.c, context);
        }
      } else if (!anyDir) {
        this.keyDebounce = false;
      }
    } else if (this.turn === 2 && this.isAIEnabled) {
      // Simple AI move trigger
      setTimeout(() => this.makeAIMove(context), 500);
    }
  }

  private handleAction(r: number, c: number, context: GameEngineContext) {
    if (this.winner !== 0) return;

    if (this.gameType === 'connect-four') {
      // Drop chip in column c
      for (let row = 5; row >= 0; row--) {
        if (this.connectFourBoard[row][c] === 0) {
          this.connectFourBoard[row][c] = this.turn;
          audio.playClick();
          this.checkConnectFourWin(context);
          this.turn = this.turn === 1 ? 2 : 1;
          break;
        }
      }
    } else if (this.gameType === 'tic-tac-toe') {
      if (this.tttBoard[r][c] === 0) {
        this.tttBoard[r][c] = this.turn;
        audio.playClick();
        this.checkTTTWin(context);
        this.turn = this.turn === 1 ? 2 : 1;
      }
    } else {
      // Chess or Checkers select / move
      const piece = this.board8x8[r][c];
      const playerPrefix = this.turn === 1 ? 'w_' : 'b_';

      if (!this.selectedCell) {
        if (piece && piece.startsWith(playerPrefix)) {
          this.selectedCell = { r, c };
          audio.playClick();
        }
      } else {
        if (this.selectedCell.r === r && this.selectedCell.c === c) {
          this.selectedCell = null;
        } else {
          // Execute Move
          const movingPiece = this.board8x8[this.selectedCell.r][this.selectedCell.c];
          this.board8x8[this.selectedCell.r][this.selectedCell.c] = null;
          this.board8x8[r][c] = movingPiece;
          this.selectedCell = null;
          audio.playClick();
          this.turn = this.turn === 1 ? 2 : 1;
        }
      }
    }

    if (context.isMultiplayer && context.sendNetworkPacket) {
      context.sendNetworkPacket('BOARD_MOVE', { r, c, turn: this.turn });
    }
  }

  private makeAIMove(context: GameEngineContext) {
    if (this.turn !== 2 || this.winner !== 0) return;

    if (this.gameType === 'connect-four') {
      const col = Math.floor(Math.random() * 7);
      this.handleAction(0, col, context);
    } else if (this.gameType === 'tic-tac-toe') {
      const empty: [number, number][] = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (this.tttBoard[r][c] === 0) empty.push([r, c]);
        }
      }
      if (empty.length > 0) {
        const [r, c] = empty[Math.floor(Math.random() * empty.length)];
        this.handleAction(r, c, context);
      }
    } else {
      // Random piece move
      const blackPieces: { r: number; c: number }[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (this.board8x8[r][c]?.startsWith('b_')) blackPieces.push({ r, c });
        }
      }
      if (blackPieces.length > 0) {
        const p = blackPieces[Math.floor(Math.random() * blackPieces.length)];
        const targetR = Math.min(7, p.r + 1);
        const targetC = Math.max(0, Math.min(7, p.c + (Math.random() > 0.5 ? 1 : -1)));
        this.board8x8[targetR][targetC] = this.board8x8[p.r][p.c];
        this.board8x8[p.r][p.c] = null;
        this.turn = 1;
        audio.playClick();
      }
    }
  }

  private checkConnectFourWin(context: GameEngineContext) {
    const b = this.connectFourBoard;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        const p = b[r][c];
        if (p === 0) continue;
        // Horizontal
        if (c + 3 < 7 && b[r][c + 1] === p && b[r][c + 2] === p && b[r][c + 3] === p) this.declareWin(p, context);
        // Vertical
        if (r + 3 < 6 && b[r + 1][c] === p && b[r + 2][c] === p && b[r + 3][c] === p) this.declareWin(p, context);
        // Diagonal
        if (r + 3 < 6 && c + 3 < 7 && b[r + 1][c + 1] === p && b[r + 2][c + 2] === p && b[r + 3][c + 3] === p) this.declareWin(p, context);
        if (r - 3 >= 0 && c + 3 < 7 && b[r - 1][c + 1] === p && b[r - 2][c + 2] === p && b[r - 3][c + 3] === p) this.declareWin(p, context);
      }
    }
  }

  private checkTTTWin(context: GameEngineContext) {
    const b = this.tttBoard;
    for (let i = 0; i < 3; i++) {
      if (b[i][0] !== 0 && b[i][0] === b[i][1] && b[i][1] === b[i][2]) return this.declareWin(b[i][0], context);
      if (b[0][i] !== 0 && b[0][i] === b[1][i] && b[1][i] === b[2][i]) return this.declareWin(b[0][i], context);
    }
    if (b[0][0] !== 0 && b[0][0] === b[1][1] && b[1][1] === b[2][2]) return this.declareWin(b[0][0], context);
    if (b[0][2] !== 0 && b[0][2] === b[1][1] && b[1][1] === b[2][0]) return this.declareWin(b[0][2], context);
  }

  private declareWin(player: number, context: GameEngineContext) {
    this.winner = player as 1 | 2;
    audio.playVictory();
    context.unlockAchievement('first-win');
    context.onGameOver(1000, player === 1);
  }

  public render(context: GameEngineContext) {
    const { ctx, width, height } = context;

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    if (this.gameType === 'connect-four') {
      this.renderConnectFour(ctx, width, height);
    } else if (this.gameType === 'tic-tac-toe') {
      this.renderTTT(ctx, width, height);
    } else {
      this.renderChessCheckers(ctx, width, height);
    }
  }

  private renderConnectFour(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cellSize = 52;
    const startX = (width - 7 * cellSize) / 2;
    const startY = (height - 6 * cellSize) / 2;

    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.roundRect(startX - 12, startY - 12, 7 * cellSize + 24, 6 * cellSize + 24, 16);
    ctx.fill();

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        const val = this.connectFourBoard[r][c];
        const cx = startX + c * cellSize + cellSize / 2;
        const cy = startY + r * cellSize + cellSize / 2;

        ctx.fillStyle = val === 1 ? '#ef4444' : val === 2 ? '#fbbf24' : '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
        ctx.fill();

        // Cursor indicator
        if (this.cursor.c === c && this.cursor.r === r) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CONNECT FOUR - TURN: ${this.turn === 1 ? 'RED (PLAYER 1)' : 'YELLOW (PLAYER 2 / AI)'}`, width / 2, startY - 24);
  }

  private renderTTT(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cellSize = 90;
    const startX = (width - 3 * cellSize) / 2;
    const startY = (height - 3 * cellSize) / 2;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    // Grid lines
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(startX + i * cellSize, startY);
      ctx.lineTo(startX + i * cellSize, startY + 3 * cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startX, startY + i * cellSize);
      ctx.lineTo(startX + 3 * cellSize, startY + i * cellSize);
      ctx.stroke();
    }

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const val = this.tttBoard[r][c];
        const cx = startX + c * cellSize + cellSize / 2;
        const cy = startY + r * cellSize + cellSize / 2;

        if (val === 1) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(cx - 24, cy - 24);
          ctx.lineTo(cx + 24, cy + 24);
          ctx.moveTo(cx + 24, cy - 24);
          ctx.lineTo(cx - 24, cy + 24);
          ctx.stroke();
        } else if (val === 2) {
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(cx, cy, 26, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (this.cursor.r === r && this.cursor.c === c) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
          ctx.fillRect(startX + c * cellSize, startY + r * cellSize, cellSize, cellSize);
        }
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`TIC-TAC-TOE - TURN: ${this.turn === 1 ? 'X' : 'O'}`, width / 2, startY - 24);
  }

  private renderChessCheckers(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cellSize = Math.floor(Math.min(width, height) * 0.8 / 8);
    const startX = (width - 8 * cellSize) / 2;
    const startY = (height - 8 * cellSize) / 2;

    const pieceSymbols: Record<string, string> = {
      w_k: '♔', w_q: '♕', w_r: '♖', w_b: '♗', w_n: '♘', w_p: '♙',
      b_k: '♚', b_q: '♛', b_r: '♜', b_b: '♝', b_n: '♞', b_p: '♟',
      w_c: '⚪', b_c: '🔴'
    };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isWhiteCell = (r + c) % 2 === 0;
        const x = startX + c * cellSize;
        const y = startY + r * cellSize;

        ctx.fillStyle = isWhiteCell ? '#334155' : '#1e293b';
        ctx.fillRect(x, y, cellSize, cellSize);

        // Selected cell highlight
        if (this.selectedCell && this.selectedCell.r === r && this.selectedCell.c === c) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.fillRect(x, y, cellSize, cellSize);
        }

        // Active cursor highlight
        if (this.cursor.r === r && this.cursor.c === c) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        }

        const piece = this.board8x8[r][c];
        if (piece) {
          ctx.fillStyle = piece.startsWith('w_') ? '#f8fafc' : '#a855f7';
          ctx.font = `${cellSize * 0.65}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pieceSymbols[piece] || '●', x + cellSize / 2, y + cellSize / 2 + 2);
        }
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.gameType.toUpperCase()} - TURN: ${this.turn === 1 ? 'WHITE' : 'BLACK'}`, width / 2, startY - 20);
  }

  public handleNetworkPacket(packet: any, context: GameEngineContext) {
    if (packet.type === 'BOARD_MOVE') {
      this.handleAction(packet.data.r, packet.data.c, context);
    }
  }

  public destroy() {
    audio.stopAll();
  }
}
