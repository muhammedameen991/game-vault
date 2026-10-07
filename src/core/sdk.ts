import { storage } from './storage';
import { audio } from './audio';
import { input } from './input';
import { achievementManager } from './achievements';
import { multiplayer } from './multiplayer';

export class GameVaultSDK {
  private activeGameId: string | null = null;
  private isPaused: boolean = false;
  private gameListeners: Map<string, Function> = new Map();

  public launchGame(gameId: string) {
    this.activeGameId = gameId;
    this.isPaused = false;
    storage.recordGamePlayed(gameId);
  }

  public pauseGame() {
    this.isPaused = true;
    this.gameListeners.get('pause')?.();
  }

  public resumeGame() {
    this.isPaused = false;
    this.gameListeners.get('resume')?.();
  }

  public exitGame() {
    this.activeGameId = null;
    this.isPaused = false;
    audio.stopAll();
    input.resetAll();
  }

  public async save(key: string, value: any) {
    if (!this.activeGameId) return;
    await storage.saveGameData(this.activeGameId, key, value);
  }

  public async load(key: string): Promise<any> {
    if (!this.activeGameId) return null;
    return storage.loadGameData(this.activeGameId, key);
  }

  public async getSettings() {
    return storage.getSettings();
  }

  public async getStatistics() {
    if (!this.activeGameId) return null;
    return storage.get('statistics', this.activeGameId);
  }

  public async unlockAchievement(achievementId: string, gameId?: string) {
    const targetGame = gameId || this.activeGameId || undefined;
    return achievementManager.unlock(achievementId, targetGame);
  }

  public getInput(playerIndex = 0) {
    return input.getPlayerInput(playerIndex);
  }

  public async getPlayer() {
    return storage.getProfile();
  }

  // --- Multiplayer ---
  public async createRoom(maxPlayers = 4) {
    return multiplayer.createRoom(this.activeGameId || 'custom-game', maxPlayers);
  }

  public async joinRoom(roomCode: string) {
    return multiplayer.joinRoom(roomCode, this.activeGameId || 'custom-game');
  }

  public send(targetPlayerId: string, data: any) {
    multiplayer.send(targetPlayerId, {
      type: 'EVENT',
      senderId: multiplayer.getPlayerId(),
      timestamp: Date.now(),
      data
    });
  }

  public broadcast(data: any) {
    multiplayer.broadcast({
      type: 'EVENT',
      senderId: multiplayer.getPlayerId(),
      timestamp: Date.now(),
      data
    });
  }

  public onMessage(callback: (packet: any) => void) {
    return multiplayer.onMessage(callback);
  }

  public getPlayers() {
    return multiplayer.getCurrentRoom()?.players || [];
  }

  public getHost() {
    const room = multiplayer.getCurrentRoom();
    return room?.players.find((p) => p.isHost) || null;
  }

  public disconnect() {
    multiplayer.disconnect();
  }

  public syncState(state: any) {
    multiplayer.syncState(state);
  }
}

export const GameVault = new GameVaultSDK();

// Attach to global window
if (typeof window !== 'undefined') {
  (window as any).GameVault = GameVault;
}
