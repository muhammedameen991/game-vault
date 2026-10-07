import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Gamepad2, CheckCircle2, Clock, Swords, Heart, Edit3, Camera, Upload, Trash2 } from 'lucide-react';
import { PlayerProfile, GameStats } from '../../types';
import { storage } from '../../core/storage';
import { audio } from '../../core/audio';

interface ProfileViewProps {
  profile: PlayerProfile;
  onUpdateProfile: (p: PlayerProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [avatarInput, setAvatarInput] = useState(profile.avatar);
  const [avatarImageInput, setAvatarImageInput] = useState<string | null>(profile.avatarImage || null);
  const [, setStats] = useState<GameStats[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    storage.getAll<GameStats>('statistics').then(setStats);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarImageInput(dataUrl);
          audio.playClick();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const updated: PlayerProfile = {
      ...profile,
      name: nameInput.trim() || 'Gamer',
      avatar: avatarInput,
      avatarImage: avatarImageInput || undefined
    };
    onUpdateProfile(updated);
    storage.saveProfile(updated);
    setIsEditing(false);
    audio.playClick();
  };

  const avatars = ['🎮', '🏎️', '⚡', '👑', '👾', '🚀', '🧙‍♂️', '🐱', '🔥', '🎯'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header Banner */}
      <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 p-1 shadow-xl shadow-cyan-500/20 shrink-0">
            <div className="w-full h-full bg-[#0b0f19] rounded-[14px] overflow-hidden flex items-center justify-center text-4xl">
              {profile.avatarImage ? (
                <img src={profile.avatarImage} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.avatar || '🎮'
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">
                {profile.name || 'Gamer'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
                Level {profile.level}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Display picture & game saves stored <span className="text-cyan-400 font-semibold">locally in IndexedDB</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setNameInput(profile.name);
            setAvatarInput(profile.avatar);
            setAvatarImageInput(profile.avatarImage || null);
            setIsEditing(!isEditing);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-white/10"
        >
          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
          {isEditing ? 'Cancel Edit' : 'Edit Profile & DP'}
        </button>
      </div>

      {/* Editing Dialog */}
      {isEditing && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl animate-in fade-in">
          <h3 className="font-heading font-bold text-base text-white">Customize Profile & Display Picture</h3>

          {/* DP Photo Uploader */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-950 rounded-xl border border-white/5">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 p-1 shadow-lg">
                <div className="w-full h-full bg-[#0b0f19] rounded-full overflow-hidden flex items-center justify-center">
                  {avatarImageInput ? (
                    <img src={avatarImageInput} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{avatarInput}</span>
                  )}
                </div>
              </div>
              <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="space-y-1.5 text-center sm:text-left">
              <div className="text-sm font-semibold text-white">Display Picture (DP)</div>
              <p className="text-xs text-slate-400">Upload a custom gamer photo or avatar stored locally on your device.</p>
              <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Photo
                </button>
                {avatarImageInput && (
                  <button
                    type="button"
                    onClick={() => setAvatarImageInput(null)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Gamer Handle</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white w-full max-w-sm focus:outline-none focus:border-cyan-400"
              />
            </div>

            {!avatarImageInput && (
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Or Choose Avatar Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {avatars.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatarInput(av)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${
                        avatarInput === av ? 'border-cyan-400 bg-cyan-500/20 scale-105' : 'border-white/10 bg-slate-950'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Save Profile Changes
            </button>
          </div>
        </div>
      )}

      {/* Primary Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#111827] border border-white/10 rounded-xl p-4 text-center">
          <Gamepad2 className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
          <div className="text-xl font-bold font-heading text-white">{profile.gamesPlayed}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Games Played</div>
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
          <div className="text-xl font-bold font-heading text-white">{profile.gamesCompleted}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Completed</div>
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-xl p-4 text-center">
          <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
          <div className="text-xl font-bold font-heading text-white">{profile.achievementsUnlocked}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Achievements</div>
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
          <div className="text-xl font-bold font-heading text-white">
            {Math.floor(profile.totalPlayTimeSeconds / 3600)}h
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Play Time</div>
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-xl p-4 text-center">
          <Swords className="w-5 h-5 text-rose-400 mx-auto mb-1.5" />
          <div className="text-xl font-bold font-heading text-white">{profile.multiplayerWins}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">P2P Wins</div>
        </div>

        <div className="bg-[#111827] border border-white/10 rounded-xl p-4 text-center">
          <Heart className="w-5 h-5 text-pink-400 mx-auto mb-1.5" />
          <div className="text-xl font-bold font-heading text-white truncate">{profile.favoriteGenre}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Fav Genre</div>
        </div>
      </div>
    </div>
  );
};
