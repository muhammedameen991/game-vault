import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Sliders,
  Download,
  Check,
  Moon,
  Flame,
  Sparkles,
  Sun
} from 'lucide-react';
import { SystemSettings } from '../../types';
import { audio } from '../../core/audio';
import { storage } from '../../core/storage';

interface SettingsModalProps {
  settings: SystemSettings;
  onUpdateSettings: (s: SystemSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose
}) => {
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if standalone PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleTheme = (theme: SystemSettings['theme']) => {
    const updated = { ...localSettings, theme };
    setLocalSettings(updated);
    onUpdateSettings(updated);
    storage.saveSettings(updated);
    audio.playClick();
  };

  const handleAudioChange = (type: 'master' | 'music' | 'effects', val: number) => {
    const updated = { ...localSettings };
    if (type === 'master') {
      updated.masterVolume = val;
      audio.setMasterVolume(val);
    } else if (type === 'music') {
      updated.musicVolume = val;
      audio.setMusicVolume(val);
    } else {
      updated.effectsVolume = val;
      audio.setEffectsVolume(val);
    }
    setLocalSettings(updated);
    onUpdateSettings(updated);
    storage.saveSettings(updated);
  };

  const handleToggle = (key: 'showFps' | 'reducedMotion' | 'highContrast') => {
    const updated = { ...localSettings, [key]: !localSettings[key] };
    setLocalSettings(updated);
    onUpdateSettings(updated);
    storage.saveSettings(updated);
    audio.playClick();
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Check if iOS
      const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
      if (isIOS) {
        setShowIOSGuide(true);
      } else {
        alert('GameVault is already running in your modern browser or was already installed to your desktop/homescreen!');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="h-14 bg-slate-900 border-b border-white/10 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="font-heading font-bold text-base text-white">Settings (Themes & Options)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Appearance Theme */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Appearance</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'dark', label: 'Dark', icon: Moon, color: 'bg-slate-900' },
                { id: 'neon', label: 'Neon', icon: Flame, color: 'bg-pink-950/40 text-pink-400' },
                { id: 'midnight', label: 'Midnight', icon: Sparkles, color: 'bg-indigo-950/40 text-indigo-400' },
                { id: 'light', label: 'Light', icon: Sun, color: 'bg-slate-200 text-slate-800' }
              ].map((t) => {
                const Icon = t.icon;
                const active = localSettings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTheme(t.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/15 shadow-md shadow-cyan-500/20'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-semibold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Show FPS Counter</div>
                <div className="text-xs text-slate-400">Display 60 FPS performance overlay in games</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.showFps}
                onChange={() => handleToggle('showFps')}
                className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Reduced Motion</div>
                <div className="text-xs text-slate-400">Minimize animations and intense screen shakes</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.reducedMotion}
                onChange={() => handleToggle('reducedMotion')}
                className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">High Contrast</div>
                <div className="text-xs text-slate-400">Enhance board boundaries and grid visibility</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.highContrast}
                onChange={() => handleToggle('highContrast')}
                className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Audio Sliders */}
          <div className="space-y-4 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              Audio Volumes
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Master Volume</span>
                <span className="font-mono">{Math.round(localSettings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.masterVolume}
                onChange={(e) => handleAudioChange('master', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Music Volume</span>
                <span className="font-mono">{Math.round(localSettings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.musicVolume}
                onChange={(e) => handleAudioChange('music', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Effects Volume</span>
                <span className="font-mono">{Math.round(localSettings.effectsVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.effectsVolume}
                onChange={(e) => handleAudioChange('effects', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* PWA Section */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-white/5">
            <div>
              <div className="text-sm font-semibold text-white">PWA Offline App</div>
              <div className="text-xs text-slate-400">Play all 100+ games without internet connection</div>
            </div>
            {isInstalled ? (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Check className="w-3.5 h-3.5" /> Installed
              </span>
            ) : (
              <button
                onClick={handleInstallApp}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            )}
          </div>

          {/* iOS Guide */}
          {showIOSGuide && (
            <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-indigo-300">How to install on iOS:</div>
              <div>1. Tap the Share button in Safari toolbar.</div>
              <div>2. Scroll down and tap "Add to Home Screen".</div>
            </div>
          )}

          {/* Developer Credit */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Platform Developer</span>
            <a
              href="https://iamameen.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 transition-colors"
            >
              Ameen (iamameen.vercel.app)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
