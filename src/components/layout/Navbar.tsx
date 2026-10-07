import React from 'react';
import { Search, Bell, Moon, Sun, Flame, Sparkles, Terminal, Shield } from 'lucide-react';
import { PlayerProfile, SystemSettings } from '../../types';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  profile: PlayerProfile;
  settings: SystemSettings;
  onThemeChange: (theme: 'dark' | 'neon' | 'midnight' | 'light') => void;
  onOpenDevMode: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  profile,
  settings,
  onThemeChange,
  onOpenDevMode,
  onOpenProfile,
  onOpenSettings
}) => {
  const themes: { id: 'dark' | 'neon' | 'midnight' | 'light'; icon: any; label: string }[] = [
    { id: 'dark', icon: Moon, label: 'Dark' },
    { id: 'neon', icon: Flame, label: 'Neon' },
    { id: 'midnight', icon: Sparkles, label: 'Midnight' },
    { id: 'light', icon: Sun, label: 'Light' }
  ];

  return (
    <header className="h-16 border-b border-white/10 bg-[#0d121f]/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between gap-4">
      {/* Brand Logo & Slogan */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-[2px] shadow-lg shadow-cyan-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="font-heading text-xl font-bold tracking-wider bg-gradient-to-r from-cyan-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent">
              GameVault
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
              120+ GAMES
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">100+ Games • Play Anywhere • No Limits</p>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl mx-2 lg:mx-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search games, genres, tags... (e.g. 2 player racing, puzzle, chess)"
            className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Quick Switcher */}
        <div className="hidden md:flex items-center bg-slate-900 border border-white/10 rounded-lg p-0.5">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = settings.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onThemeChange(t.id)}
                title={`${t.label} Theme`}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  isActive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* Developer Mode Studio Button */}
        <button
          onClick={onOpenDevMode}
          title="Developer Studio (Ctrl+Shift+G)"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-medium transition-all"
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden xl:inline">Dev Studio</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenSettings}
          title="Settings & Notifications"
          className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-white/10 rounded-lg relative transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-1.5 right-1.5 animate-pulse" />
        </button>

        {/* Profile Pill */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-full transition-all group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 p-[1px] shadow overflow-hidden flex items-center justify-center shrink-0">
            {profile.avatarImage ? (
              <img src={profile.avatarImage} alt={profile.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full bg-[#0b0f19] rounded-full flex items-center justify-center text-xs">
                {profile.avatar || '🎮'}
              </div>
            )}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-slate-200 leading-none group-hover:text-cyan-400 transition-colors">
              {profile.name || 'Gamer'}
            </div>
            <div className="text-[10px] text-cyan-400 font-mono mt-0.5">Level {profile.level}</div>
          </div>
        </button>
      </div>
    </header>
  );
};
