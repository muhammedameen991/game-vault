import { PlayerInputState } from '../core/input';
import { GameManifest, MultiplayerRoom } from '../types';

export interface GameEngineContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  game: GameManifest;
  playerInputs: PlayerInputState[];
  isMultiplayer: boolean;
  room: MultiplayerRoom | null;
  isHost: boolean;
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number, won: boolean) => void;
  unlockAchievement: (id: string) => void;
  saveData: (key: string, val: any) => Promise<void>;
  loadData: (key: string) => Promise<any>;
  sendNetworkPacket?: (type: string, data: any) => void;
}

export interface IGameEngine {
  init(context: GameEngineContext): void;
  update(dt: number, context: GameEngineContext): void;
  render(context: GameEngineContext): void;
  handleNetworkPacket?(packet: any, context: GameEngineContext): void;
  destroy(): void;
}
