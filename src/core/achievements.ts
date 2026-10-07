import confetti from 'canvas-confetti';
import { Achievement } from '../types';
import { storage } from './storage';
import { audio } from './audio';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-game',
    title: 'First Step',
    description: 'Launch and play your very first game in GameVault.',
    icon: '🎮',
    unlocked: true,
    category: 'global'
  },
  {
    id: 'ten-games',
    title: 'Arcade Explorer',
    description: 'Play 10 different games across the vault.',
    icon: '🧭',
    unlocked: true,
    progress: 10,
    maxProgress: 10,
    category: 'global'
  },
  {
    id: 'fifty-games',
    title: 'Vault Veteran',
    description: 'Play 50 games in GameVault.',
    icon: '⚡',
    unlocked: true,
    progress: 50,
    maxProgress: 50,
    category: 'global'
  },
  {
    id: 'hundred-games',
    title: 'Century Gamer',
    description: 'Play 100 different games in GameVault.',
    icon: '👑',
    unlocked: false,
    progress: 84,
    maxProgress: 100,
    category: 'global'
  },
  {
    id: 'first-win',
    title: 'Victory Royale',
    description: 'Win your first match or reach the finish line.',
    icon: '🏆',
    unlocked: true,
    category: 'global'
  },
  {
    id: 'first-multiplayer',
    title: 'P2P Pioneer',
    description: 'Create or join a peer-to-peer multiplayer room.',
    icon: '🌐',
    unlocked: true,
    category: 'global'
  },
  {
    id: 'ten-multiplayer-wins',
    title: 'Arena Champion',
    description: 'Win 10 multiplayer matches.',
    icon: '⚔️',
    unlocked: false,
    progress: 7,
    maxProgress: 10,
    category: 'global'
  },
  {
    id: 'racing-master',
    title: 'Racing Master',
    description: 'Win 10 racing events or beat track records.',
    icon: '🏎️',
    unlocked: true,
    category: 'global'
  },
  {
    id: 'puzzle-master',
    title: 'Puzzle Master',
    description: 'Complete 10 puzzle challenges.',
    icon: '🧩',
    unlocked: false,
    progress: 7,
    maxProgress: 10,
    category: 'global'
  },
  {
    id: 'arcade-master',
    title: 'Arcade Master',
    description: 'Score over 1,000 points in any arcade game.',
    icon: '👾',
    unlocked: true,
    category: 'global'
  },
  {
    id: 'game-collector',
    title: 'Game Collector',
    description: 'Add 5 games to custom collections or favorites.',
    icon: '📚',
    unlocked: false,
    progress: 28,
    maxProgress: 50,
    category: 'global'
  },
  {
    id: 'vault-master',
    title: 'Vault Master',
    description: 'Unlock 25 total achievements in GameVault.',
    icon: '💎',
    unlocked: false,
    progress: 12,
    maxProgress: 25,
    category: 'global'
  },
  // Developer Achievements
  {
    id: 'first-project',
    title: 'First Project',
    description: 'Create your first game project in Developer Mode.',
    icon: '📁',
    unlocked: false,
    category: 'developer'
  },
  {
    id: 'first-game-created',
    title: 'Game Architect',
    description: 'Test run a custom game in the Developer Studio.',
    icon: '🏗️',
    unlocked: false,
    category: 'developer'
  },
  {
    id: 'first-package',
    title: 'Package Master',
    description: 'Build and export a valid .gvgame package.',
    icon: '📦',
    unlocked: false,
    category: 'developer'
  },
  {
    id: 'perf-optimizer',
    title: 'Performance Optimizer',
    description: 'Inspect performance metrics in the Performance Lab.',
    icon: '⚡',
    unlocked: false,
    category: 'developer'
  }
];

class AchievementManager {
  private achievements: Map<string, Achievement> = new Map();
  private listeners: ((achievement: Achievement) => void)[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    const stored = await storage.getAll<Achievement>('achievements');
    if (stored.length === 0) {
      for (const a of INITIAL_ACHIEVEMENTS) {
        this.achievements.set(a.id, a);
        await storage.put('achievements', a);
      }
    } else {
      for (const a of stored) {
        this.achievements.set(a.id, a);
      }
      // Ensure any missing initial are loaded
      for (const a of INITIAL_ACHIEVEMENTS) {
        if (!this.achievements.has(a.id)) {
          this.achievements.set(a.id, a);
          await storage.put('achievements', a);
        }
      }
    }
  }

  public async getAll(): Promise<Achievement[]> {
    if (this.achievements.size === 0) {
      await this.init();
    }
    return Array.from(this.achievements.values());
  }

  public onUnlock(callback: (achievement: Achievement) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public async unlock(id: string, gameId?: string): Promise<boolean> {
    const achKey = gameId ? `${gameId}-${id}` : id;
    let ach = this.achievements.get(achKey) || this.achievements.get(id);

    if (!ach) {
      // Dynamic game achievement
      ach = {
        id: achKey,
        gameId,
        title: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: `Unlocked in ${gameId || 'GameVault'}`,
        icon: '🏆',
        unlocked: false,
        category: 'game'
      };
      this.achievements.set(achKey, ach);
    }

    if (ach.unlocked) return false;

    ach.unlocked = true;
    ach.unlockedAt = Date.now();
    await storage.put('achievements', ach);

    // Update profile count
    const profile = await storage.getProfile();
    profile.achievementsUnlocked += 1;
    await storage.saveProfile(profile);

    // Audio & Confetti
    audio.playVictory();
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#38bdf8', '#818cf8', '#c084fc', '#f43f5e']
      });
    } catch (e) {}

    // Notify listeners
    this.listeners.forEach((cb) => cb(ach!));
    return true;
  }
}

export const achievementManager = new AchievementManager();
