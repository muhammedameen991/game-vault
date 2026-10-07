import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Gamepad2,
  Users,
  Trophy,
  WifiOff,
  Flame,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  UploadCloud
} from 'lucide-react';

import { GameManifest, GameGenre, PlayerProfile, SystemSettings, MultiplayerRoom } from './types';
import { GAMES_CATALOG } from './data/gamesCatalog';
import { storage } from './core/storage';
import { achievementManager } from './core/achievements';
import { audio } from './core/audio';

import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavView } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';

import { FeaturedHero } from './components/home/FeaturedHero';
import { MultiplayerWidget } from './components/home/MultiplayerWidget';
import { ContinuePlaying } from './components/home/ContinuePlaying';
import { RecentActivity } from './components/home/RecentActivity';
import { YourStats } from './components/home/YourStats';
import { PopularGames } from './components/home/PopularGames';

import { GameCard } from './components/game/GameCard';
import { GameModal } from './components/game/GameModal';
import { MultiplayerRoomModal } from './components/multiplayer/MultiplayerRoomModal';
import { GameImporterModal } from './components/importer/GameImporterModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { DeveloperStudio } from './components/developer/DeveloperStudio';
import { AchievementsView } from './components/achievements/AchievementsView';
import { ProfileView } from './components/profile/ProfileView';
import { CollectionsView } from './components/collections/CollectionsView';
import { OnboardingModal } from './components/profile/OnboardingModal';

export default function App() {
  // Navigation & View state
  const [currentView, setCurrentView] = useState<NavView>('home');
  const [selectedCategory, setSelectedCategory] = useState<GameGenre | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Catalog state (120 default games + imported games)
  const [allGames, setAllGames] = useState<GameManifest[]>(GAMES_CATALOG);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState<number>(0);

  // Active overlays & modals
  const [activeGame, setActiveGame] = useState<GameManifest | null>(null);
  const [activeRoom, setActiveRoom] = useState<MultiplayerRoom | null>(null);
  const [multiplayerModalOpen, setMultiplayerModalOpen] = useState<boolean>(false);
  const [importerModalOpen, setImporterModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [devStudioOpen, setDevStudioOpen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // User Profile & Settings
  const [profile, setProfile] = useState<PlayerProfile>({
    name: 'Gamer',
    level: 1,
    avatar: '🎮',
    gamesPlayed: 0,
    gamesCompleted: 0,
    achievementsUnlocked: 0,
    totalPlayTimeSeconds: 0,
    multiplayerWins: 0,
    favoriteGenre: 'Racing',
    hasOnboarded: false
  });

  const [settings, setSettings] = useState<SystemSettings>({
    theme: 'dark',
    masterVolume: 0.8,
    musicVolume: 0.6,
    effectsVolume: 0.8,
    showFps: true,
    reducedMotion: false,
    highContrast: false,
    developerMode: false
  });

  // Achievement unlock toast
  const [achievementToast, setAchievementToast] = useState<{ title: string; desc: string; icon: string } | null>(null);

  // Online / Offline Status
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Initial Data Load & PWA Service Worker Registration
  useEffect(() => {
    // Register PWA service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load IndexedDB state
    storage.getProfile().then((p) => {
      setProfile(p);
      if (!p.hasOnboarded) {
        setShowOnboarding(true);
      }
    });
    storage.getSettings().then((s) => {
      setSettings(s);
      document.documentElement.setAttribute('data-theme', s.theme);
      audio.setMasterVolume(s.masterVolume);
      audio.setMusicVolume(s.musicVolume);
      audio.setEffectsVolume(s.effectsVolume);
    });
    storage.getFavorites().then(setFavorites);
    storage.getImportedGames().then((imported) => {
      if (imported.length > 0) {
        setAllGames([...imported, ...GAMES_CATALOG]);
      }
    });

    // Subscribe to achievements
    const unsubAch = achievementManager.onUnlock((ach) => {
      setAchievementToast({ title: ach.title, desc: ach.description, icon: ach.icon });
      setTimeout(() => setAchievementToast(null), 4000);
      storage.getProfile().then(setProfile);
    });

    // Global Dev Mode Shortcut (Ctrl + Shift + G)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyG') {
        e.preventDefault();
        setDevStudioOpen((v) => !v);
        audio.playClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
      unsubAch();
    };
  }, []);

  // Update Theme
  const handleThemeChange = useCallback((theme: SystemSettings['theme']) => {
    const updated = { ...settings, theme };
    setSettings(updated);
    document.documentElement.setAttribute('data-theme', theme);
    storage.saveSettings(updated);
  }, [settings]);

  // Favorite toggle
  const handleToggleFavorite = async (gameId: string) => {
    const isFav = await storage.toggleFavorite(gameId);
    audio.playClick();
    if (isFav) {
      setFavorites((f) => [...f, gameId]);
    } else {
      setFavorites((f) => f.filter((id) => id !== gameId));
    }
  };

  // Launch game
  const handlePlayGame = (game: GameManifest) => {
    audio.playClick();
    setActiveGame(game);
  };

  // Filtered games logic (Instant real-time search across 120+ games)
  const filteredGames = useMemo(() => {
    return allGames.filter((g) => {
      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = g.name.toLowerCase().includes(q);
        const matchesGenre = g.genre.toLowerCase().includes(q);
        const matchesDesc = g.description.toLowerCase().includes(q);
        const matchesEngine = g.engine.toLowerCase().includes(q);
        const matchesTags = g.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesPlayerCount =
          (q.includes('2 player') || q.includes('2p')) ? g.players.local >= 2 :
          (q.includes('4 player') || q.includes('4p')) ? g.players.local >= 4 :
          (q.includes('single') || q.includes('solo')) ? g.players.single : false;

        if (!matchesName && !matchesGenre && !matchesDesc && !matchesEngine && !matchesTags && !matchesPlayerCount) {
          return false;
        }
      }

      // View filtering
      if (currentView === 'single-player') return g.players.single;
      if (currentView === 'multiplayer') return g.multiplayer && g.players.online > 1;
      if (currentView === 'local-multiplayer') return g.players.local > 1;
      if (currentView === 'favorites') return favorites.includes(g.id);
      if (currentView === 'my-games') return g.id.startsWith('imported-') || g.id.startsWith('pkg-');

      // Category filtering
      if (selectedCategory !== 'All') return g.genre === selectedCategory;

      return true;
    });
  }, [allGames, searchQuery, currentView, selectedCategory, favorites]);

  // Featured games list
  const featuredGames = useMemo(() => {
    return allGames.filter((g) => g.featured || g.popular).slice(0, 5);
  }, [allGames]);

  const currentFeatured = featuredGames[featuredIndex % featuredGames.length] || allGames[0];

  // Continue playing games list
  const continuePlayingGames = useMemo(() => {
    return allGames.slice(0, 6);
  }, [allGames]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        profile={profile}
        settings={settings}
        onThemeChange={handleThemeChange}
        onOpenDevMode={() => setDevStudioOpen(true)}
        onOpenProfile={() => setCurrentView('achievements')}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* Main Body Layout (Sidebar + Content Stage) */}
      <div className="flex-1 flex max-w-[1920px] w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar
          currentView={currentView}
          selectedCategory={selectedCategory}
          onSelectView={setCurrentView}
          onSelectCategory={setSelectedCategory}
          favoritesCount={favorites.length}
        />

        {/* Content View Stage */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 overflow-y-auto">
          {/* Offline Status Warning Banner if disconnected */}
          {!isOnline && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <WifiOff className="w-4 h-4" />
                Offline Mode Active — All 120+ games and save data remain fully playable via local PWA storage!
              </span>
              <span className="font-mono text-[11px] bg-amber-500/30 px-2 py-0.5 rounded">OFFLINE READY</span>
            </div>
          )}

          {/* Search Query Active Bar */}
          {searchQuery && (
            <div className="mb-6 flex items-center justify-between bg-slate-900 border border-white/10 p-3 rounded-xl">
              <div className="text-sm font-medium text-slate-200">
                Found <span className="text-cyan-400 font-bold">{filteredGames.length}</span> games matching "
                <span className="text-white">{searchQuery}</span>"
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* VIEW: HOME */}
          {currentView === 'home' && !searchQuery ? (
            <div className="space-y-8">
              {/* Top Row: Hero Featured Game + Multiplayer Widget */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <FeaturedHero
                    game={currentFeatured}
                    isFavorite={favorites.includes(currentFeatured.id)}
                    onPlay={handlePlayGame}
                    onToggleFavorite={handleToggleFavorite}
                    onNextFeatured={() => setFeaturedIndex((i) => (i + 1) % featuredGames.length)}
                    onPrevFeatured={() =>
                      setFeaturedIndex((i) => (i - 1 + featuredGames.length) % featuredGames.length)
                    }
                  />
                </div>

                <div>
                  <MultiplayerWidget
                    roomCode="7F3K9"
                    gameName={currentFeatured.name}
                    onOpenRoomModal={() => setMultiplayerModalOpen(true)}
                  />
                </div>
              </div>

              {/* Continue Playing Carousel */}
              <ContinuePlaying games={continuePlayingGames} onPlay={handlePlayGame} />

              {/* Middle Row: Recent Activity & Your Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentActivity />
                <YourStats profile={profile} />
              </div>

              {/* Popular Games Grid */}
              <PopularGames
                games={allGames.filter((g) => g.popular || (g.rating && g.rating >= 4.7))}
                favorites={favorites}
                onPlay={handlePlayGame}
                onToggleFavorite={handleToggleFavorite}
                onSeeAll={() => {
                  setCurrentView('all-games');
                  setSelectedCategory('All');
                }}
              />

              {/* Quick Action Cards (Multiplayer, Importer, Achievements) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                <div
                  onClick={() => setMultiplayerModalOpen(true)}
                  className="bg-[#111827] hover:bg-[#1a2333] border border-white/10 hover:border-cyan-400/40 rounded-2xl p-4 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                        Multiplayer
                      </div>
                      <div className="text-xs text-slate-400">Play with friends via P2P</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </div>

                <div
                  onClick={() => setImporterModalOpen(true)}
                  className="bg-[#111827] hover:bg-[#1a2333] border border-white/10 hover:border-indigo-400/40 rounded-2xl p-4 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                        Import Game
                      </div>
                      <div className="text-xs text-slate-400">Add your own .gvgame files</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </div>

                <div
                  onClick={() => setCurrentView('achievements')}
                  className="bg-[#111827] hover:bg-[#1a2333] border border-white/10 hover:border-amber-400/40 rounded-2xl p-4 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        Achievements
                      </div>
                      <div className="text-xs text-slate-400">126 / 200 unlocked</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Mobile Developer Portfolio Banner */}
              <div className="md:hidden flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-cyan-500/30 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <div className="text-xs text-slate-300">
                    Developed by <span className="text-cyan-400 font-bold">Ameen</span>
                  </div>
                </div>
                <a
                  href="https://iamameen.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow transition-colors flex items-center gap-1"
                >
                  Visit Portfolio
                </a>
              </div>
            </div>
          ) : currentView === 'achievements' ? (
            /* VIEW: ACHIEVEMENTS */
            <AchievementsView />
          ) : currentView === 'collections' ? (
            /* VIEW: COLLECTIONS */
            <CollectionsView
              games={allGames}
              favorites={favorites}
              onPlay={handlePlayGame}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : currentView === 'settings' ? (
            /* VIEW: SETTINGS */
            <div className="max-w-2xl mx-auto">
              <ProfileView profile={profile} onUpdateProfile={setProfile} />
            </div>
          ) : (
            /* VIEW: ALL GAMES / FILTERED CATALOG */
            <div className="space-y-5">
              {/* Title & Category Filter Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-heading text-2xl font-bold text-white capitalize">
                    {currentView.replace('-', ' ')} ({filteredGames.length} Games)
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Play instantly in your browser with zero logins or accounts.
                  </p>
                </div>

                {/* Genre Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {(['All', 'Racing', 'Arcade', 'Puzzle', 'Board', 'Sports', 'Strategy', 'Multiplayer'] as const).map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          selectedCategory === cat
                            ? 'bg-cyan-500 text-black font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Games Grid (120+ games rendered with performance optimizations) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {filteredGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    isFavorite={favorites.includes(game.id)}
                    onPlay={handlePlayGame}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>

              {filteredGames.length === 0 && (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto" />
                  <div className="text-base font-bold text-white">No games matched your search</div>
                  <div className="text-xs">Try searching for "racing", "arcade", "puzzle", or "chess"</div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Bottom Footer (visible on both mobile and desktop) */}
      <footer className="border-t border-white/10 bg-[#080c15] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-slate-400 mb-16 md:mb-0 z-30 relative">
        <div className="flex items-center gap-2">
          <span className="font-heading font-bold text-slate-200">GameVault</span>
          <span className="hidden sm:inline">• Play • Explore • Have Fun</span>
        </div>
        <div className="hidden lg:flex items-center gap-4 text-slate-400">
          <span>No Account Required</span>
          <span>•</span>
          <span>No Backend Needed</span>
          <span>•</span>
          <span>P2P Multiplayer</span>
          <span>•</span>
          <span>Offline Support</span>
          <span>•</span>
          <span>120+ Games</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900 sm:bg-transparent px-3 py-1 sm:p-0 rounded-full border border-white/10 sm:border-0 shadow-sm">
          <span>Developed by</span>
          <a
            href="https://iamameen.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2 transition-colors"
          >
            Ameen (iamameen.vercel.app)
          </a>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav currentView={currentView} onSelectView={setCurrentView} />

      {/* Achievement Toast */}
      {achievementToast && (
        <div className="fixed bottom-16 md:bottom-6 right-6 z-50 bg-[#111827] border border-amber-500/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-2xl flex items-center justify-center shrink-0">
            {achievementToast.icon}
          </div>
          <div>
            <div className="text-[10px] text-amber-400 font-mono uppercase font-bold tracking-wider">
              Achievement Unlocked!
            </div>
            <div className="text-xs font-bold text-white">{achievementToast.title}</div>
            <div className="text-[11px] text-slate-400">{achievementToast.desc}</div>
          </div>
        </div>
      )}

      {/* Interactive Modals */}
      {activeGame && (
        <GameModal
          game={activeGame}
          room={activeRoom}
          isHost={true}
          onClose={() => {
            setActiveGame(null);
            setActiveRoom(null);
          }}
        />
      )}

      {multiplayerModalOpen && (
        <MultiplayerRoomModal
          games={allGames}
          initialGameId={currentFeatured.id}
          onLaunchGame={(game, room) => {
            setMultiplayerModalOpen(false);
            setActiveRoom(room);
            setActiveGame(game);
          }}
          onClose={() => setMultiplayerModalOpen(false)}
        />
      )}

      {importerModalOpen && (
        <GameImporterModal
          onGameInstalled={(newGame) => {
            setAllGames((prev) => [newGame, ...prev]);
            setActiveGame(newGame);
          }}
          onClose={() => setImporterModalOpen(false)}
        />
      )}

      {settingsModalOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={setSettings}
          onClose={() => setSettingsModalOpen(false)}
        />
      )}

      {devStudioOpen && (
        <DeveloperStudio
          onClose={() => setDevStudioOpen(false)}
          onDeployGameToVault={(deployed) => {
            setAllGames((prev) => [deployed, ...prev]);
          }}
        />
      )}

      {showOnboarding && (
        <OnboardingModal
          onComplete={(newProfile) => {
            setProfile(newProfile);
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}
