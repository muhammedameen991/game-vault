import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  QrCode,
  Share2,
  Play,
  LogOut,
  MessageCircle,
  Send,
  Mail,
  Smartphone
} from 'lucide-react';
import { GameManifest, MultiplayerRoom } from '../../types';
import { multiplayer } from '../../core/multiplayer';
import { generateQRCodeSVG } from '../../utils/qr';
import { audio } from '../../core/audio';

interface MultiplayerRoomModalProps {
  games: GameManifest[];
  initialGameId?: string;
  onLaunchGame: (game: GameManifest, room: MultiplayerRoom) => void;
  onClose: () => void;
}

export const MultiplayerRoomModal: React.FC<MultiplayerRoomModalProps> = ({
  games,
  initialGameId = 'neon-racer',
  onLaunchGame,
  onClose
}) => {
  const [selectedGameId, setSelectedGameId] = useState(initialGameId);
  const [currentRoom, setCurrentRoom] = useState<MultiplayerRoom | null>(multiplayer.getCurrentRoom());
  const [copied, setCopied] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  useEffect(() => {
    // If no room currently active and creating, create one
    if (!currentRoom) {
      multiplayer.createRoom(selectedGameId, 4).then((room) => {
        setCurrentRoom(room);
      });
    }

    const unsub = multiplayer.onRoomUpdate((room) => {
      setCurrentRoom(room);
      if (room.state === 'playing') {
        const game = games.find((g) => g.id === room.gameId) || games[0];
        onLaunchGame(game, room);
      }
    });

    return () => {
      unsub();
    };
  }, [selectedGameId, games, onLaunchGame]);

  const joinUrl = typeof window !== 'undefined' && currentRoom
    ? `${window.location.origin}/#/join/${currentRoom.code}`
    : `https://gamevault.app/join/${currentRoom?.code || '7F3K9'}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(joinUrl);
    setCopied(true);
    audio.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    if (!currentRoom) return;
    multiplayer.startGame();
    audio.playVictory();
    const game = games.find((g) => g.id === currentRoom.gameId) || games[0];
    onLaunchGame(game, currentRoom);
  };

  const handleJoinByCode = async () => {
    if (!joinCodeInput.trim()) return;
    audio.playClick();
    const room = await multiplayer.joinRoom(joinCodeInput.trim(), selectedGameId);
    setCurrentRoom(room);
  };

  const handleLeave = () => {
    multiplayer.disconnect();
    setCurrentRoom(null);
    onClose();
  };

  const qrSvg = generateQRCodeSVG(joinUrl, 180, '#38bdf8', '#0f172a');

  // External share protocols
  const shareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Join my GameVault match: ' + joinUrl)}`, '_blank');
  };
  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(joinUrl)}&text=${encodeURIComponent('Join my GameVault match!')}`, '_blank');
  };
  const shareDiscord = () => {
    copyLink();
    alert('Invite link copied to clipboard! Paste it directly into your Discord chat.');
  };
  const shareSMS = () => {
    window.open(`sms:?body=${encodeURIComponent('Join my GameVault match: ' + joinUrl)}`, '_blank');
  };
  const shareEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent('GameVault Match Invite')}&body=${encodeURIComponent('Join me on GameVault: ' + joinUrl)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="h-14 bg-slate-900 border-b border-white/10 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="font-heading font-bold text-base text-white">Multiplayer Room (URL + QR)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-white/10 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
              activeTab === 'create'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            HOST A ROOM
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
              activeTab === 'join'
                ? 'border-indigo-400 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            JOIN EXISTING ROOM
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {activeTab === 'create' ? (
            <>
              {/* Game Selector */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Select Game</label>
                <select
                  value={selectedGameId}
                  onChange={(e) => {
                    setSelectedGameId(e.target.value);
                    multiplayer.createRoom(e.target.value, 4);
                  }}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  {games
                    .filter((g) => g.multiplayer)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.genre}) - Up to {g.players.online}P
                      </option>
                    ))}
                </select>
              </div>

              {/* QR Code and Share Layout (matches screenshot layout) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 border border-white/5 p-4 rounded-xl items-center">
                <div className="flex flex-col items-center text-center">
                  <div
                    className="p-2 rounded-xl border border-cyan-500/30 shadow-lg bg-[#0b0f19]"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                  <div className="text-[11px] text-slate-400 mt-2">
                    Scan with any phone camera to join
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-400">ROOM CODE</div>
                    <div className="text-2xl font-bold font-mono text-cyan-400 tracking-widest mt-0.5">
                      {currentRoom?.code || '7F3K9'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-1">INVITE LINK</div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={joinUrl}
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono truncate"
                      />
                      <button
                        onClick={copyLink}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Quick Share Icons (WhatsApp, Telegram, Discord, SMS, Email) */}
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1.5">SHARE VIA</div>
                    <div className="flex gap-2">
                      <button
                        onClick={shareWhatsApp}
                        title="WhatsApp"
                        className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={shareTelegram}
                        title="Telegram"
                        className="p-2 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30 hover:bg-sky-600/30 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={shareDiscord}
                        title="Discord (Copy link)"
                        className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={shareSMS}
                        title="SMS"
                        className="p-2 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/30 transition-colors"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={shareEmail}
                        title="Email"
                        className="p-2 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connected Players List */}
              <div>
                <div className="text-xs font-mono text-slate-400 uppercase mb-2">
                  Connected Players ({currentRoom?.players.length || 1} / 4)
                </div>
                <div className="space-y-2">
                  {currentRoom?.players.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 bg-slate-900 border border-white/5 rounded-xl"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-sm font-semibold text-slate-200">
                          {p.name} {p.isHost && <span className="text-xs text-cyan-400">(Host)</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400">{p.ping || 24}ms</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/20 text-emerald-300">
                          Ready
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Join Room Tab */
            <div className="space-y-4 py-4 text-center">
              <QrCode className="w-12 h-12 text-indigo-400 mx-auto" />
              <h3 className="font-heading text-lg font-bold text-white">Enter Room Code</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Paste the 5-letter room code shared by your friend to connect immediately via WebRTC P2P.
              </p>
              <div className="max-w-xs mx-auto flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 7F3K9"
                  className="flex-1 bg-slate-900 border border-white/20 rounded-xl px-4 py-2 text-center font-mono text-lg font-bold tracking-widest text-cyan-400 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleJoinByCode}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all"
                >
                  Join
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="h-16 bg-slate-900 border-t border-white/10 px-5 flex items-center justify-between">
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 border border-rose-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Leave Room
          </button>

          <button
            onClick={handleStartGame}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            Start Match
          </button>
        </div>
      </div>
    </div>
  );
};
