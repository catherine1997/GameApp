import React, { useEffect, useRef, useState } from "react";
import { synthEngineSingleton, TRACKS } from "../audio/synthEngine";
import { Play, Pause, SkipForward, SkipBack, Volume2, Disc, Music, ListMusic, Headphones } from "lucide-react";

interface MusicPlayerProps {
  onBeat: () => void; // Triggered when synth plays a periodic major beat pulse
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ onBeat }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [volume, setVolume] = useState(0.4);
  const [trackDetails, setTrackDetails] = useState(TRACKS[0]);

  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sync initial state on build
  useEffect(() => {
    // Register visual callbacks
    synthEngineSingleton.registerOnBeat(() => {
      onBeat();
    });

    // Clean up on unmount
    return () => {
      synthEngineSingleton.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onBeat]);

  // Update React states for active tracking
  const updateTrackUI = () => {
    setCurrentTrackIdx(synthEngineSingleton.currentTrackIndex);
    setTrackDetails(synthEngineSingleton.currentTrack);
    setIsPlaying(synthEngineSingleton.isPlaying);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      synthEngineSingleton.stop();
    } else {
      synthEngineSingleton.start();
    }
    updateTrackUI();
  };

  const handleNextTrack = () => {
    synthEngineSingleton.nextTrack();
    updateTrackUI();
  };

  const handlePrevTrack = () => {
    synthEngineSingleton.prevTrack();
    updateTrackUI();
  };

  const handleSelectTrack = (idx: number) => {
    synthEngineSingleton.setTrack(idx);
    updateTrackUI();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVol = parseFloat(e.target.value);
    setVolume(nextVol);
    synthEngineSingleton.setVolume(nextVol);
  };

  // --- FREQUENCY WAVEFORM RETRO VISUALIZER LOOP ---
  useEffect(() => {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderVisualizer = () => {
      const data = synthEngineSingleton.getAnalyserData();
      const width = canvas.width;
      const height = canvas.height;

      // Clear visualizer
      ctx.fillStyle = "#090615";
      ctx.fillRect(0, 0, width, height);

      // Draw faint cyber neon vector grid backdrop
      ctx.strokeStyle = "rgba(138, 43, 226, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw bands
      const barCount = data.length;
      const barWidth = (width / barCount) * 1.1;
      let x = 0;

      for (let i = 0; i < barCount; i++) {
        const val = data[i];
        // Scale height to fit visually nicely
        let barHeight = (val / 255) * height * 1.1;
        if (!isPlaying) {
          // Idle ambient sine hover wave when music is paused
          barHeight = Math.sin((Date.now() * 0.003) + (i * 0.3)) * 6 + 4;
        }

        // Draw double ended fluorescent spikes for retro neon feel
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, "#00ffff"); // Bright cyany tip
        gradient.addColorStop(0.5, "#d400ff"); // Purple body
        gradient.addColorStop(1, "#ff007f"); // Pink base

        ctx.fillStyle = gradient;
        
        ctx.shadowColor = "#d400ff";
        ctx.shadowBlur = isPlaying ? 8 : 2;
        
        // Draw elegant rounded-tip bars
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth - 3, barHeight, [4, 4, 0, 0]);
        ctx.fill();
        
        ctx.shadowBlur = 0; // reset

        x += barWidth;
      }

      animationFrameRef.current = requestAnimationFrame(renderVisualizer);
    };

    renderVisualizer();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div id="music-player-panel" className="relative w-full max-w-sm flex flex-col bg-[#0d0221]/85 backdrop-blur-md border-4 border-[#ff00ff] rounded-lg md:p-5 p-4 shadow-[0_0_35px_rgba(255,0,255,0.2)] overflow-hidden">
      {/* Tape aesthetic ambient glow */}
      <div className="absolute -right-16 -top-16 w-36 h-36 bg-[#00ffff]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Cassette Header Bar Info */}
      <div className="flex items-center gap-2 text-[#ff00ff] font-mono text-[10px] uppercase tracking-widest border-b border-[#ff00ff]/20 pb-3 mb-4">
        <Headphones className="w-4 h-4 animate-bounce text-[#00ffff]" />
        <span>Vapor Deck-1988 Stereo</span>
      </div>

      {/* RETRO CASSETTE SPINNING MECHANISM VISUAL */}
      <div className="relative w-full aspect-[5/3] bg-gradient-to-br from-[#120a2a] to-[#251347] border-2 border-[#ff00ff] rounded-lg p-3 flex flex-col justify-between overflow-hidden shadow-inner mb-4">
        {/* Dynamic magnetic strip tape texture */}
        <div className="absolute top-2 left-6 right-6 h-5 bg-[#0e0722] border border-[#ff00ff]/30 rounded flex items-center justify-around px-2 text-[8px] text-gray-400 font-mono">
          <span className="text-[#00ffff]">A SIDE - SYNTH WAVE</span>
          <span>C60 TYPE II</span>
        </div>

        {/* Dynamic Rotating Rotors */}
        <div className="flex justify-around items-center h-full my-3">
          {/* Left Tape Reel */}
          <div className="relative w-16 h-16 rounded-full bg-[#ff00ff]/10 border-2 border-[#ff00ff] flex items-center justify-center shadow-[0_0_12px_rgba(255,0,255,0.25)]">
            <div 
              style={{ transform: `rotate(${isPlaying ? Date.now() * 0.08 : 0}deg)` }}
              className="w-12 h-12 rounded-full border-4 border-dashed border-[#00ffff] flex items-center justify-center transition-transform"
            >
              <div className="w-3 h-3 rounded-full bg-white border border-[#222]" />
            </div>
            {/* Spinning Tape Bulk shadow representation */}
            <div className={`absolute w-14 h-14 rounded-full border border-gray-900 transition-all ${isPlaying ? 'scale-95' : 'scale-90 opacity-80'}`} />
          </div>

          {/* Cassette viewing window center cut */}
          <div className="w-10 h-7 bg-[#0b061c] border-2 border-[#ff00ff]/60 rounded-md flex items-center justify-center text-[7px] text-[#00ffff] font-mono font-bold tracking-tighter">
            {isPlaying ? "RUN-►" : "STOP"}
          </div>

          {/* Right Tape Reel */}
          <div className="relative w-16 h-16 rounded-full bg-[#ff00ff]/10 border-2 border-[#ff00ff] flex items-center justify-center shadow-[0_0_12px_rgba(255,0,255,0.25)]">
            <div 
              style={{ transform: `rotate(${isPlaying ? Date.now() * 0.08 : 0}deg)` }}
              className="w-12 h-12 rounded-full border-4 border-dashed border-[#00ffff] flex items-center justify-center transition-transform"
            >
              <div className="w-3 h-3 rounded-full bg-white border border-[#222]" />
            </div>
            {/* Spinning Tape Bulk shadow representation */}
            <div className={`absolute w-14 h-14 rounded-full border border-gray-800 transition-all ${isPlaying ? 'scale-90' : 'scale-95 opacity-80'}`} />
          </div>
        </div>

        {/* Ribbon guide bottom notches */}
        <div className="w-full h-4 flex justify-between px-10">
          <div className="w-4 h-2 bg-[#ff00ff]/30 border border-[#ff00ff] rounded-sm" />
          <div className="w-4 h-2 bg-[#ff00ff]/30 border border-[#ff00ff] rounded-sm" />
        </div>
      </div>

      {/* ACTIVE TRACK CHASSIS BANNER METADATA */}
      <div className="w-full bg-[#090615] rounded-lg border-2 border-[#00ffff]/30 p-3 mb-4 flex flex-col gap-1 min-h-[75px]">
        <div className="overflow-hidden whitespace-nowrap w-full">
          {/* Scroll banner details */}
          <div className={`font-sans font-bold text-base text-[#00ffff] tracking-wide ${isPlaying ? 'animate-pulse' : ''}`}>
            {trackDetails.title}
          </div>
        </div>
        <div className="text-xs font-mono text-[#ea97ff] flex justify-between">
          <span>By {trackDetails.artist}</span>
          <span className="text-[#ff00ff] text-[10px] font-semibold tracking-widest">{trackDetails.bpm} BPM</span>
        </div>
        <p className="text-[10px] font-sans text-gray-400 mt-1 italic leading-tight">
          "{trackDetails.description}"
        </p>
      </div>

      {/* AUDIO OSCILLOSCOPE ANALYSER */}
      <div className="w-full h-12 rounded-lg overflow-hidden border border-[#00ffff]/40 mb-4 bg-black">
        <canvas
          id="oscilloscope-canvas"
          ref={visualizerCanvasRef}
          width={330}
          height={48}
          className="w-full h-full block"
        />
      </div>

      {/* INTERACTIVE COMPLEMENT CONTROLLER SLIDERS */}
      <div className="w-full flex items-center justify-between mb-4 gap-4">
        {/* Play Pause Skip Track Panel Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevTrack}
            title="Prev synth loop"
            className="p-1.5 rounded-lg bg-gray-900/50 text-[#ea97ff] hover:text-white hover:bg-[#ff00ff]/10 border border-[#ff00ff]/20 active:scale-95 transition cursor-pointer"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={handlePlayPause}
            title={isPlaying ? "Mute synth" : "Power up synth"}
            className="p-3 rounded-full bg-gradient-to-r from-[#ff00ff] to-[#d400ff] text-white active:scale-90 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,0,255,0.45)] hover:brightness-110"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
          </button>
          
          <button
            onClick={handleNextTrack}
            title="Next synth loop"
            className="p-1.5 rounded-lg bg-gray-900/50 text-[#ea97ff] hover:text-white hover:bg-[#ff00ff]/10 border border-[#ff00ff]/20 active:scale-95 transition cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Slide Volume bar controls */}
        <div className="flex items-center gap-2 flex-grow justify-end max-w-[140px]">
          <Volume2 className="w-4 h-4 text-gray-500" />
          <input
            type="range"
            min="0"
            max="1.0"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full accent-[#ff00ff] h-1.5 rounded bg-gray-900 cursor-pointer border border-[#ff00ff]/20 outline-none"
          />
        </div>
      </div>

      {/* TRACKS LIST SELECTOR */}
      <div className="w-full flex flex-col gap-1.5 text-xs font-mono">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
          <ListMusic className="w-3.5 h-3.5 text-[#00ffff]" /> Synthwave Loops (3)
        </span>
        {TRACKS.map((track, idx) => (
          <button
            key={track.id}
            onClick={() => handleSelectTrack(idx)}
            className={`w-full px-3 py-2 rounded-lg flex justify-between items-center transition cursor-pointer border ${
              idx === currentTrackIdx
                ? "bg-[#ff00ff]/15 border-[#ff00ff] text-[#00ffff]"
                : "bg-[#090615]/40 hover:bg-[#ff00ff]/5 border-transparent text-[#ea97ff]"
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden text-left">
              <span className="text-[9px] text-[#ff00ff] font-bold">0{idx + 1}</span>
              <span className="truncate font-sans font-semibold text-xs leading-tight">{track.title}</span>
            </div>
            <span className="text-[9px] text-gray-400 shrink-0 font-bold uppercase">{track.bpm} bpm</span>
          </button>
        ))}
      </div>
    </div>
  );
};
