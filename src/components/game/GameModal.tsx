import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Maximize,
  Volume2,
  VolumeX,
  RotateCcw,
  Pause,
  Play,
  Gamepad,
  Keyboard,
  Smartphone,
  Trophy,
  AlertTriangle
} from 'lucide-react';
import { GameManifest, MultiplayerRoom } from '../../types';
import { createEngine } from '../../engines/engineRegistry';
import { IGameEngine, GameEngineContext } from '../../engines/types';
import { input } from '../../core/input';
import { audio } from '../../core/audio';
import { GameVault } from '../../core/sdk';
import { achievementManager } from '../../core/achievements';
import { storage } from '../../core/storage';

interface GameModalProps {
  game: GameManifest;
  room?: MultiplayerRoom | null;
  isHost?: boolean;
  onClose: () => void;
}

export const GameModal: React.FC<GameModalProps> = ({
  game,
  room = null,
  isHost = true,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(audio.getMuted());
  const [gameOverData, setGameOverData] = useState<{ score: number; won: boolean } | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [gamepadsConnected, setGamepadsConnected] = useState<number>(0);
  const [touchControlsVisible, setTouchControlsVisible] = useState<boolean>(false);

  const engineRef = useRef<IGameEngine | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Load existing high score
  useEffect(() => {
    storage.get<any>('statistics', game.id).then((st) => {
      if (st && st.highScore) setHighScore(st.highScore);
    });
    // Check if touch device
    if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      setTouchControlsVisible(true);
    }
  }, [game.id]);

  // Restart game
  const startGame = useCallback(() => {
    setGameOverData(null);
    setEngineError(null);
    setScore(0);
    setIsPaused(false);

    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }

    GameVault.launchGame(game.id);

    try {
      const engine = createEngine(game.engine);
      engineRef.current = engine;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const context: GameEngineContext = {
        canvas,
        ctx,
        width: canvas.width,
        height: canvas.height,
        game,
        playerInputs: [
          input.getPlayerInput(0),
          input.getPlayerInput(1),
          input.getPlayerInput(2),
          input.getPlayerInput(3)
        ],
        isMultiplayer: !!room,
        room,
        isHost,
        onScoreUpdate: (newScore) => {
          setScore(newScore);
          if (newScore > highScore) setHighScore(newScore);
        },
        onGameOver: (finalScore, won) => {
          setGameOverData({ score: finalScore, won });
          storage.saveGameData(game.id, 'last_score', finalScore);
          storage.get<any>('statistics', game.id).then((st) => {
            if (st) {
              st.completedCount += 1;
              if (finalScore > st.highScore) st.highScore = finalScore;
              storage.put('statistics', st);
            }
          });
        },
        unlockAchievement: (id) => {
          achievementManager.unlock(id, game.id);
        },
        saveData: async (key, val) => {
          await storage.saveGameData(game.id, key, val);
        },
        loadData: async (key) => {
          return storage.loadGameData(game.id, key);
        },
        sendNetworkPacket: (type, data) => {
          if (room) {
            GameVault.broadcast({ type, ...data });
          }
        }
      };

      engine.init(context);
    } catch (err: any) {
      console.error('Engine init error:', err);
      setEngineError(err.message || 'Failed to initialize game engine');
    }
  }, [game, room, isHost, highScore]);

  // Main 60FPS Game Loop
  useEffect(() => {
    startGame();

    const loop = (time: number) => {
      const dt = Math.min(0.08, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      const canvas = canvasRef.current;
      if (canvas && engineRef.current && !isPaused && !gameOverData && !engineError) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          try {
            const context: GameEngineContext = {
              canvas,
              ctx,
              width: canvas.width,
              height: canvas.height,
              game,
              playerInputs: [
                input.getPlayerInput(0),
                input.getPlayerInput(1),
                input.getPlayerInput(2),
                input.getPlayerInput(3)
              ],
              isMultiplayer: !!room,
              room,
              isHost,
              onScoreUpdate: (newScore) => {
                setScore(newScore);
              },
              onGameOver: (finalScore, won) => {
                setGameOverData({ score: finalScore, won });
              },
              unlockAchievement: (id) => {
                achievementManager.unlock(id, game.id);
              },
              saveData: async (key, val) => {
                await storage.saveGameData(game.id, key, val);
              },
              loadData: async (key) => {
                return storage.loadGameData(game.id, key);
              }
            };

            engineRef.current.update(dt, context);
            engineRef.current.render(context);
          } catch (err: any) {
            console.error('Engine runtime crash caught:', err);
            setEngineError(err.message || 'The game stopped unexpectedly.');
          }
        }
      }

      setGamepadsConnected(input.getConnectedGamepadCount());
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (engineRef.current) engineRef.current.destroy();
      GameVault.exitGame();
    };
  }, [startGame, isPaused, gameOverData, engineError]);

  const togglePause = () => {
    setIsPaused((p) => {
      if (!p) audio.stopBackgroundMusic();
      else audio.startBackgroundMusic();
      return !p;
    });
  };

  const toggleAudio = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div
        ref={containerRef}
        className="w-full max-w-5xl bg-[#0b0f19] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh]"
      >
        {/* Top Game Bar */}
        <div className="h-14 bg-[#111827] border-b border-white/10 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{game.icon || '🎮'}</span>
            <div>
              <div className="font-heading font-bold text-sm sm:text-base text-white flex items-center gap-2">
                {game.name}
                <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono">
                  {game.genre}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                SCORE: <span className="text-cyan-400 font-bold">{score}</span> | BEST: {highScore}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {gamepadsConnected > 0 && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-1 rounded">
                <Gamepad className="w-3.5 h-3.5" /> GP {gamepadsConnected}
              </span>
            )}

            <button
              onClick={togglePause}
              title={isPaused ? 'Resume' : 'Pause'}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              onClick={startGame}
              title="Restart Game"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleAudio}
              title={isMuted ? 'Unmute' : 'Mute'}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            <button
              onClick={toggleFullscreen}
              title="Fullscreen"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors hidden sm:block"
            >
              <Maximize className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              title="Exit Game"
              className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-950/40 rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Display Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[380px] sm:min-h-[480px]">
          <canvas
            ref={canvasRef}
            width={854}
            height={480}
            className="w-full h-full max-h-[72vh] object-contain aspect-video"
          />

          {/* Paused Overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
              <div className="font-heading text-3xl font-bold text-white tracking-widest">GAME PAUSED</div>
              <div className="flex gap-3">
                <button
                  onClick={togglePause}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all"
                >
                  Resume Game
                </button>
                <button
                  onClick={startGame}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all"
                >
                  Restart
                </button>
              </div>
            </div>
          )}

          {/* Game Over Modal Overlay */}
          {gameOverData && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 animate-in fade-in">
              <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
                <div className="text-4xl mb-2">{gameOverData.won ? '🏆' : '💥'}</div>
                <h3 className="font-heading text-2xl font-bold text-white">
                  {gameOverData.won ? 'VICTORY!' : 'GAME OVER'}
                </h3>
                <div className="my-4 p-3 bg-slate-900 rounded-xl border border-white/5">
                  <div className="text-xs text-slate-400">FINAL SCORE</div>
                  <div className="text-2xl font-bold text-cyan-400 font-mono">{gameOverData.score}</div>
                  {gameOverData.score > highScore && (
                    <div className="text-[11px] text-amber-300 font-semibold mt-1">🎉 NEW PERSONAL HIGH SCORE!</div>
                  )}
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    onClick={startGame}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-all"
                  >
                    Return to GameVault
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sandbox Crash Error Handler */}
          {engineError && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 z-30">
              <div className="bg-rose-950/80 border border-rose-500/40 rounded-2xl p-6 max-w-md w-full text-center">
                <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-2" />
                <h3 className="font-heading text-xl font-bold text-white">GAME ERROR</h3>
                <p className="text-xs text-rose-200 mt-2 font-mono">{engineError}</p>
                <div className="flex justify-center gap-3 mt-5">
                  <button
                    onClick={startGame}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Restart
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    Return to GameVault
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Virtual Touch On-Screen Controls (for Mobile & Tablets) */}
          {touchControlsVisible && !gameOverData && !isPaused && (
            <div className="absolute inset-x-0 bottom-3 px-4 flex items-end justify-between pointer-events-none z-20">
              {/* Virtual D-Pad */}
              <div className="pointer-events-auto grid grid-cols-3 gap-1 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                <div />
                <button
                  onPointerDown={() => input.setTouchInput(0, { up: true })}
                  onPointerUp={() => input.setTouchInput(0, { up: false })}
                  className="w-11 h-11 bg-slate-800/80 active:bg-cyan-500 active:text-black rounded-lg flex items-center justify-center font-bold text-sm text-white"
                >
                  ▲
                </button>
                <div />
                <button
                  onPointerDown={() => input.setTouchInput(0, { left: true })}
                  onPointerUp={() => input.setTouchInput(0, { left: false })}
                  className="w-11 h-11 bg-slate-800/80 active:bg-cyan-500 active:text-black rounded-lg flex items-center justify-center font-bold text-sm text-white"
                >
                  ◀
                </button>
                <div />
                <button
                  onPointerDown={() => input.setTouchInput(0, { right: true })}
                  onPointerUp={() => input.setTouchInput(0, { right: false })}
                  className="w-11 h-11 bg-slate-800/80 active:bg-cyan-500 active:text-black rounded-lg flex items-center justify-center font-bold text-sm text-white"
                >
                  ▶
                </button>
                <div />
                <button
                  onPointerDown={() => input.setTouchInput(0, { down: true })}
                  onPointerUp={() => input.setTouchInput(0, { down: false })}
                  className="w-11 h-11 bg-slate-800/80 active:bg-cyan-500 active:text-black rounded-lg flex items-center justify-center font-bold text-sm text-white"
                >
                  ▼
                </button>
                <div />
              </div>

              {/* Action Buttons A & B */}
              <div className="pointer-events-auto flex gap-2 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                <button
                  onPointerDown={() => input.setTouchInput(0, { action2: true })}
                  onPointerUp={() => input.setTouchInput(0, { action2: false })}
                  className="w-13 h-13 rounded-full bg-slate-800/80 active:bg-purple-500 active:text-black font-bold text-sm text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-lg"
                >
                  B
                </button>
                <button
                  onPointerDown={() => input.setTouchInput(0, { action1: true })}
                  onPointerUp={() => input.setTouchInput(0, { action1: false })}
                  className="w-13 h-13 rounded-full bg-cyan-600/80 active:bg-cyan-400 active:text-black font-bold text-sm text-white border border-cyan-400 flex items-center justify-center shadow-lg"
                >
                  A
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls & Instructions */}
        <div className="bg-[#111827] border-t border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
              P1: <span className="font-mono text-white">WASD / Arrow Keys + Space</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5 text-slate-300">
              P2: <span className="font-mono text-white">Arrow Keys + Enter</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTouchControlsVisible((v) => !v)}
              className="flex items-center gap-1 text-[11px] hover:text-cyan-400 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              {touchControlsVisible ? 'Hide Touch' : 'Show Touch'}
            </button>
            <span className="text-slate-500">|</span>
            <span className="flex items-center gap-1 text-amber-400">
              <Trophy className="w-3.5 h-3.5" /> Achievements Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
