import React from 'react';
import { Play, Heart, Users, WifiOff, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { GameManifest } from '../../types';

interface FeaturedHeroProps {
  game: GameManifest;
  isFavorite: boolean;
  onPlay: (game: GameManifest) => void;
  onToggleFavorite: (gameId: string) => void;
  onNextFeatured?: () => void;
  onPrevFeatured?: () => void;
}

export const FeaturedHero: React.FC<FeaturedHeroProps> = ({
  game,
  isFavorite,
  onPlay,
  onToggleFavorite,
  onNextFeatured,
  onPrevFeatured
}) => {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950 group">
      {/* Background Neon City Artwork / Dynamic Gradient Simulation */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#070b18] via-[#0f172a]/90 to-transparent z-10" />

      {/* Cyberpunk Visual Canvas / Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-60"
        style={{
          background: `radial-gradient(ellipse at 80% 50%, rgba(56, 189, 248, 0.35), rgba(168, 85, 247, 0.25), rgba(15, 23, 42, 0.95)), linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #431407 100%)`
        }}
      >
        {/* Decorative Grid Lines */}
        <div
          className="w-full h-full opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(56, 189, 248, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Hero Content */}
      <div className="relative z-20 p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[320px] sm:min-h-[360px]">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Featured
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 text-xs font-medium border border-white/10">
            {game.genre} • Arcade
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
            <WifiOff className="w-3 h-3 text-emerald-400" /> Offline
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium">
            <Users className="w-3 h-3 text-indigo-400" /> Multiplayer
          </span>
        </div>

        {/* Title & Description */}
        <div className="max-w-xl my-4">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-heading text-white drop-shadow-md">
            {game.name}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            {game.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> 1–4 Local Players
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" /> 2–4 Online P2P
            </span>
            <span className="text-slate-400">Controls: Keyboard • Touch • Gamepad</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => onPlay(game)}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            Play Now
          </button>

          <button
            onClick={() => onToggleFavorite(game.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              isFavorite
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-400 text-rose-400' : 'text-slate-400'}`} />
            <span>{isFavorite ? 'Favorited' : 'Add to Favorites'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Arrows for Carousel */}
      {onPrevFeatured && (
        <button
          onClick={onPrevFeatured}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {onNextFeatured && (
        <button
          onClick={onNextFeatured}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
