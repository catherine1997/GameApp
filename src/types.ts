// Data types and interfaces for Synthwave Invaders

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  bpm: number;
  description: string;
}

export type GameStatus = "START" | "PLAYING" | "PAUSED" | "GAMEOVER" | "VICTORY";

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  score: number;
  lives: number;
  shield: number; // Added secondary defense shield
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  isPlayer: boolean;
  color: string;
}

export interface Invader {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "squid" | "crab" | "octopus" | "boss";
  points: number;
  color: string;
  animationFrame: number;
}

export interface ShieldBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number; // Max health e.g. 4, chips away visually
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface Stars {
  id: string;
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}
