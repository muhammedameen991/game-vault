import React, { useState } from 'react';
import { UploadCloud, X, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';
import JSZip from 'jszip';
import { GameManifest } from '../../types';
import { storage } from '../../core/storage';
import { audio } from '../../core/audio';

interface GameImporterModalProps {
  onGameInstalled: (game: GameManifest) => void;
  onClose: () => void;
}

export const GameImporterModal: React.FC<GameImporterModalProps> = ({
  onGameInstalled,
  onClose
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [detectedGame, setDetectedGame] = useState<GameManifest | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setDetectedGame(null);

    try {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.gvgame') || fileName.endsWith('.zip')) {
        const zip = new JSZip();
        const loaded = await zip.loadAsync(file);

        let manifestFile = loaded.file('game.json') || loaded.file('manifest.json');
        if (!manifestFile) {
          // Look inside subfolder
          const files = Object.keys(loaded.files);
          const found = files.find((f) => f.endsWith('game.json') || f.endsWith('manifest.json'));
          if (found) manifestFile = loaded.file(found);
        }

        if (manifestFile) {
          const content = await manifestFile.async('string');
          const parsed = JSON.parse(content);
          const manifest: GameManifest = {
            id: parsed.id || 'imported-' + Math.random().toString(36).substring(2, 7),
            name: parsed.name || 'Imported Game',
            version: parsed.version || '1.0.0',
            developer: parsed.developer || 'Community Creator',
            genre: parsed.genre || 'Arcade',
            engine: parsed.engine || 'arcade',
            description: parsed.description || 'Imported custom GameVault package.',
            color: parsed.color || '#38bdf8',
            icon: parsed.icon || '📦',
            players: parsed.players || { single: true, local: 2, online: 2 },
            controls: parsed.controls || ['keyboard', 'touch'],
            offline: true,
            multiplayer: parsed.multiplayer !== false
          };
          setDetectedGame(manifest);
          audio.playClick();
        } else {
          // Fallback auto-generated manifest
          const manifest: GameManifest = {
            id: 'pkg-' + Math.random().toString(36).substring(2, 7),
            name: file.name.replace(/\.[^/.]+$/, ''),
            version: '1.0.0',
            developer: 'Ameen',
            genre: 'Arcade',
            engine: 'arcade',
            description: 'Packaged GameVault module',
            color: '#a855f7',
            icon: '🎮',
            players: { single: true, local: 2, online: 2 },
            controls: ['keyboard', 'touch'],
            offline: true,
            multiplayer: true
          };
          setDetectedGame(manifest);
        }
      } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        const htmlText = await file.text();
        const manifest: GameManifest = {
          id: 'html-' + Math.random().toString(36).substring(2, 7),
          name: file.name.replace(/\.[^/.]+$/, ''),
          version: '1.0.0',
          developer: 'Web Game',
          genre: 'Arcade',
          engine: 'arcade',
          description: 'Single-file HTML canvas game',
          color: '#10b981',
          icon: '🌐',
          players: { single: true, local: 1, online: 1 },
          controls: ['keyboard', 'mouse', 'touch'],
          offline: true,
          multiplayer: false,
          customSource: { html: htmlText }
        };
        setDetectedGame(manifest);
      } else {
        setErrorMsg('Unsupported format. Please select a .gvgame, .zip, or HTML game file.');
      }
    } catch (e: any) {
      setErrorMsg(`Failed to parse game package: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInstall = async () => {
    if (!detectedGame) return;
    await storage.saveImportedGame(detectedGame);
    audio.playVictory();
    onGameInstalled(detectedGame);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="h-14 bg-slate-900 border-b border-white/10 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-cyan-400" />
            <h2 className="font-heading font-bold text-base text-white">Game Importer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processFile(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              dragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/15 bg-slate-900/60 hover:border-white/30'
            }`}
            onClick={() => {
              const inputEl = document.createElement('input');
              inputEl.type = 'file';
              inputEl.accept = '.gvgame,.zip,.html';
              inputEl.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) processFile(f);
              };
              inputEl.click();
            }}
          >
            <UploadCloud className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
            <div className="text-sm font-semibold text-white">
              Drop <span className="text-cyan-400 font-mono">.gvgame</span> file here
            </div>
            <div className="text-xs text-slate-400 mt-1">or click to browse local files</div>
            <div className="text-[11px] text-slate-500 font-mono mt-3">
              Supports: .gvgame, .zip, game folder, HTML
            </div>
          </div>

          {/* Processing spinner */}
          {isProcessing && (
            <div className="text-center py-4 text-xs text-slate-400 animate-pulse">
              Validating manifest and unpackaging assets...
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Detected Game Card Preview */}
          {detectedGame && (
            <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-3">
              <div className="text-[11px] text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Game Detected
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-2xl shadow">
                  {detectedGame.icon || <FileCode className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{detectedGame.name}</div>
                  <div className="text-xs text-slate-400">Developer: {detectedGame.developer}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      Offline: Yes
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      Players: 1–{detectedGame.players.local}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleInstall}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md mt-2"
              >
                Install Game to Vault
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
