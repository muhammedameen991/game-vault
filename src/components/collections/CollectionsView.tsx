import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, Trash2, Play } from 'lucide-react';
import { GameCollection, GameManifest } from '../../types';
import { storage } from '../../core/storage';
import { GameCard } from '../game/GameCard';

interface CollectionsViewProps {
  games: GameManifest[];
  favorites: string[];
  onPlay: (game: GameManifest) => void;
  onToggleFavorite: (gameId: string) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  games,
  favorites,
  onPlay,
  onToggleFavorite
}) => {
  const [collections, setCollections] = useState<GameCollection[]>([]);
  const [activeColId, setActiveColId] = useState<string>('');
  const [newColName, setNewColName] = useState('');

  useEffect(() => {
    storage.getCollections().then((cols) => {
      setCollections(cols);
      if (cols.length > 0) setActiveColId(cols[0].id);
    });
  }, []);

  const handleCreate = async () => {
    if (!newColName.trim()) return;
    const newCol: GameCollection = {
      id: 'col-' + Math.random().toString(36).substring(2, 7),
      name: newColName.trim(),
      gameIds: ['neon-racer', '2048'],
      createdAt: Date.now()
    };
    await storage.saveCollection(newCol);
    setCollections([...collections, newCol]);
    setActiveColId(newCol.id);
    setNewColName('');
  };

  const handleDelete = async (id: string) => {
    await storage.deleteCollection(id);
    const updated = collections.filter((c) => c.id !== id);
    setCollections(updated);
    if (updated.length > 0) setActiveColId(updated[0].id);
  };

  const activeCol = collections.find((c) => c.id === activeColId);
  const colGames = activeCol ? games.filter((g) => activeCol.gameIds.includes(g.id)) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-cyan-400" /> Game Collections
          </h1>
          <p className="text-xs text-slate-400 mt-1">Organize custom playlists for game nights and quick access.</p>
        </div>

        {/* Create Collection Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="New Collection Name..."
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleCreate}
            className="flex items-center gap-1 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Create
          </button>
        </div>
      </div>

      {/* Collection Tabs */}
      <div className="flex flex-wrap gap-2">
        {collections.map((col) => (
          <button
            key={col.id}
            onClick={() => setActiveColId(col.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeColId === col.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'bg-[#111827] text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <span>{col.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {col.gameIds.length}
            </span>
          </button>
        ))}
      </div>

      {/* Active Collection Games */}
      {activeCol && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              {activeCol.name} ({colGames.length} Games)
            </h2>
            <button
              onClick={() => handleDelete(activeCol.id)}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Collection
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {colGames.map((game) => (
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
      )}
    </div>
  );
};
