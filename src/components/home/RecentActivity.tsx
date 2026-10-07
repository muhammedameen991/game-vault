import React from 'react';
import { Gamepad, Trophy, Heart } from 'lucide-react';

export const RecentActivity: React.FC = () => {
  const activities = [
    {
      id: 1,
      type: 'game',
      icon: Gamepad,
      color: 'bg-cyan-500/20 text-cyan-400',
      title: 'You played Neon Racer',
      time: '2 hours ago'
    },
    {
      id: 2,
      type: 'achievement',
      icon: Trophy,
      color: 'bg-amber-500/20 text-amber-400',
      title: 'Achievement unlocked Racing Master',
      time: '5 hours ago'
    },
    {
      id: 3,
      type: 'favorite',
      icon: Heart,
      color: 'bg-rose-500/20 text-rose-400',
      title: 'Added to Favorites Chess',
      time: '1 day ago'
    }
  ];

  return (
    <div className="bg-[#111827] border border-white/10 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-cyan-400" />
        <h3 className="font-heading font-bold text-sm text-white">Recent Activity</h3>
      </div>

      <div className="space-y-3">
        {activities.map((act) => {
          const Icon = act.icon;
          return (
            <div key={act.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-900/60 transition-colors">
              <div className={`p-2 rounded-lg ${act.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate">{act.title}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{act.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
