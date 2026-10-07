import React from 'react';
import { Home, Gamepad2, Trophy, FolderKanban, Settings } from 'lucide-react';
import { NavView } from './Sidebar';

interface MobileNavProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentView, onSelectView }) => {
  const items = [
    { id: 'home' as NavView, label: 'Home', icon: Home },
    { id: 'all-games' as NavView, label: 'Games', icon: Gamepad2 },
    { id: 'achievements' as NavView, label: 'Achievements', icon: Trophy },
    { id: 'collections' as NavView, label: 'Collections', icon: FolderKanban },
    { id: 'settings' as NavView, label: 'Settings', icon: Settings }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d121f]/95 backdrop-blur-lg border-t border-white/10 px-2 py-1.5 flex items-center justify-around">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium transition-all ${
              isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
