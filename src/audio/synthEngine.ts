// Procedural Web Audio Synthwave Music Engine
import { Track } from "../types";

export const TRACKS: Track[] = [
  {
    id: "track-1",
    title: "Neon Runner",
    artist: "Vektroid-98",
    album: "Grid Explorer",
    bpm: 115,
    description: "Cruising down late night coastal highways in a testarossa."
  },
  {
    id: "track-2",
    title: "Sunset Drift",
    artist: "Gridmaster 1984",
    album: "Vapor Space",
    bpm: 98,
    description: "Chilled ambient chords layered with deep driving synth bass."
  },
  {
    id: "track-3",
    title: "Cyber Decay",
    artist: "Arcade Shifter",
    album: "Retroverse Arcade",
    bpm: 125,
    description: "High-energy cyber punk sequence driving fast retro action."
  }
];

const NOTES = {
  C2: 65.41, D2: 73.42, Eb2: 77.78, F2: 87.31, G2: 98.00, Ab2: 103.83, Bb2: 116.54,
  C3: 130.81, D3: 146.83, Eb3: 155.56, F3: 174.61, G3: 196.00, Ab2_A3: 207.65, A3: 220.00, Bb3: 233.08, Ab3: 207.65,
  C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16,
  C5: 523.25, D5: 587.33, Eb5: 622.25, F5: 698.46, G5: 783.99, Ab5: 830.61, Bb5: 932.33,
  Silence: 0
};

export class SynthEngine {
  private ctx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mainGain: GainNode | null = null;
  private isEngineRunning = false;
  private currentTrackIdx = 0;
  private stepNumber = 0;
  private schedulerTimer: number | null = null;
  private nextStepTime = 0.0;
  private volumeValue = 0.5;

  // Visualizer callback
  private onBeatCallback: (() => void) | null = null;

  constructor() {
    // Lazy initialization happens when the user presses Play
  }

  // Active track
  public get currentTrack(): Track {
    return TRACKS[this.currentTrackIdx];
  }

  public get currentTrackIndex(): number {
    return this.currentTrackIdx;
  }

  public get isPlaying(): boolean {
    return this.isEngineRunning;
  }

  public get volume(): number {
    return this.volumeValue;
  }

  public setVolume(v: number) {
    this.volumeValue = Math.max(0, Math.min(1, v));
    if (this.mainGain && this.ctx) {
      this.mainGain.gain.setValueAtTime(this.volumeValue * 0.45, this.ctx.currentTime);
    }
  }

  public registerOnBeat(cb: () => void) {
    this.onBeatCallback = cb;
  }

  // Lazy initialise audio context safely on interaction
  private initAudio() {
    if (this.ctx) return;

    // Create audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API not supported in this browser.");
      return;
    }

    this.ctx = new AudioContextClass();
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 64; // Small fft for retro style simple visualizer bars
    
    this.mainGain = this.ctx.createGain();
    this.mainGain.gain.value = this.volumeValue * 0.45; // Soft start

    // Connect nodes
    this.mainGain.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);
  }

  public start() {
    this.initAudio();
    if (!this.ctx) return;

    // Resume context if suspended (browser security)
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    if (this.isEngineRunning) return;

    this.isEngineRunning = true;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.stepNumber = 0;
    this.schedulerLoop();
  }

  public stop() {
    this.isEngineRunning = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  public setTrack(idx: number) {
    const wasPlaying = this.isEngineRunning;
    if (wasPlaying) {
      this.stop();
    }
    this.currentTrackIdx = (idx + TRACKS.length) % TRACKS.length;
    this.stepNumber = 0;
    if (wasPlaying) {
      this.start();
    }
  }

  public nextTrack() {
    this.setTrack(this.currentTrackIdx + 1);
  }

  public prevTrack() {
    this.setTrack(this.currentTrackIdx - 1);
  }

  // Scheduler loop: runs ahead scheduling sound triggers
  private schedulerLoop = () => {
    if (!this.isEngineRunning || !this.ctx) return;

    const lookahead = 0.1; // seconds
    const interval = 25.0; // ms

    while (this.nextStepTime < this.ctx.currentTime + lookahead) {
      this.scheduleStep(this.stepNumber, this.nextStepTime);
      this.advanceStep();
    }

    this.schedulerTimer = window.setTimeout(this.schedulerLoop, interval);
  };

  private advanceStep() {
    const bpm = this.currentTrack.bpm;
    const stepDuration = 60.0 / bpm / 2; // eighth notes (2 steps per beat)
    this.nextStepTime += stepDuration;
    this.stepNumber = (this.stepNumber + 1) % 16; // 16 step loop (8 beats)
  }

  // Triggers procedural sounds based on step
  private scheduleStep(step: number, time: number) {
    if (!this.ctx || !this.mainGain) return;

    // Fire generic visual beat trigger on every quarter note (even steps)
    if (step % 2 === 0 && this.onBeatCallback) {
      // Trigger callback on slight delay for sync with browser paint
      const now = this.ctx.currentTime;
      const delay = Math.max(0, (time - now) * 1000);
      setTimeout(() => {
        if (this.isEngineRunning && this.onBeatCallback) this.onBeatCallback();
      }, delay);
    }

    // Load synth instructions based on the playing track
    if (this.currentTrackIdx === 0) {
      // TRACK 1: NEON RUNNER (Heavy 8th note driving bass + laser sweeps)
      this.playDrums(step, time, true, true);
      this.playBassline(step, time, [
        NOTES.C2, NOTES.C2, NOTES.C2, NOTES.C2,
        NOTES.Ab2, NOTES.Ab2, NOTES.Ab2, NOTES.Ab2,
        NOTES.Bb2, NOTES.Bb2, NOTES.Bb2, NOTES.Bb2,
        NOTES.G2, NOTES.G2, NOTES.Ab2, NOTES.Bb2
      ]);
      
      // Melody chords/sweeps every other loop bar
      this.playArp(step, time, [
        NOTES.C4, NOTES.Eb4, NOTES.G4, NOTES.Bb4,
        NOTES.C5, NOTES.Bb4, NOTES.G4, NOTES.Eb4,
        NOTES.Eb4, NOTES.F4, NOTES.Ab4, NOTES.C5,
        NOTES.D5, NOTES.C5, NOTES.Bb4, NOTES.Ab4
      ]);
    } else if (this.currentTrackIdx === 1) {
      // TRACK 2: SUNSET DRIFT (Chill slower beat + warm pads)
      this.playDrums(step, time, step % 4 === 0, step % 8 === 4); // Laid back kick & snare
      this.playBassline(step, time, [
        NOTES.F2, NOTES.Silence, NOTES.F2, NOTES.F2,
        NOTES.Bb2, NOTES.Silence, NOTES.Bb2, NOTES.Bb2,
        NOTES.C2, NOTES.Silence, NOTES.C2, NOTES.C2,
        NOTES.Eb2, NOTES.Silence, NOTES.D2, NOTES.C2
      ]);
      
      this.playArp(step, time, [
        NOTES.F4, NOTES.Silence, NOTES.Ab4, NOTES.Silence,
        NOTES.C5, NOTES.Silence, NOTES.Bb4, NOTES.Silence,
        NOTES.G4, NOTES.Silence, NOTES.Bb4, NOTES.Silence,
        NOTES.D5, NOTES.Silence, NOTES.C5, NOTES.Silence
      ]);
    } else {
      // TRACK 3: CYBER DECAY (High energy Cyberpunk)
      this.playDrums(step, time, true, step % 4 === 2); // Four on the floor kick + active snare
      this.playBassline(step, time, [
        NOTES.Eb2, NOTES.Eb2, NOTES.Eb2, NOTES.Eb2,
        NOTES.D2, NOTES.D2, NOTES.D2, NOTES.D2,
        NOTES.C2, NOTES.C2, NOTES.C2, NOTES.C2,
        NOTES.Bb2, NOTES.Bb2, NOTES.Ab2, NOTES.G2
      ]);

      // Highly active fast arpeggio
      this.playActiveSynth(step, time, [
        NOTES.Eb4, NOTES.G4, NOTES.Bb4, NOTES.Eb5,
        NOTES.D4, NOTES.F4, NOTES.A4, NOTES.D5,
        NOTES.C4, NOTES.Eb4, NOTES.G4, NOTES.C5,
        NOTES.Bb3, NOTES.D4, NOTES.F4, NOTES.Bb4
      ]);
    }
  }

  // --- SYNTH INSTRUMENTS ---

  // Custom synth drums
  private playDrums(step: number, time: number, triggerKick: boolean, triggerSnare: boolean) {
    if (!this.ctx || !this.mainGain) return;

    // KICK DRUM (Sine sweep from ~150Hz to 40Hz)
    if (triggerKick && (step % 4 === 0)) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);

      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.connect(gain);
      gain.connect(this.mainGain);

      osc.start(time);
      osc.stop(time + 0.16);
    }

    // SNARE RETRO COMP (Noise burst)
    if (triggerSnare) {
      // Create sound buffer for snare crack
      const dur = 0.1;
      const bufferSize = this.ctx.sampleRate * dur;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Random noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // Bandpass filter to make it snare-like (around 1000Hz)
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1000, time);
      filter.Q.setValueAtTime(3, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.mainGain);

      noiseNode.start(time);
      noiseNode.stop(time + dur);
    }

    // HI-HAT COLD (High pass filter on brief noise or pulse)
    if (step % 2 === 1) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(10000, time);

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      osc.connect(gain);
      gain.connect(this.mainGain);

      osc.start(time);
      osc.stop(time + 0.06);
    }
  }

  // Warm deep saw bassline
  private playBassline(step: number, time: number, pattern: number[]) {
    if (!this.ctx || !this.mainGain) return;

    const freq = pattern[step];
    if (freq === 0 || freq === undefined) return;

    // Sub oscillator for deep rumble
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "triangle";
    subOsc.frequency.setValueAtTime(freq, time);
    
    // Saw oscillator for detuned bite
    const sawOsc = this.ctx.createOscillator();
    const sawGain = this.ctx.createGain();
    sawOsc.type = "sawtooth";
    sawOsc.frequency.setValueAtTime(freq + 0.5, time); // slightly sharp for vintage chorusey feel

    // Bass lowpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(180, time);
    filter.frequency.exponentialRampToValueAtTime(80, time + 0.16);

    subGain.gain.setValueAtTime(0.4, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    sawGain.gain.setValueAtTime(0.18, time);
    sawGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    // Patch connections
    subOsc.connect(subGain);
    subGain.connect(filter);

    sawOsc.connect(sawGain);
    sawGain.connect(filter);

    filter.connect(this.mainGain);

    subOsc.start(time);
    subOsc.stop(time + 0.2);
    sawOsc.start(time);
    sawOsc.stop(time + 0.2);
  }

  // Melodic slow arps or chords
  private playArp(step: number, time: number, pattern: number[]) {
    if (!this.ctx || !this.mainGain) return;

    const freq = pattern[step];
    if (freq === 0 || freq === undefined) return;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, time);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 1.5, time); // Fifth overtone

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.exponentialRampToValueAtTime(250, time + 0.25);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.mainGain);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + 0.32);
    osc2.stop(time + 0.32);
  }

  // Fast energetic square synth lead
  private playActiveSynth(step: number, time: number, pattern: number[]) {
    if (!this.ctx || !this.mainGain) return;

    const freq = pattern[step];
    if (freq === 0 || freq === undefined) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(freq, time);

    // LFO frequency modulation (vibes!)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 6; // 6Hz speed
    lfoGain.gain.value = 4; // slight pitch vibrato depth
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1600, time);
    filter.frequency.exponentialRampToValueAtTime(350, time + 0.12);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.mainGain);

    lfo.start(time);
    osc.start(time);
    lfo.stop(time + 0.15);
    osc.stop(time + 0.15);
  }

  // --- AUDIO DATA PROVISION FOR AUDIO VISUALIZER ---

  // Fetches live high-speed data for canvas rendering
  public getAnalyserData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(32);
    }
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

// Singleton global synth engine reference
export const synthEngineSingleton = new SynthEngine();
export default synthEngineSingleton;
