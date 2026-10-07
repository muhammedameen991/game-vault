export type GameGenre =
  | 'Racing'
  | 'Arcade'
  | 'Puzzle'
  | 'Board'
  | 'Sports'
  | 'Strategy'
  | 'Multiplayer'
  | 'Survival'
  | 'Adventure'
  | 'RPG'
  | 'Card'
  | 'Rhythm'
  | 'Sandbox'
  | 'Physics';

export type EngineType =
  | 'racing'
  | 'arcade'
  | 'puzzle'
  | 'board'
  | 'sports'
  | 'strategy'
  | 'multiplayer'
  | 'card'
  | 'rhythm'
  | 'sandbox';

export interface GameManifest {
  id: string;
  name: string;
  version: string;
  developer: string;
  genre: GameGenre;
  engine: EngineType;
  description: string;
  thumbnail?: string;
  color?: string;
  icon?: string;
  players: {
    single: boolean;
    local: number;
    online: number;
  };
  controls: ('keyboard' | 'touch' | 'gamepad' | 'mouse')[];
  offline: boolean;
  multiplayer: boolean;
  featured?: boolean;
  popular?: boolean;
  rating?: number;
  tags?: string[];
  config?: Record<string, any>;
  customSource?: {
    html?: string;
    js?: string;
    css?: string;
  };
}

export interface PlayerProfile {
  name: string;
  level: number;
  avatar: string;
  avatarImage?: string; // Custom uploaded DP (data URL)
  gamesPlayed: number;
  gamesCompleted: number;
  achievementsUnlocked: number;
  totalPlayTimeSeconds: number;
  multiplayerWins: number;
  favoriteGenre: string;
  hasOnboarded?: boolean;
}

export interface Achievement {
  id: string;
  gameId?: string; // Optional if global
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
  category: 'global' | 'game' | 'developer';
}

export interface GameSaveData {
  gameId: string;
  key: string;
  value: any;
  updatedAt: number;
}

export interface GameStats {
  gameId: string;
  playTimeSeconds: number;
  startedCount: number;
  completedCount: number;
  highScore: number;
  lastPlayedAt: number;
}

export interface GameCollection {
  id: string;
  name: string;
  description?: string;
  gameIds: string[];
  createdAt: number;
}

export interface MultiplayerRoom {
  code: string;
  gameId: string;
  hostId: string;
  hostName: string;
  maxPlayers: number;
  players: {
    id: string;
    name: string;
    ready: boolean;
    isHost: boolean;
    ping?: number;
  }[];
  state: 'waiting' | 'starting' | 'playing' | 'ended';
  gameState?: any;
}

export interface DevProject {
  id: string;
  name: string;
  engine: EngineType;
  version: string;
  description: string;
  players: {
    single: boolean;
    local: number;
    online: number;
  };
  controls: ('keyboard' | 'touch' | 'gamepad' | 'mouse')[];
  html: string;
  js: string;
  css: string;
  assets: { name: string; type: string; dataUrl: string; size: number }[];
  config: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface SystemSettings {
  theme: 'dark' | 'neon' | 'midnight' | 'light';
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  showFps: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  developerMode: boolean;
}
