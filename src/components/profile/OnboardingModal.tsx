import React, { useState, useRef } from 'react';
import { Camera, Sparkles, Check, Upload, Trash2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PlayerProfile, GameGenre } from '../../types';
import { storage } from '../../core/storage';
import { audio } from '../../core/audio';
import { achievementManager } from '../../core/achievements';

interface OnboardingModalProps {
  onComplete: (profile: PlayerProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState('🎮');
  const [favoriteGenre, setFavoriteGenre] = useState<GameGenre>('Racing');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const presetEmojis = ['🎮', '🏎️', '⚡', '👑', '👾', '🚀', '🧙‍♂️', '🐱', '🔥', '🎯'];
  const genres: GameGenre[] = ['Racing', 'Arcade', 'Puzzle', 'Board', 'Strategy', 'Sports'];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize and optimize image to 256x256 max using offscreen canvas
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
          setAvatarImage(dataUrl);
          setErrorMsg('');
          audio.playClick();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Gamer';

    const newProfile: PlayerProfile = {
      name: finalName,
      level: 1,
      avatar: selectedEmoji,
      avatarImage: avatarImage || undefined,
      gamesPlayed: 0,
      gamesCompleted: 0,
      achievementsUnlocked: 1,
      totalPlayTimeSeconds: 0,
      multiplayerWins: 0,
      favoriteGenre,
      hasOnboarded: true
    };

    await storage.saveProfile(newProfile);
    achievementManager.unlock('first-game');
    audio.playVictory();

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    onComplete(newProfile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#111827] border border-cyan-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-cyan-500/10 flex flex-col relative">
        {/* Top Glowing Header Accent */}
        <div className="h-2 bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Description */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> WELCOME TO GAMEVAULT
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-wide">
              Create Your Gamer Identity
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Your name and profile photo are saved <span className="text-cyan-300 font-semibold">100% locally</span> on your device with no login required.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Display Picture (DP) Upload Section */}
            <div className="flex flex-col items-center">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 p-1 shadow-xl shadow-cyan-500/25 transition-transform group-hover:scale-105">
                  <div className="w-full h-full bg-[#0b0f19] rounded-full overflow-hidden flex items-center justify-center relative">
                    {avatarImage ? (
                      <img src={avatarImage} alt="DP Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">{selectedEmoji}</span>
                    )}

                    {/* Hover Camera Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Upload Plus Badge */}
                <button
                  type="button"
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-cyan-500 text-black hover:bg-cyan-400 shadow-md transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Photo (DP)
                </button>
                {avatarImage && (
                  <button
                    type="button"
                    onClick={() => setAvatarImage(null)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Photo
                  </button>
                )}
              </div>

              {/* Or choose avatar emoji */}
              {!avatarImage && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-xs">
                  {presetEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        audio.playClick();
                      }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-all ${
                        selectedEmoji === emoji
                          ? 'border-cyan-400 bg-cyan-500/20 scale-110 shadow-sm shadow-cyan-500/20'
                          : 'border-white/10 bg-slate-900 hover:bg-slate-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Gamer Handle Name Input */}
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1.5 font-semibold">
                Gamer Name / Handle <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your gamer name (e.g. Ameen, CyberKnight)..."
                className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition-all font-medium"
              />
            </div>

            {/* Favorite Genre */}
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1.5 font-semibold">
                Favorite Genre
              </label>
              <div className="grid grid-cols-3 gap-2">
                {genres.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setFavoriteGenre(g);
                      audio.playClick();
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      favoriteGenre === g
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-400 font-medium text-center">
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-fuchsia-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-fuchsia-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-98"
            >
              <span>Enter GameVault & Play</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
