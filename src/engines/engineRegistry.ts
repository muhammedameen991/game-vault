import { EngineType } from '../types';
import { IGameEngine } from './types';
import { RacingEngine } from './racingEngine';
import { ArcadeEngine } from './arcadeEngine';
import { PuzzleEngine } from './puzzleEngine';
import { BoardEngine } from './boardEngine';
import { SportsEngine } from './sportsEngine';
import { StrategyEngine } from './strategyEngine';
import { MultiplayerEngine } from './multiplayerEngine';
import { CardEngine } from './cardEngine';
import { RhythmEngine } from './rhythmEngine';
import { SandboxEngine } from './sandboxEngine';

export function createEngine(type: EngineType): IGameEngine {
  switch (type) {
    case 'racing':
      return new RacingEngine();
    case 'arcade':
      return new ArcadeEngine();
    case 'puzzle':
      return new PuzzleEngine();
    case 'board':
      return new BoardEngine();
    case 'sports':
      return new SportsEngine();
    case 'strategy':
      return new StrategyEngine();
    case 'multiplayer':
      return new MultiplayerEngine();
    case 'card':
      return new CardEngine();
    case 'rhythm':
      return new RhythmEngine();
    case 'sandbox':
      return new SandboxEngine();
    default:
      return new ArcadeEngine();
  }
}
