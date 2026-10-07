import {
  PlayerProfile,
  Achievement,
  GameSaveData,
  GameStats,
  GameCollection,
  DevProject,
  SystemSettings,
  GameManifest
} from '../types';

const DB_NAME = 'GameVault_DB';
const DB_VERSION = 2;

const STORES = [
  'games',
  'saves',
  'profiles',
  'settings',
  'achievements',
  'statistics',
  'favorites',
  'collections',
  'recentGames',
  'importedGames',
  'gamePackages',
  'devProjects'
] as const;

type StoreName = typeof STORES[number];

class StorageManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store)) {
            if (store === 'saves') {
              const s = db.createObjectStore(store, { keyPath: ['gameId', 'key'] });
              s.createIndex('by_game', 'gameId', { unique: false });
            } else if (store === 'statistics') {
              db.createObjectStore(store, { keyPath: 'gameId' });
            } else if (store === 'recentGames') {
              const s = db.createObjectStore(store, { keyPath: 'gameId' });
              s.createIndex('by_playedAt', 'lastPlayedAt', { unique: false });
            } else if (store === 'favorites') {
              db.createObjectStore(store, { keyPath: 'gameId' });
            } else if (store === 'achievements') {
              db.createObjectStore(store, { keyPath: 'id' });
            } else if (store === 'collections') {
              db.createObjectStore(store, { keyPath: 'id' });
            } else if (store === 'devProjects') {
              db.createObjectStore(store, { keyPath: 'id' });
            } else if (store === 'importedGames') {
              db.createObjectStore(store, { keyPath: 'id' });
            } else {
              db.createObjectStore(store, { keyPath: 'id' });
            }
          }
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private async getStore(storeName: StoreName, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.initDB();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Generic key-value helpers
  async get<T>(storeName: StoreName, key: IDBValidKey | IDBKeyRange): Promise<T | null> {
    try {
      const store = await this.getStore(storeName, 'readonly');
      return new Promise((resolve) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      console.warn(`Storage get error in ${storeName}:`, e);
      return null;
    }
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    try {
      const store = await this.getStore(storeName, 'readonly');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      console.warn(`Storage getAll error in ${storeName}:`, e);
      return [];
    }
  }

  async put(storeName: StoreName, value: any): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.put(value);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`Storage put error in ${storeName}:`, e);
    }
  }

  async delete(storeName: StoreName, key: IDBValidKey | IDBKeyRange): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`Storage delete error in ${storeName}:`, e);
    }
  }

  // --- Profile ---
  async getProfile(): Promise<PlayerProfile> {
    const defaultProfile: PlayerProfile = {
      name: '',
      level: 1,
      avatar: '🎮',
      gamesPlayed: 0,
      gamesCompleted: 0,
      achievementsUnlocked: 0,
      totalPlayTimeSeconds: 0,
      multiplayerWins: 0,
      favoriteGenre: 'Racing',
      hasOnboarded: false
    };
    const stored = await this.get<PlayerProfile>('profiles', 'current_user');
    return stored || defaultProfile;
  }

  async saveProfile(profile: PlayerProfile): Promise<void> {
    await this.put('profiles', { id: 'current_user', ...profile });
  }

  // --- Settings ---
  async getSettings(): Promise<SystemSettings> {
    const defaultSettings: SystemSettings = {
      theme: 'dark',
      masterVolume: 0.8,
      musicVolume: 0.6,
      effectsVolume: 0.8,
      showFps: true,
      reducedMotion: false,
      highContrast: false,
      developerMode: false
    };
    const stored = await this.get<any>('settings', 'system_config');
    return stored ? { ...defaultSettings, ...stored } : defaultSettings;
  }

  async saveSettings(settings: SystemSettings): Promise<void> {
    await this.put('settings', { id: 'system_config', ...settings });
  }

  // --- Favorites ---
  async getFavorites(): Promise<string[]> {
    const items = await this.getAll<{ gameId: string }>('favorites');
    if (items.length === 0) {
      // Default initial favorites
      return ['neon-racer', 'chess', '2048', 'fruit-catch'];
    }
    return items.map((i) => i.gameId);
  }

  async isFavorite(gameId: string): Promise<boolean> {
    const item = await this.get('favorites', gameId);
    return !!item;
  }

  async toggleFavorite(gameId: string): Promise<boolean> {
    const isFav = await this.isFavorite(gameId);
    if (isFav) {
      await this.delete('favorites', gameId);
      return false;
    } else {
      await this.put('favorites', { gameId, addedAt: Date.now() });
      return true;
    }
  }

  // --- Recent Games ---
  async getRecentGames(): Promise<{ gameId: string; lastPlayedAt: number }[]> {
    const items = await this.getAll<{ gameId: string; lastPlayedAt: number }>('recentGames');
    return items.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  }

  async recordGamePlayed(gameId: string): Promise<void> {
    const now = Date.now();
    await this.put('recentGames', { gameId, lastPlayedAt: now });

    // Update stats
    const stats = (await this.get<GameStats>('statistics', gameId)) || {
      gameId,
      playTimeSeconds: 0,
      startedCount: 0,
      completedCount: 0,
      highScore: 0,
      lastPlayedAt: now
    };
    stats.startedCount += 1;
    stats.lastPlayedAt = now;
    await this.put('statistics', stats);

    // Update profile
    const profile = await this.getProfile();
    profile.gamesPlayed += 1;
    await this.saveProfile(profile);
  }

  // --- Game Saves ---
  async saveGameData(gameId: string, key: string, value: any): Promise<void> {
    const record: GameSaveData = {
      gameId,
      key,
      value,
      updatedAt: Date.now()
    };
    await this.put('saves', record);
  }

  async loadGameData(gameId: string, key: string): Promise<any> {
    const record = await this.get<GameSaveData>('saves', [gameId, key] as any);
    return record ? record.value : null;
  }

  // --- Collections ---
  async getCollections(): Promise<GameCollection[]> {
    const cols = await this.getAll<GameCollection>('collections');
    if (cols.length === 0) {
      const defaults: GameCollection[] = [
        { id: 'weekend', name: 'Weekend Games', gameIds: ['neon-racer', 'arena-pong', 'pixel-runner'], createdAt: Date.now() },
        { id: '2player', name: '2 Player Hits', gameIds: ['connect-four', 'chess', 'racing-duel', 'air-hockey'], createdAt: Date.now() },
        { id: 'puzzles', name: 'Brain Teasers', gameIds: ['2048', 'sudoku', 'minesweeper', 'lights-out'], createdAt: Date.now() }
      ];
      for (const d of defaults) {
        await this.put('collections', d);
      }
      return defaults;
    }
    return cols;
  }

  async saveCollection(col: GameCollection): Promise<void> {
    await this.put('collections', col);
  }

  async deleteCollection(id: string): Promise<void> {
    await this.delete('collections', id);
  }

  // --- Dev Projects ---
  async getProjects(): Promise<DevProject[]> {
    return this.getAll<DevProject>('devProjects');
  }

  async saveProject(project: DevProject): Promise<void> {
    await this.put('devProjects', project);
  }

  async deleteProject(id: string): Promise<void> {
    await this.delete('devProjects', id);
  }

  // --- Imported Games ---
  async getImportedGames(): Promise<GameManifest[]> {
    return this.getAll<GameManifest>('importedGames');
  }

  async saveImportedGame(game: GameManifest): Promise<void> {
    await this.put('importedGames', game);
  }

  async deleteImportedGame(id: string): Promise<void> {
    await this.delete('importedGames', id);
  }
}

export const storage = new StorageManager();
