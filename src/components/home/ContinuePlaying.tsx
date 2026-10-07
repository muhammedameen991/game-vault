import React from 'react';
import { Play } from 'lucide-react';
import { GameManifest } from '../../types';

interface ContinuePlayingProps {
  games: GameManifest[];
  onPlay: (game: GameManifest) => void;
}

export const ContinuePlaying: React.FC<ContinuePlayingProps> = ({ games, onPlay }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-white tracking-wide">Continue Playing</h2>
        <span className="text-xs text-slate-400 font-mono">Recent Sessions</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {games.map((game, idx) => {
          // Simulated progress for continue playing
          const progressPercent = [72, 35, 60, 20, 85, 45][idx % 6];
          return (
            <div
              key={game.id}
              onClick={() => onPlay(game)}
              className="bg-[#111827] hover:bg-[#1a2333] border border-white/10 hover:border-cyan-400/40 rounded-xl p-3 cursor-pointer transition-all duration-200 group flex flex-col justify-between"
            >
              {/* Thumbnail banner */}
              <div
                className="w-full h-24 rounded-lg flex items-center justify-center text-3xl shadow-inner relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${game.color || '#3b82f6'}33, #0f172a)`
                }}
              >
                <span>{game.icon || '🎮'}</span>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Play className="w-7 h-7 text-white fill-white" />
                </div>
              </div>

              {/* Info */}
              <div className="mt-2.5">
                <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
                  {game.name}
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between mt-1">
                  <span>{game.genre}</span>
                  <span className="text-cyan-400">{progressPercent}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
