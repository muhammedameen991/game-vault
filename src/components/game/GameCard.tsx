import React from 'react';
import { Play, Heart, Star, Users, WifiOff } from 'lucide-react';
import { GameManifest } from '../../types';

interface GameCardProps {
  game: GameManifest;
  isFavorite: boolean;
  onPlay: (game: GameManifest) => void;
  onToggleFavorite: (gameId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  isFavorite,
  onPlay,
  onToggleFavorite
}) => {
  return (
    <div className="bg-[#111827] hover:bg-[#192233] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-3 sm:p-3.5 shadow-lg hover:shadow-cyan-500/10 transition-all duration-200 flex flex-col justify-between group">
      {/* Cover / Icon Artwork banner */}
      <div
        className="w-full h-32 rounded-xl flex items-center justify-center relative overflow-hidden shadow-inner cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${game.color || '#3b82f6'}26, #0b0f19)`
        }}
        onClick={() => onPlay(game)}
      >
        <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300">
          {game.icon || '🎮'}
        </div>

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <div className="w-11 h-11 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-lg transform active:scale-90 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(game.id);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 backdrop-blur-sm transition-colors"
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
        </button>

        {/* Rating badge */}
        {game.rating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-amber-300 font-mono">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{game.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info details */}
      <div className="mt-3 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1">
            <h3
              onClick={() => onPlay(game)}
              className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition-colors truncate cursor-pointer font-heading"
            >
              {game.name}
            </h3>
          </div>

          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {game.description}
          </p>
        </div>

        {/* Bottom tags & controls */}
        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-mono text-cyan-400/90">{game.genre}</span>
          <div className="flex items-center gap-2">
            {game.multiplayer && (
              <span className="flex items-center gap-0.5 text-indigo-300" title="Multiplayer Support">
                <Users className="w-3 h-3" /> {game.players.local}P
              </span>
            )}
            {game.offline && (
              <span className="flex items-center gap-0.5 text-emerald-400" title="Works 100% Offline">
                <WifiOff className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
