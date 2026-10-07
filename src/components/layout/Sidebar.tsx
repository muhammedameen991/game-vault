import React from 'react';
import {
  Home,
  Gamepad2,
  User,
  Users,
  Tv,
  Heart,
  Clock,
  Trophy,
  FolderKanban,
  FolderCode,
  UploadCloud,
  Settings,
  Car,
  Zap,
  Puzzle,
  Boxes,
  Swords,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { GameGenre } from '../../types';

export type NavView =
  | 'home'
  | 'all-games'
  | 'single-player'
  | 'multiplayer'
  | 'local-multiplayer'
  | 'favorites'
  | 'recently-played'
  | 'achievements'
  | 'collections'
  | 'my-games'
  | 'import'
  | 'settings';

interface SidebarProps {
  currentView: NavView;
  selectedCategory: GameGenre | 'All';
  onSelectView: (view: NavView) => void;
  onSelectCategory: (category: GameGenre | 'All') => void;
  favoritesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  selectedCategory,
  onSelectView,
  onSelectCategory,
  favoritesCount
}) => {
  const mainNavItems = [
    { id: 'home' as NavView, label: 'Home', icon: Home },
    { id: 'all-games' as NavView, label: 'All Games', icon: Gamepad2 },
    { id: 'single-player' as NavView, label: 'Single Player', icon: User },
    { id: 'multiplayer' as NavView, label: 'Multiplayer', icon: Users, badge: 'P2P' },
    { id: 'local-multiplayer' as NavView, label: 'Local Multiplayer', icon: Tv, badge: '1-4P' },
    { id: 'favorites' as NavView, label: 'Favorites', icon: Heart, count: favoritesCount },
    { id: 'recently-played' as NavView, label: 'Recently Played', icon: Clock },
    { id: 'achievements' as NavView, label: 'Achievements', icon: Trophy },
    { id: 'collections' as NavView, label: 'Collections', icon: FolderKanban },
    { id: 'my-games' as NavView, label: 'My Games', icon: FolderCode },
    { id: 'import' as NavView, label: 'Import Game', icon: UploadCloud },
    { id: 'settings' as NavView, label: 'Settings', icon: Settings }
  ];

  const categories: { id: GameGenre; label: string; icon: any; color: string }[] = [
    { id: 'Racing', label: 'Racing', icon: Car, color: 'text-cyan-400 bg-cyan-400/10' },
    { id: 'Arcade', label: 'Arcade', icon: Zap, color: 'text-amber-400 bg-amber-400/10' },
    { id: 'Puzzle', label: 'Puzzle', icon: Puzzle, color: 'text-purple-400 bg-purple-400/10' },
    { id: 'Board', label: 'Board', icon: Boxes, color: 'text-emerald-400 bg-emerald-400/10' },
    { id: 'Strategy', label: 'Strategy', icon: Swords, color: 'text-rose-400 bg-rose-400/10' },
    { id: 'Sports', label: 'Casual / Sports', icon: Sparkles, color: 'text-blue-400 bg-blue-400/10' }
  ];

  return (
    <aside className="w-64 bg-[#0d121f] border-r border-white/10 shrink-0 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto hidden md:flex flex-col py-4 px-3">
      {/* Navigation Links */}
      <div className="space-y-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-cyan-500/20 text-cyan-300">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && item.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="my-4 border-t border-white/10" />

      {/* Game Categories */}
      <div>
        <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 tracking-wider uppercase font-mono">
          Game Categories
        </div>
        <div className="space-y-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id && currentView === 'all-games';
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectView('all-games');
                  onSelectCategory(cat.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-white/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${cat.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{cat.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-white/10 px-2">
        <a
          href="https://iamameen.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-cyan-500/30 transition-all group"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <div className="text-[11px] text-slate-400 group-hover:text-slate-300">
              Developed by <span className="text-cyan-400 font-bold group-hover:underline">Ameen</span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
        </a>
      </div>
    </aside>
  );
};
