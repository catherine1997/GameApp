import React, { useState, useCallback } from "react";
import { SpaceInvaders } from "./components/SpaceInvaders";
import { MusicPlayer } from "./components/MusicPlayer";
import { Gamepad2, Headphones, Sparkles, HelpCircle, Terminal, RefreshCw, Layers } from "lucide-react";

export default function App() {
  const [score, setScore] = useState(0);
  const [beatPulse, setBeatPulse] = useState(0);

  // Triggered on every quarter beat scheduled by the Web Audio procedural synth!
  const handleMusicBeat = useCallback(() => {
    setBeatPulse((prev) => prev + 1);
  }, []);

  const handleScoreUpdate = useCallback((newScore: number) => {
    setScore(newScore);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0221] text-white flex flex-col items-center justify-between font-sans relative overflow-x-hidden select-none selection:bg-[#ff00ff] selection:text-white">
      
      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]"></div>

      {/* Retrowave Sun Backdrop glow & 3D floor grid projection */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(255,0,255,0.18),transparent_70%)]"></div>
        <div className="absolute bottom-0 w-full h-96 bg-[linear-gradient(to_bottom,transparent,#ff00ff22)]" style={{ perspective: "500px" }}>
          <div 
            className="w-full h-full border-t border-[#ff00ff44]" 
            style={{ 
              transform: "rotateX(60deg)", 
              backgroundImage: "linear-gradient(#ff00ff33 1px, transparent 1px), linear-gradient(90deg, #ff00ff33 1px, transparent 1px)", 
              backgroundSize: "50px 50px", 
              backgroundPosition: "center bottom" 
            }}
          />
        </div>
      </div>

      {/* Main Header navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 pt-10 pb-6 flex flex-col md:flex-row justify-between items-end gap-4 z-10">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-[0.4em] uppercase text-[#ff00ff] mb-1 font-bold">
            System Status: Optimal
          </span>
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-baseline">
            <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#00ffff] to-[#ff00ff] leading-none drop-shadow-[0_0_12px_rgba(0,255,255,0.5)]">
              VAPOR-INVADERS
            </h1>
            <div className="h-1 w-24 bg-[#ff00ff] hidden sm:block"></div>
          </div>
        </div>

        {/* Ambient telemetry indicators */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-400">
          <div className="flex items-center gap-1.5 border border-[#00ffff]/30 rounded-full px-3 py-1 bg-[#090615]/80 backdrop-blur-md">
            <span className="w-1.5 h-1.5 bg-[#00ffff] rounded-full animate-ping" />
            <span className="text-[#00ffff] font-semibold">COSMIC GRID ACTIVE</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 border border-[#ff00ff]/20 rounded-full px-3 py-1 bg-black/40">
            <span>DSP SPEED: 1.0X</span>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="w-full max-w-7xl mx-auto px-4 py-8 flex-grow flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center z-10 relative">
        
        {/* Left Side: Game Compartment */}
        <div className="flex-grow w-full max-w-4xl flex flex-col gap-6">
          <div className="relative group">
            {/* Visual glow backdrop for arcade pulsing to track beats */}
            <div 
              style={{ opacity: 0.15 + (beatPulse % 2 === 0 ? 0.08 : 0) }}
              className="absolute -inset-1.5 bg-gradient-to-r from-[#ff007f] via-[#d400ff] to-[#00ffff] rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition duration-1000 pointer-events-none" 
            />
            
            <SpaceInvaders 
              onGameScore={handleScoreUpdate} 
              beatTrigger={beatPulse} 
            />
          </div>

          {/* Quick interactive user manual / game specifications */}
          <div className="w-full bg-[#0d071d] rounded-xl border border-gray-800/60 p-5 flex flex-col sm:flex-row justify-between gap-6 text-sm">
            <div className="flex-1 flex gap-3">
              <div className="text-[#00ffff] shrink-0 mt-1">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-gray-200">How to play</h4>
                <p className="font-sans text-xs text-gray-400 mt-1 leading-relaxed">
                  Press <b className="text-[#00ffff]">Start Game Loop</b> inside the console. Steer your synthwing ship with the <kbd className="bg-gray-900 border border-gray-700 px-1 py-0.5 rounded text-[11px] font-mono text-[#ff007f]">A</kbd> / <kbd className="bg-gray-900 border border-gray-700 px-1 py-0.5 rounded text-[11px] font-mono text-[#ff007f]">D</kbd> or <b className="text-[#00ffff]">Arrow keys</b>. Shoot with the <kbd className="bg-gray-900 border border-gray-700 px-3 py-0.5 rounded text-[11px] font-mono text-[#00ffff]">Space Bar</kbd>.
                </p>
              </div>
            </div>

            <div className="flex-1 flex gap-3">
              <div className="text-[#ff007f] shrink-0 mt-1">
                <Layers className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-gray-200">Responsive Synth Engine</h4>
                <p className="font-sans text-xs text-gray-400 mt-1 leading-relaxed">
                  Synthesized directly in your browser! Experience drum lines, SAW sub-basslines, custom oscillators and detunable notes scheduled on the 16-step beat grids with zero network latency.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive procedural synth module */}
        <div className="w-full xl:w-auto shrink-0 flex flex-col gap-4">
          <div className="relative group">
            {/* Visual glow backdrops */}
            <div 
              style={{ transform: `scale(${1.0 + (beatPulse % 2 === 0 ? 0.015 : 0)})` }}
              className="absolute -inset-1.5 bg-gradient-to-r from-[#ff007f] to-[#d400ff] rounded-2xl blur-lg opacity-15 transition duration-500 pointer-events-none" 
            />
            
            <MusicPlayer onBeat={handleMusicBeat} />
          </div>

          {/* Synth specifications module terminal */}
          <div className="w-full max-w-sm bg-[#090615] rounded-xl border border-gray-900 p-4 font-mono text-[10px] text-gray-500">
            <div className="flex items-center gap-1.5 text-[#ff007f] font-bold mb-2 uppercase tracking-wide">
              <Terminal className="w-3 h-3 text-[#00ffff]" /> Telemetry Terminal
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>AUDIO_CONTROLLER:</span>
                <span className="text-green-500">READY</span>
              </div>
              <div className="flex justify-between">
                <span>LOCAL_HIGHSCORE:</span>
                <span className="text-[#00ffff]">PERSISTENT</span>
              </div>
              <div className="flex justify-between">
                <span>GAME_STEPS_PULSED:</span>
                <span className="text-white font-semibold">{beatPulse}</span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Styled Retrowave horizon footer */}
      <footer className="w-full py-8 border-t border-gray-900 bg-black/60 backdrop-blur-md relative z-10 text-center font-mono text-[10px] text-gray-500 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ffc600] animate-pulse" />
            <span>Synthwave Invaders — Retro Vapor Station v8.8</span>
          </div>
          <span>Procedural Web Audio Synthesis &copy; 2026. Insert Coin to Play.</span>
        </div>
      </footer>
    </div>
  );
}

// Quick custom vector radio-wave icon to avoid loading dependencies or broken svgs
function RadioWaveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
    </svg>
  );
}
