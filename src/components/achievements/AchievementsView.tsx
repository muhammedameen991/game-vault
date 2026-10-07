import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { Achievement } from '../../types';
import { achievementManager } from '../../core/achievements';

export const AchievementsView: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    achievementManager.getAll().then(setAchievements);
    const unsub = achievementManager.onUnlock(() => {
      achievementManager.getAll().then(setAchievements);
    });
    return unsub;
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const filtered = achievements.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-cyan-500/20 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/10">
            🏆
          </div>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">Vault Achievements</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Unlock prestigious trophies across single-player runs and multiplayer battles.
            </p>
          </div>
        </div>

        {/* Total Progress */}
        <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 text-center min-w-[140px]">
          <div className="text-xs text-slate-400 font-mono">PROGRESS</div>
          <div className="text-2xl font-bold font-heading text-amber-400 mt-0.5">
            {unlockedCount} / {achievements.length}
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-cyan-400 rounded-full"
              style={{ width: `${(unlockedCount / (achievements.length || 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'unlocked', 'locked'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
              filter === t
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            {t} ({t === 'all' ? achievements.length : t === 'unlocked' ? unlockedCount : achievements.length - unlockedCount})
          </button>
        ))}
      </div>

      {/* Achievements Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((ach) => (
          <div
            key={ach.id}
            className={`border rounded-2xl p-4 transition-all flex items-start gap-3.5 ${
              ach.unlocked
                ? 'bg-[#111827] border-amber-500/30 shadow-md shadow-amber-500/5'
                : 'bg-slate-950/60 border-white/5 opacity-70'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                ach.unlocked ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-slate-900 border border-white/10'
              }`}
            >
              {ach.icon || '🏆'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-sm font-bold text-white truncate font-heading">{ach.title}</h3>
                {ach.unlocked ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ach.description}</p>

              {/* Progress bar if present */}
              {ach.maxProgress && (
                <div className="mt-2.5">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                    <span>Progress</span>
                    <span>{ach.progress || 0} / {ach.maxProgress}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${Math.min(100, ((ach.progress || 0) / ach.maxProgress) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
