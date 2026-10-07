import React from 'react';
import { GameManifest } from '../../types';
import { GameCard } from '../game/GameCard';

interface PopularGamesProps {
  games: GameManifest[];
  favorites: string[];
  onPlay: (game: GameManifest) => void;
  onToggleFavorite: (gameId: string) => void;
  onSeeAll: () => void;
}

export const PopularGames: React.FC<PopularGamesProps> = ({
  games,
  favorites,
  onPlay,
  onToggleFavorite,
  onSeeAll
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-white tracking-wide">Popular Games</h2>
        <button
          onClick={onSeeAll}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
        >
          See All ({games.length})
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {games.slice(0, 6).map((game) => (
          <GameCard
            key={game.id}
            game={game}
            isFavorite={favorites.includes(game.id)}
            onPlay={onPlay}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
};
