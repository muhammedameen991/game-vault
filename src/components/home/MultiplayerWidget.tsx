import React, { useState } from 'react';
import { Users, Copy, Check, Plus, Wifi } from 'lucide-react';
import { generateQRCodeSVG } from '../../utils/qr';

interface MultiplayerWidgetProps {
  roomCode: string;
  gameName: string;
  onOpenRoomModal: () => void;
}

export const MultiplayerWidget: React.FC<MultiplayerWidgetProps> = ({
  roomCode,
  gameName,
  onOpenRoomModal
}) => {
  const [copied, setCopied] = useState(false);
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/#/join/${roomCode}`
    : `https://gamevault.app/join/${roomCode}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrSvg = generateQRCodeSVG(joinUrl, 68, '#ffffff', 'transparent');

  return (
    <div className="bg-[#111827] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <h3 className="font-heading font-bold text-sm text-white">Multiplayer Room</h3>
        </div>
        <button
          onClick={onOpenRoomModal}
          className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Room
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-2">
        Share this link or QR code to invite friends directly:
      </p>

      {/* URL + Copy Input Box */}
      <div className="mt-3 relative flex items-center">
        <input
          type="text"
          readOnly
          value={joinUrl}
          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3 pr-9 py-2 text-xs text-slate-300 font-mono focus:outline-none"
        />
        <button
          onClick={copyLink}
          title="Copy Link"
          className="absolute right-2 p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Room Details & QR Preview */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-300">{gameName} • 4 Players</div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Room Code:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold text-xs tracking-wider border border-cyan-500/20">
              {roomCode}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Wifi className="w-3 h-3 text-emerald-400" /> Room Ready
          </div>
        </div>

        {/* Live SVG QR Code */}
        <div
          onClick={onOpenRoomModal}
          className="p-1.5 bg-slate-900 border border-white/10 rounded-xl hover:border-cyan-400/50 cursor-pointer transition-colors shadow-inner"
          title="Click to view large QR Code"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </div>
    </div>
  );
};
