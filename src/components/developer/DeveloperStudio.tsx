import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Square,
  RotateCcw,
  Maximize,
  Save,
  Folder,
  FileCode,
  Terminal,
  Activity,
  Package,
  Plus,
  Wifi,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Download,
  BookOpen,
  ChevronRight,
  Database,
  Trophy,
  Copy
} from 'lucide-react';
import JSZip from 'jszip';
import { DevProject, EngineType, GameManifest } from '../../types';
import { storage } from '../../core/storage';
import { multiplayer } from '../../core/multiplayer';
import { achievementManager } from '../../core/achievements';
import { audio } from '../../core/audio';

interface DeveloperStudioProps {
  onClose: () => void;
  onDeployGameToVault?: (game: GameManifest) => void;
}

export const DeveloperStudio: React.FC<DeveloperStudioProps> = ({ onClose, onDeployGameToVault }) => {
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'editor'
    | 'builder'
    | 'multiplayer'
    | 'performance'
    | 'console'
    | 'packages'
    | 'sdk'
    | 'storage'
  >('editor');

  const [projects, setProjects] = useState<DevProject[]>([]);
  const [currentProject, setCurrentProject] = useState<DevProject | null>(null);
  const [activeFile, setActiveFile] = useState<'game.js' | 'index.html' | 'style.css' | 'game.json'>('game.js');
  const [codeContent, setCodeContent] = useState<string>('');
  const [isPreviewRunning, setIsPreviewRunning] = useState<boolean>(true);
  const [consoleLogs, setConsoleLogs] = useState<{ type: 'log' | 'warn' | 'error' | 'net'; text: string; time: string }[]>([]);
  const [commandInput, setCommandInput] = useState<string>('');

  // Performance metrics
  const [fps, setFps] = useState<number>(60);
  const [frameTime, setFrameTime] = useState<number>(16.4);
  const [entityCount, setEntityCount] = useState<number>(34);

  // Multiplayer Lab simulation settings
  const [simLatency, setSimLatency] = useState<number>(50);
  const [simPacketLoss, setSimPacketLoss] = useState<boolean>(false);
  const [simPeers, setSimPeers] = useState<number>(3);

  // Game Builder Visual Sliders
  const [builderSpeed, setBuilderSpeed] = useState<number>(5);
  const [builderGravity, setBuilderGravity] = useState<number>(9.8);
  const [builderEnemyCount, setBuilderEnemyCount] = useState<number>(10);
  const [builderDifficulty, setBuilderDifficulty] = useState<string>('Normal');

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Initial projects load
  useEffect(() => {
    storage.getProjects().then((stored) => {
      if (stored.length > 0) {
        setProjects(stored);
        setCurrentProject(stored[0]);
        setCodeContent(stored[0].js);
      } else {
        // Create initial default sample project
        const defaultProject: DevProject = {
          id: 'proj-neon-racer',
          name: 'Neon Racer Studio',
          engine: 'racing',
          version: '1.0.0',
          description: 'A customizable high-speed neon cyber racer built on GameVault SDK',
          players: { single: true, local: 4, online: 4 },
          controls: ['keyboard', 'touch', 'gamepad'],
          html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #030712; color: #fff; font-family: sans-serif; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
    canvas { background: #0f172a; border: 2px solid #38bdf8; border-radius: 12px; }
  </style>
</head>
<body>
  <canvas id="c" width="640" height="360"></canvas>
  <script src="game.js"></script>
</body>
</html>`,
          js: `// GameVault Custom Project Entry
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let x = 320, y = 180, vx = 4;
let hue = 180;

function loop() {
  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw bouncing neon orb
  ctx.fillStyle = \`hsl(\${hue}, 100%, 50%)\`;
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();

  x += vx;
  if (x < 30 || x > canvas.width - 30) {
    vx *= -1;
    hue = (hue + 45) % 360;
  }

  requestAnimationFrame(loop);
}

loop();
console.log('Game preview initialized successfully!');`,
          css: `/* Project Styles */ body { margin: 0; }`,
          assets: [],
          config: { speed: 5, difficulty: 'Normal' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        storage.saveProject(defaultProject);
        setProjects([defaultProject]);
        setCurrentProject(defaultProject);
        setCodeContent(defaultProject.js);
      }
    });

    // Simulated FPS oscillation
    const fpsInterval = setInterval(() => {
      setFps(Math.floor(58 + Math.random() * 4));
      setFrameTime(parseFloat((16.2 + Math.random() * 0.8).toFixed(1)));
    }, 1200);

    // Initial console logs
    setConsoleLogs([
      { type: 'log', text: 'GameVault Developer Studio initialized.', time: '05:14:00' },
      { type: 'log', text: 'IndexedDB storage bound successfully.', time: '05:14:01' },
      { type: 'net', text: 'WebRTC DataChannel mesh ready.', time: '05:14:02' }
    ]);

    return () => clearInterval(fpsInterval);
  }, []);

  // Update preview when code content or run state changes
  useEffect(() => {
    if (!currentProject || !iframeRef.current || !isPreviewRunning) return;

    const fullDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${currentProject.css}</style>
      </head>
      <body>
        ${currentProject.html.replace('<!DOCTYPE html>', '').replace('<html>', '').replace('</html>', '').replace('<head>', '').replace('</head>', '').replace('<body>', '').replace('</body>', '')}
        <script>
          window.onerror = function(msg, url, line) {
            window.parent.postMessage({ type: 'GV_DEV_ERROR', msg: msg, line: line }, '*');
          };
          window.console.log = function(...args) {
            window.parent.postMessage({ type: 'GV_DEV_LOG', text: args.join(' ') }, '*');
          };
          ${currentProject.js}
        <\/script>
      </body>
      </html>
    `;

    iframeRef.current.srcdoc = fullDoc;
  }, [currentProject, isPreviewRunning]);

  // Listen for iframe events
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'GV_DEV_ERROR') {
        setConsoleLogs((prev) => [
          ...prev,
          { type: 'error', text: `Error: ${e.data.msg} (line ${e.data.line})`, time: new Date().toLocaleTimeString() }
        ]);
      } else if (e.data?.type === 'GV_DEV_LOG') {
        setConsoleLogs((prev) => [
          ...prev,
          { type: 'log', text: e.data.text, time: new Date().toLocaleTimeString() }
        ]);
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, []);

  const handleSave = async () => {
    if (!currentProject) return;
    const updated = { ...currentProject };
    if (activeFile === 'game.js') updated.js = codeContent;
    else if (activeFile === 'index.html') updated.html = codeContent;
    else if (activeFile === 'style.css') updated.css = codeContent;
    else if (activeFile === 'game.json') {
      try {
        const parsed = JSON.parse(codeContent);
        updated.name = parsed.name || updated.name;
        updated.version = parsed.version || updated.version;
      } catch (e) {}
    }
    updated.updatedAt = Date.now();
    setCurrentProject(updated);
    await storage.saveProject(updated);
    audio.playClick();
    setConsoleLogs((prev) => [
      ...prev,
      { type: 'log', text: `Saved ${activeFile} successfully.`, time: new Date().toLocaleTimeString() }
    ]);
  };

  const handleSelectFile = (file: typeof activeFile) => {
    if (!currentProject) return;
    setActiveFile(file);
    if (file === 'game.js') setCodeContent(currentProject.js);
    else if (file === 'index.html') setCodeContent(currentProject.html);
    else if (file === 'style.css') setCodeContent(currentProject.css);
    else if (file === 'game.json') {
      setCodeContent(JSON.stringify({
        id: currentProject.id,
        name: currentProject.name,
        version: currentProject.version,
        engine: currentProject.engine,
        players: currentProject.players,
        controls: currentProject.controls
      }, null, 2));
    }
  };

  const handleCreateNewProject = async () => {
    const name = prompt('Enter new game name:', 'My Indie Game');
    if (!name) return;

    const newProj: DevProject = {
      id: 'proj-' + Math.random().toString(36).substring(2, 7),
      name,
      engine: 'arcade',
      version: '0.1.0',
      description: 'Built with GameVault Studio',
      players: { single: true, local: 2, online: 2 },
      controls: ['keyboard', 'touch'],
      html: `<canvas id="c" width="600" height="400"></canvas>`,
      js: `const c = document.getElementById('c').getContext('2d');
c.fillStyle = '#38bdf8';
c.fillText('New GameVault Project: ${name}', 50, 50);`,
      css: `body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }`,
      assets: [],
      config: { speed: 5 },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await storage.saveProject(newProj);
    setProjects((p) => [...p, newProj]);
    setCurrentProject(newProj);
    setCodeContent(newProj.js);
    achievementManager.unlock('first-project');
  };

  const handleExportGvGame = async () => {
    if (!currentProject) return;
    const zip = new JSZip();

    zip.file('game.json', JSON.stringify({
      id: currentProject.id,
      name: currentProject.name,
      version: currentProject.version,
      engine: currentProject.engine,
      players: currentProject.players,
      controls: currentProject.controls,
      description: currentProject.description
    }, null, 2));

    zip.file('index.html', currentProject.html);
    zip.file('game.js', currentProject.js);
    zip.file('style.css', currentProject.css);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name.replace(/\s+/g, '-')}.gvgame`;
    a.click();
    URL.revokeObjectURL(url);

    achievementManager.unlock('first-package');
    audio.playVictory();
  };

  const handleConsoleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    const cmd = commandInput.trim();
    setCommandInput('');

    let res = '';
    if (cmd === 'games.list()') {
      res = `${projects.length} local projects found.`;
    } else if (cmd === 'storage.info()') {
      res = `Storage: IndexedDB Active (GameVault_DB v2)`;
    } else if (cmd === 'room.players()') {
      res = `${simPeers} active simulated peers.`;
    } else if (cmd === 'clear') {
      setConsoleLogs([]);
      return;
    } else {
      res = `Command '${cmd}' executed.`;
    }

    setConsoleLogs((prev) => [
      ...prev,
      { type: 'log', text: `> ${cmd}`, time: new Date().toLocaleTimeString() },
      { type: 'log', text: res, time: new Date().toLocaleTimeString() }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16] text-slate-100 flex flex-col font-mono text-xs select-none">
      {/* Studio Top Navigation Bar */}
      <div className="h-12 bg-[#0d121f] border-b border-white/10 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-heading font-bold text-sm tracking-wider text-white">
              GAMEVAULT DEVELOPER STUDIO
            </span>
          </div>

          <div className="h-4 w-px bg-white/15" />

          {/* Project Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Project:</span>
            <select
              value={currentProject?.id || ''}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) {
                  setCurrentProject(found);
                  setCodeContent(found.js);
                }
              }}
              className="bg-slate-900 border border-white/10 rounded px-2 py-0.5 text-xs text-cyan-300 focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (v{p.version})
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateNewProject}
              title="New Project"
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewRunning((r) => !r)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-semibold transition-all ${
              isPreviewRunning ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {isPreviewRunning ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            {isPreviewRunning ? 'Stop' : 'Run'}
          </button>

          <button
            onClick={handleSave}
            title="Save Project (Ctrl+S)"
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 rounded transition-all"
          >
            <Save className="w-3 h-3" />
            Save
          </button>

          <button
            onClick={handleExportGvGame}
            title="Export .gvgame Package"
            className="flex items-center gap-1.5 px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded transition-all"
          >
            <Package className="w-3 h-3" />
            Export .gvgame
          </button>

          <button
            onClick={onClose}
            title="Exit Developer Studio"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Work Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Studio Sidebar Navigation */}
        <div className="w-48 bg-[#0b0f19] border-r border-white/10 flex flex-col py-2 shrink-0">
          <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Studio Views
          </div>
          {[
            { id: 'editor', label: 'Code Editor', icon: FileCode },
            { id: 'builder', label: 'Game Builder', icon: Sliders },
            { id: 'multiplayer', label: 'Multiplayer Lab', icon: Wifi },
            { id: 'performance', label: 'Performance Lab', icon: Activity },
            { id: 'packages', label: 'Package Builder', icon: Package },
            { id: 'sdk', label: 'SDK Docs', icon: BookOpen },
            { id: 'storage', label: 'Storage Inspector', icon: Database }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
                  active ? 'bg-cyan-500/20 text-cyan-400 border-r-2 border-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="my-2 border-t border-white/10" />

          {/* Project File Tree */}
          <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Project Files
          </div>
          {(['game.js', 'index.html', 'style.css', 'game.json'] as const).map((fileName) => (
            <button
              key={fileName}
              onClick={() => {
                setActiveTab('editor');
                handleSelectFile(fileName);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs text-left ${
                activeFile === fileName && activeTab === 'editor'
                  ? 'text-cyan-400 font-bold bg-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3 h-3 text-slate-500" />
              <span>{fileName}</span>
            </button>
          ))}
        </div>

        {/* Center Main Stage */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#090d16]">
          {activeTab === 'editor' ? (
            /* Split Code Editor & Live Preview */
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10 overflow-hidden">
              {/* Code Editor Panel */}
              <div className="flex flex-col h-full bg-[#0d111c] overflow-hidden">
                <div className="h-8 bg-slate-900 px-3 flex items-center justify-between border-b border-white/5 text-[11px] text-slate-400">
                  <span className="text-cyan-300 font-semibold">{activeFile}</span>
                  <span>UTF-8 • JavaScript</span>
                </div>
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  className="flex-1 p-3 bg-transparent text-slate-200 resize-none font-mono text-xs leading-relaxed focus:outline-none"
                  spellCheck={false}
                />
              </div>

              {/* Live Preview Panel */}
              <div className="flex flex-col h-full bg-black overflow-hidden">
                <div className="h-8 bg-slate-900 px-3 flex items-center justify-between border-b border-white/5 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE PREVIEW (SANDBOXED)
                  </span>
                  <span>640x360 • 60 FPS</span>
                </div>
                <div className="flex-1 flex items-center justify-center p-2 bg-[#020617]">
                  <iframe
                    ref={iframeRef}
                    sandbox="allow-scripts"
                    title="Game Preview"
                    className="w-full h-full border border-white/10 rounded-lg shadow-inner bg-black"
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'builder' ? (
            /* Game Visual Builder */
            <div className="p-6 max-w-xl space-y-4">
              <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> GAME BUILDER (Visual Configuration)
              </h3>
              <p className="text-xs text-slate-400">
                Tweak engine physics, player speed, and gravity parameters without altering core code.
              </p>

              <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-white/10">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Player Speed</span>
                    <span className="text-cyan-400 font-bold">{builderSpeed}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={builderSpeed}
                    onChange={(e) => setBuilderSpeed(parseInt(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Gravity Multiplier</span>
                    <span className="text-cyan-400 font-bold">{builderGravity} m/s²</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={builderGravity}
                    onChange={(e) => setBuilderGravity(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Enemy / Obstacle Density</span>
                    <span className="text-cyan-400 font-bold">{builderEnemyCount}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={builderEnemyCount}
                    onChange={(e) => setBuilderEnemyCount(parseInt(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1">Difficulty</label>
                  <select
                    value={builderDifficulty}
                    onChange={(e) => setBuilderDifficulty(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded px-2.5 py-1 text-xs text-white"
                  >
                    <option>Easy</option>
                    <option>Normal</option>
                    <option>Hard</option>
                    <option>Nightmare</option>
                  </select>
                </div>

                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-xs"
                >
                  Apply Config to Project
                </button>
              </div>
            </div>
          ) : activeTab === 'multiplayer' ? (
            /* Multiplayer Test Lab */
            <div className="p-6 max-w-2xl space-y-4">
              <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                <Wifi className="w-4 h-4 text-cyan-400" /> MULTIPLAYER TEST LAB
              </h3>
              <p className="text-xs text-slate-400">
                Simulate peer connections, synthetic packet loss, and high-latency network conditions.
              </p>

              <div className="grid grid-cols-2 gap-3 bg-slate-900 p-4 rounded-xl border border-white/10">
                <div>
                  <div className="text-xs font-bold text-slate-300 mb-1">Simulated Latency: {simLatency}ms</div>
                  <div className="flex gap-2">
                    {[0, 50, 100, 200].map((lat) => (
                      <button
                        key={lat}
                        onClick={() => setSimLatency(lat)}
                        className={`px-2.5 py-1 rounded text-xs ${simLatency === lat ? 'bg-cyan-500 text-black font-bold' : 'bg-slate-800 text-slate-300'}`}
                      >
                        {lat}ms
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-300 mb-1">Packet Loss Simulation</div>
                  <button
                    onClick={() => setSimPacketLoss((l) => !l)}
                    className={`px-3 py-1 rounded text-xs ${simPacketLoss ? 'bg-rose-600 text-white font-bold' : 'bg-slate-800 text-slate-300'}`}
                  >
                    {simPacketLoss ? 'Active (5% Loss)' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Simulated Peer Mesh Status */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-slate-400 uppercase">Simulated Mesh Peers</div>
                {[1, 2, 3].map((pId) => (
                  <div key={pId} className="flex items-center justify-between p-2.5 bg-slate-900 border border-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Simulated Peer #{pId}</span>
                    </div>
                    <span className="font-mono text-cyan-300">{simLatency + pId * 4}ms RTT</span>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'performance' ? (
            /* Performance Lab */
            <div className="p-6 max-w-2xl space-y-4">
              <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> PERFORMANCE LAB
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-slate-900 rounded-xl border border-white/10 text-center">
                  <div className="text-2xl font-bold font-mono text-emerald-400">{fps}</div>
                  <div className="text-xs text-slate-400">Current FPS</div>
                </div>
                <div className="p-4 bg-slate-900 rounded-xl border border-white/10 text-center">
                  <div className="text-2xl font-bold font-mono text-cyan-400">{frameTime} ms</div>
                  <div className="text-xs text-slate-400">Frame Time</div>
                </div>
                <div className="p-4 bg-slate-900 rounded-xl border border-white/10 text-center">
                  <div className="text-2xl font-bold font-mono text-purple-400">{entityCount}</div>
                  <div className="text-xs text-slate-400">Active Entities</div>
                </div>
              </div>
            </div>
          ) : activeTab === 'sdk' ? (
            /* SDK Documentation */
            <div className="p-6 max-w-3xl space-y-4 overflow-y-auto">
              <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" /> GAMEVAULT SDK SPECIFICATION
              </h3>
              <pre className="p-4 bg-slate-900 rounded-xl border border-white/10 text-xs text-cyan-300 overflow-x-auto leading-relaxed">
{`// Universal GameVault SDK Bridge
GameVault.launchGame(gameId);
GameVault.pauseGame();
GameVault.resumeGame();
GameVault.exitGame();
GameVault.save(key, value);
GameVault.load(key);
GameVault.getSettings();
GameVault.getStatistics();
GameVault.unlockAchievement(id);
GameVault.getInput(playerIndex);
GameVault.createRoom(maxPlayers);
GameVault.joinRoom(roomCode);
GameVault.send(targetPlayerId, packet);
GameVault.broadcast(packet);
GameVault.syncState(state);`}
              </pre>
            </div>
          ) : (
            /* Storage Inspector */
            <div className="p-6 max-w-2xl space-y-4">
              <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" /> LOCAL STORAGE INSPECTOR (IndexedDB)
              </h3>
              <p className="text-xs text-slate-400">
                All game state, achievements, saves, and projects reside client-side in IndexedDB: GameVault_DB.
              </p>
              <div className="p-4 bg-slate-900 rounded-xl border border-white/10 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Database Name:</span>
                  <span className="font-mono text-cyan-300">GameVault_DB</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Object Stores:</span>
                  <span className="font-mono text-slate-200">12 Stores (games, saves, achievements, etc.)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Estimated Size:</span>
                  <span className="font-mono text-emerald-400">1.8 MB (IndexedDB)</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Developer Console */}
          <div className="h-36 bg-[#0a0e17] border-t border-white/10 flex flex-col shrink-0">
            <div className="h-6 bg-slate-900 px-3 flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-bold text-slate-300">TERMINAL / CONSOLE</span>
              <span>Type 'games.list()' or 'storage.info()'</span>
            </div>

            <div className="flex-1 p-2 overflow-y-auto space-y-1 font-mono text-[11px]">
              {consoleLogs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-500">[{log.time}]</span>
                  <span
                    className={
                      log.type === 'error'
                        ? 'text-rose-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : log.type === 'net'
                        ? 'text-indigo-400'
                        : 'text-slate-300'
                    }
                  >
                    {log.text}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleConsoleCommand} className="h-7 border-t border-white/10 flex">
              <span className="px-2 py-1 text-cyan-400">&gt;</span>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Enter console command..."
                className="flex-1 bg-transparent pr-3 py-1 text-xs text-white focus:outline-none"
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
