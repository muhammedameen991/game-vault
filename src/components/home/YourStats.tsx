import React from 'react';
import { Gamepad2, CheckCircle2, Trophy, Clock } from 'lucide-react';
import { PlayerProfile } from '../../types';

interface YourStatsProps {
  profile: PlayerProfile;
}

export const YourStats: React.FC<YourStatsProps> = ({ profile }) => {
  return (
    <div className="bg-[#111827] border border-white/10 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-amber-400" />
        <h3 className="font-heading font-bold text-sm text-white">Your Stats</h3>
      </div>

      {/* Grid of 3 Stat Counters */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
          <Gamepad2 className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <div className="text-base font-bold font-heading text-white">{profile.gamesPlayed}</div>
          <div className="text-[10px] text-slate-400">Games Played</div>
        </div>

        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
          <div className="text-base font-bold font-heading text-white">{profile.gamesCompleted}</div>
          <div className="text-[10px] text-slate-400">Completed</div>
        </div>

        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
          <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-base font-bold font-heading text-white">{profile.achievementsUnlocked}</div>
          <div className="text-[10px] text-slate-400">Achievements</div>
        </div>
      </div>

      {/* Play Time Bar */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" /> Total Play Time
          </span>
          <span className="font-mono text-cyan-300 font-bold">
            {Math.floor(profile.totalPlayTimeSeconds / 3600)}h {Math.floor((profile.totalPlayTimeSeconds % 3600) / 60)}m
          </span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-full w-[70%]" />
        </div>
      </div>
    </div>
  );
};
