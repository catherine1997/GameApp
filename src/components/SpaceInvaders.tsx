import React, { useRef, useEffect, useState } from "react";
import { GameStatus, Player, Bullet, Invader, ShieldBlock, Particle, Stars } from "../types";
import { Play, Pause, RotateCcw, Volume2, ShieldAlert, Award } from "lucide-react";

interface SpaceInvadersProps {
  onGameScore: (score: number) => void;
  beatTrigger: number; // Incrementing counter linked to audio engine pulse
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

export const SpaceInvaders: React.FC<SpaceInvadersProps> = ({ onGameScore, beatTrigger }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // States for React side telemetry
  const [gameStatus, setGameStatus] = useState<GameStatus>("START");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [shieldCharge, setShieldCharge] = useState(100);

  // Keep references for animation loop to avoid re-binding closures
  const stateRef = useRef({
    status: "START" as GameStatus,
    score: 0,
    level: 1,
    lives: 3,
    shieldCharge: 100,
    player: { x: CANVAS_WIDTH / 2 - 20, y: CANVAS_HEIGHT - 45, width: 44, height: 26, speed: 6, score: 0, lives: 3, shield: 100 } as Player,
    bullets: [] as Bullet[],
    invaders: [] as Invader[],
    shields: [] as ShieldBlock[],
    particles: [] as Particle[],
    stars: [] as Stars[],
    invaderDirection: 1, // 1 for right, -1 for left
    invaderShiftDown: false,
    invaderSpeed: 1.0,
    lastFireTime: 0,
    keys: {} as { [key: string]: boolean },
    beatPulse: 0, // transient visual scale boost
  });

  // Load High Score on initial mount
  useEffect(() => {
    const saved = localStorage.getItem("synthwave_invaders_high_score");
    if (saved) {
      setHighScore(parseInt(saved, 10));
    } else {
      setHighScore(5000); // 80s arcade default high score
    }
  }, []);

  // Update high score whenever score updates
  const updateScores = (newScore: number) => {
    setScore(newScore);
    onGameScore(newScore);
    
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem("synthwave_invaders_high_score", newScore.toString());
    }
  };

  // Sync state variables from React state back into ref on changes
  useEffect(() => {
    stateRef.current.status = gameStatus;
  }, [gameStatus]);

  // Let the background beats pulse the canvas scale/aesthetic slightly
  useEffect(() => {
    if (beatTrigger > 0) {
      stateRef.current.beatPulse = 1.0;
      // Add drift effect to stars
      stateRef.current.stars.forEach(s => {
        s.speed *= 1.4;
      });
    }
  }, [beatTrigger]);

  // Handle keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling when playing with Space bar or Arrow keys
      if (["Space", "ArrowLeft", "ArrowRight", "Spacebar", " "].includes(e.key)) {
        e.preventDefault();
      }
      stateRef.current.keys[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Initialize Game Environment
  const initGame = (restart = false) => {
    const state = stateRef.current;
    
    // Player
    state.player = {
      x: CANVAS_WIDTH / 2 - 22,
      y: CANVAS_HEIGHT - 50,
      width: 44,
      height: 26,
      speed: 6.5,
      score: restart ? 0 : state.score,
      lives: restart ? 3 : state.lives,
      shield: 100,
    };

    if (restart) {
      setLevel(1);
      setLives(3);
      setScore(0);
      setShieldCharge(100);
      state.level = 1;
      state.lives = 3;
      state.score = 0;
      state.shieldCharge = 100;
    }

    state.bullets = [];
    state.particles = [];
    state.invaderSpeed = 0.8 + (state.level - 1) * 0.3;
    state.invaderDirection = 1;

    // Spawn Invaders Grid: Crab, Squid, Octopus rows
    const rows = 4;
    const cols = 8;
    const rawInvaders: Invader[] = [];
    const colors = ["#ff007f", "#ff007f", "#00ffff", "#d400ff"]; // Pink, Cyan, Purple

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const typeIdx = r === 0 ? "squid" : r < 3 ? "crab" : "octopus";
        const points = r === 0 ? 40 : r < 3 ? 20 : 10;
        const color = colors[r % colors.length];

        rawInvaders.push({
          id: `inv-${r}-${c}`,
          x: 100 + c * 60,
          y: 70 + r * 45,
          width: 36,
          height: 24,
          type: typeIdx,
          points: points,
          color: color,
          animationFrame: 0,
        });
      }
    }
    state.invaders = rawInvaders;

    // Add 4 defense blocks (Shields)
    const rawShields: ShieldBlock[] = [];
    const shieldCount = 4;
    const stepX = CANVAS_WIDTH / (shieldCount + 1);

    for (let s = 0; s < shieldCount; s++) {
      const startX = stepX * (s + 1) - 40;
      // Build block of smaller segments
      for (let bx = 0; bx < 5; bx++) {
        for (let by = 0; by < 3; by++) {
          // Arc cut-out at center bottom for aesthetic
          if (by === 2 && bx >= 1 && bx <= 3) continue;

          rawShields.push({
            id: `shield-${s}-${bx}-${by}`,
            x: startX + bx * 16,
            y: CANVAS_HEIGHT - 110 + by * 10,
            width: 16,
            height: 10,
            health: 4, // Hit counts
          });
        }
      }
    }
    state.shields = rawShields;

    // Spawn Stars (Vaporwave Backdrop)
    if (state.stars.length === 0) {
      const rawStars: Stars[] = [];
      for (let i = 0; i < 60; i++) {
        rawStars.push({
          id: `star-${i}`,
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 0.8 + 0.2,
          alpha: Math.random() * 0.7 + 0.3,
        });
      }
      state.stars = rawStars;
    }
  };

  // Main game logic loops inside anim frame
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    initGame(true);

    const mainLoop = () => {
      const state = stateRef.current;

      // 1. UPDATE physics if active
      if (state.status === "PLAYING") {
        updateGamePhysics();
      } else {
        // Just idle stars scrolling for nice menu aesthetic
        state.stars.forEach(star => {
          star.y += star.speed * 0.2;
          if (star.y > CANVAS_HEIGHT) {
            star.y = 0;
            star.x = Math.random() * CANVAS_WIDTH;
          }
        });
      }

      // 2. RENDER canvas
      drawGame(ctx);

      // Recursive tick
      animationId = requestAnimationFrame(mainLoop);
    };

    // Physics Routine
    const updateGamePhysics = () => {
      const state = stateRef.current;
      const now = Date.now();

      // Fade out beat pulse transient visual scale
      if (state.beatPulse > 0) {
        state.beatPulse -= 0.08;
      }

      // Space scroll backdrop
      state.stars.forEach(star => {
        // Slow down drift multiplier over time back to standard
        if (star.speed > 2) {
          star.speed -= 0.05;
        }
        star.y += star.speed;
        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }
      });

      // Player Movement
      if (state.keys["ArrowLeft"] || state.keys["a"] || state.keys["A"]) {
        state.player.x = Math.max(10, state.player.x - state.player.speed);
      }
      if (state.keys["ArrowRight"] || state.keys["d"] || state.keys["D"]) {
        state.player.x = Math.min(CANVAS_WIDTH - state.player.width - 10, state.player.x + state.player.speed);
      }

      // Player Fire
      if (state.keys[" "] || state.keys["Spacebar"]) {
        if (now - state.lastFireTime > 320) { // Milliseconds lock
          state.bullets.push({
            id: `bullet-p-${now}`,
            x: state.player.x + state.player.width / 2 - 2,
            y: state.player.y - 12,
            width: 4,
            height: 14,
            vy: -7.5,
            isPlayer: true,
            color: "#00ffff", // Neon Cyany
          });
          state.lastFireTime = now;
          
          // Sound trigger for laser (simple vintage synthesiser sweep via Web Audio if context active)
          synthLaser();
        }
      }

      // Update bullets
      state.bullets = state.bullets.filter(bullet => {
        bullet.y += bullet.vy;
        return bullet.y > 0 && bullet.y < CANVAS_HEIGHT;
      });

      // Update particles
      state.particles = state.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        return p.alpha > 0;
      });

      // Update Invaders
      let moveDown = false;
      state.invaders.forEach(inv => {
        inv.x += state.invaderSpeed * state.invaderDirection;

        // Bounce walls boundary detection
        if (inv.x + inv.width > CANVAS_WIDTH - 15 || inv.x < 15) {
          moveDown = true;
        }

        // Animate frames slowly
        if (Math.random() < 0.005) {
          inv.animationFrame = inv.animationFrame === 0 ? 1 : 0;
        }
      });

      if (moveDown) {
        state.invaderDirection *= -1;
        state.invaders.forEach(inv => {
          inv.y += 18;
          // Check if touches shield line
          if (inv.y + inv.height >= CANVAS_HEIGHT - 110) {
            // Invaders breached
            triggerGameOver();
          }
        });
      }

      // Invader random fire (Higher level = more fire rates)
      const fireThreshold = 0.007 + (state.level * 0.004);
      if (state.invaders.length > 0 && Math.random() < fireThreshold) {
        // Pick a random invader
        const living = state.invaders;
        const shooter = living[Math.floor(Math.random() * living.length)];
        
        state.bullets.push({
          id: `bullet-i-${now}`,
          x: shooter.x + shooter.width / 2 - 2,
          y: shooter.y + shooter.height + 2,
          width: 4,
          height: 12,
          vy: 3.5 + (state.level * 0.5),
          isPlayer: false,
          color: "#ff00aa",
        });
      }

      // Bullet Collisions
      state.bullets.forEach(bullet => {
        if (bullet.isPlayer) {
          // PLAYER BULLET vs INVADERS
          state.invaders.forEach(inv => {
            if (
              bullet.x + bullet.width > inv.x &&
              bullet.x < inv.x + inv.width &&
              bullet.y + bullet.height > inv.y &&
              bullet.y < inv.y + inv.height
            ) {
              // Destroy invader
              triggerExplosion(inv.x + inv.width / 2, inv.y + inv.height / 2, inv.color, 15);
              state.invaders = state.invaders.filter(x => x.id !== inv.id);
              state.score += inv.points;
              updateScores(state.score);
              bullet.y = -999; // mark delete

              // Speed up remaining invaders slightly
              state.invaderSpeed += 0.06;
            }
          });
        } else {
          // INVADER BULLET vs PLAYER SHIP
          const p = state.player;
          if (
            bullet.x + bullet.width > p.x &&
            bullet.x < p.x + p.width &&
            bullet.y + bullet.height > p.y &&
            bullet.y < p.y + p.height
          ) {
            // Hit!
            bullet.y = 9999; // delete bullet
            
            if (p.shield > 0) {
              p.shield -= 25; // shield takes blow first
              triggerExplosion(p.x + p.width / 2, p.y + p.height / 2, "#00ffff", 10);
              state.shieldCharge = p.shield;
              setShieldCharge(p.shield);
              synthShieldHit();
            } else {
              // Ship hit
              triggerExplosion(p.x + p.width / 2, p.y + p.height / 2, "#ff007f", 25);
              p.lives -= 1;
              p.shield = 100; // recharge visual
              state.shieldCharge = 100;
              setShieldCharge(100);
              state.lives = p.lives;
              setLives(p.lives);
              synthExplosionBass();

              if (p.lives <= 0) {
                triggerGameOver();
              }
            }
          }
        }

        // BULLETS vs SHIELDS
        state.shields.forEach(block => {
          if (block.health > 0) {
            if (
              bullet.x + bullet.width > block.x &&
              bullet.x < block.x + block.width &&
              bullet.y + bullet.height > block.y &&
              bullet.y < block.y + block.height
            ) {
              // Damage block
              block.health -= 1;
              bullet.y = bullet.isPlayer ? -999 : 9999; // destroy bullet
              triggerExplosion(block.x + block.width / 2, block.y + block.height / 2, "#ff00ff", 4);
              synthHitWall();
            }
          }
        });
      });

      // Filter damaged shields & bullets out
      state.shields = state.shields.filter(b => b.health > 0);
      state.bullets = state.bullets.filter(b => b.y > 0 && b.y < CANVAS_HEIGHT);

      // Victory Condition (all invaders gone)
      if (state.invaders.length === 0) {
        triggerVictory();
      }
    };

    // Explode effects
    const triggerExplosion = (x: number, y: number, color: string, count: number) => {
      const state = stateRef.current;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velSpeed = Math.random() * 3 + 1.2;
        state.particles.push({
          id: `p-${x}-${y}-${i}-${Math.random()}`,
          x: x,
          y: y,
          vx: Math.cos(angle) * velSpeed,
          vy: Math.sin(angle) * velSpeed,
          size: Math.random() * 3 + 1,
          color: color,
          alpha: 1.0,
          decay: Math.random() * 0.04 + 0.02,
        });
      }
    };

    // End signals
    const triggerGameOver = () => {
      setGameStatus("GAMEOVER");
    };

    const triggerVictory = () => {
      const state = stateRef.current;
      setGameStatus("VICTORY");
      setLevel(prev => prev + 1);
      state.level += 1;
    };

    // --- GAME RENDERING ---
    const drawGame = (c: CanvasRenderingContext2D) => {
      const state = stateRef.current;
      
      // Clear with elegant Vaporwave dark backdrop
      c.fillStyle = "#0c081d"; // Dark deep neon-purple night
      c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Grid (Perspective 80s outrun style Grid floor)
      drawVaporwaveGrid(c);

      // Draw interactive Stars
      state.stars.forEach(star => {
        c.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        c.beginPath();
        c.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        c.fill();
      });

      // Draw Sun Grid Accent in background
      drawBackdropSun(c);

      // Draw Shields
      state.shields.forEach(block => {
        const opacity = block.health / 4;
        c.fillStyle = `rgba(212, 0, 255, ${0.4 + opacity * 0.6})`;
        c.strokeStyle = "#ff007f";
        c.lineWidth = 1;
        
        // Rounded chip appearance
        c.fillRect(block.x, block.y, block.width, block.height);
        c.strokeRect(block.x, block.y, block.width, block.height);
      });

      // Draw Bullets
      state.bullets.forEach(bullet => {
        const gradient = c.createLinearGradient(bullet.x, bullet.y, bullet.x, bullet.y + bullet.height);
        gradient.addColorStop(0, bullet.color);
        gradient.addColorStop(1, "transparent");

        c.fillStyle = gradient;
        c.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        
        // Outer glow
        c.shadowColor = bullet.color;
        c.shadowBlur = 10;
        c.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        c.shadowBlur = 0; // reset
      });

      // Draw Particles (neon sparks)
      state.particles.forEach(p => {
        c.fillStyle = p.color;
        c.globalAlpha = p.alpha;
        c.shadowColor = p.color;
        c.shadowBlur = 8 * p.alpha;
        c.fillRect(p.x, p.y, p.size, p.size);
        c.shadowBlur = 0;
        c.globalAlpha = 1.0;
      });

      // Draw Invaders
      state.invaders.forEach(inv => {
        drawInvaderSprite(c, inv);
      });

      // Draw Player Ship (Neon glow triangle synthwing)
      const p = state.player;
      c.shadowColor = "#00ffff";
      c.shadowBlur = Math.max(8, state.beatPulse * 22);
      
      // Beautiful retro futuristic wireframe spacecraft
      c.fillStyle = "#0c081d";
      c.strokeStyle = "#00ffff";
      c.lineWidth = 2.5;
      
      c.beginPath();
      c.moveTo(p.x + p.width / 2, p.y); // Nose apex
      c.lineTo(p.x, p.y + p.height - 4); // Rear-left winglet
      c.lineTo(p.x + 8, p.y + p.height - 10); // Inner wing joint
      c.lineTo(p.x + p.width - 8, p.y + p.height - 10); // Inner right back
      c.lineTo(p.x + p.width, p.y + p.height - 4); // Rear-right winglet 
      c.closePath();
      c.fill();
      c.stroke();

      // Reactor engine flame inside ship, pulse on beat
      const fireHeight = Math.random() * 8 + 4 + (state.beatPulse * 12);
      c.fillStyle = "#ff007f";
      c.shadowColor = "#ff00aa";
      c.shadowBlur = 10;
      c.beginPath();
      c.moveTo(p.x + p.width / 2 - 6, p.y + p.height - 9);
      c.lineTo(p.x + p.width / 2, p.y + p.height - 9 + fireHeight);
      c.lineTo(p.x + p.width / 2 + 6, p.y + p.height - 9);
      c.closePath();
      c.fill();

      c.shadowBlur = 0; // Reset canvas shadows
    };

    // Starfield sun backdrop
    const drawBackdropSun = (c: CanvasRenderingContext2D) => {
      const sunY = 160;
      const sunX = CANVAS_WIDTH / 2;
      const radius = 60;

      // Vaporwave neon sunset (pink yellow gradient with black horizontal horizontal cuts)
      const gradient = c.createLinearGradient(sunX, sunY - radius, sunX, sunY + radius);
      gradient.addColorStop(0, "#ff00aa"); // Hot pink apex
      gradient.addColorStop(0.6, "#ff0055");
      gradient.addColorStop(1, "#f39c12"); // Yellow base

      c.fillStyle = gradient;
      c.beginPath();
      c.arc(sunX, sunY, radius, Math.PI, 0, false); // top half sun
      c.fill();

      // Sun stripes (outrun slits)
      c.fillStyle = "#0c081d"; // matches backdrop
      for (let y = sunY - radius + 15; y < sunY; y += 8) {
        const height = Math.max(1, (y - (sunY - radius)) / 10);
        c.fillRect(sunX - radius - 2, y, radius * 2 + 4, height);
      }
    };

    // Beautiful Grid drawer
    const drawVaporwaveGrid = (c: CanvasRenderingContext2D) => {
      const gridY = CANVAS_HEIGHT - 60; // Grid starts
      c.strokeStyle = "rgba(138, 43, 226, 0.25)";
      c.lineWidth = 1.2;

      // Horizon divide line
      c.strokeStyle = "#8a2be2";
      c.beginPath();
      c.moveTo(0, gridY);
      c.lineTo(CANVAS_WIDTH, gridY);
      c.stroke();

      // Perspective vertical rays
      const center = CANVAS_WIDTH / 2;
      for (let i = -10; i <= 10; i++) {
        const gap = i * 40;
        const horizonX = center + i * 8; // Narrower at top
        const floorX = center + i * 110;  // Stretches wide at bottom

        c.beginPath();
        c.moveTo(horizonX, gridY);
        c.lineTo(floorX, CANVAS_HEIGHT);
        c.stroke();
      }

      // Horizontal lines shifting to give driving vibe
      c.strokeStyle = "rgba(255, 0, 127, 0.18)";
      const offset = (Date.now() * 0.05) % 30; // Anim speed matches driving feeling
      for (let y = gridY; y < CANVAS_HEIGHT; y += 12) {
        const scaleY = y + offset;
        c.beginPath();
        c.moveTo(0, scaleY);
        c.lineTo(CANVAS_WIDTH, scaleY);
        c.stroke();
      }
    };

    // Vector sprite drawers for retro cyber look
    const drawInvaderSprite = (c: CanvasRenderingContext2D, inv: Invader) => {
      c.shadowColor = inv.color;
      // High score highlights pulse more glows
      c.shadowBlur = 8 + (stateRef.current.beatPulse * 10);
      c.strokeStyle = inv.color;
      c.fillStyle = "rgba(12, 8, 29, 0.7)";
      c.lineWidth = 2.0;

      const f = inv.animationFrame;
      const x = inv.x;
      const y = inv.y;
      const w = inv.width;
      const h = inv.height;

      // Custom cyber vector drawings instead of low res images
      c.beginPath();
      if (inv.type === "squid") {
        // Squid: peak vector points with side tentacles
        c.moveTo(x + w / 2, y); // Top cap
        c.lineTo(x + w, y + h / 2);
        c.lineTo(x + w - 4, y + h); // tentacles
        c.lineTo(x + w / 2 + 3, y + h - 5 + f * 5);
        c.lineTo(x + w / 2 - 3, y + h - 5 + f * 5);
        c.lineTo(x + 4, y + h);
        c.lineTo(x, y + h / 2);
      } else if (inv.type === "crab") {
        // Crab claw design
        c.moveTo(x + 6, y);
        c.lineTo(x + w - 6, y);
        c.lineTo(x + w, y + h / 2);
        // pincers
        c.lineTo(x + w - 4, y + h - (f * 4));
        c.lineTo(x + w / 2 + 5, y + h - 5);
        c.lineTo(x + w / 2 - 5, y + h - 5);
        c.lineTo(x + 4, y + h - (f * 4));
        c.lineTo(x, y + h / 2);
      } else {
        // Octopus tentacles
        c.moveTo(x + w / 3, y);
        c.lineTo(x + (2 * w) / 3, y);
        c.lineTo(x + w, y + h / 3);
        c.lineTo(x + w - 2, y + h);
        c.lineTo(x + w / 2, y + h - 6 + (f * 4));
        c.lineTo(x + 2, y + h);
        c.lineTo(x, y + h / 3);
      }
      c.closePath();
      c.fill();
      c.stroke();

      // Cyber retro eyes draw
      c.fillStyle = "#ffffff";
      c.fillRect(x + w / 3 - 2, y + h / 3, 4, 4);
      c.fillRect(x + (2 * w) / 3 - 2, y + h / 3, 4, 4);

      c.shadowBlur = 0; // reset
    };

    // Begin loop immediately
    mainLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // --- LOCAL HARSH AUDIO TONE SYNTHESIS FALLBACKS ---
  // Simple quick low-resource pitch oscillators for satisfying sound feedback 
  // when lasers and explosions fire, playing on the user's audio output.
  const synthLaser = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  };

  const synthShieldHit = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  };

  const synthHitWall = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.setValueAtTime(50, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  };

  const synthExplosionBass = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(20, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const handleStartGame = () => {
    setGameStatus("PLAYING");
    initGame(true);
  };

  const handleRestart = () => {
    initGame(true);
    setGameStatus("PLAYING");
  };

  const handlePauseToggle = () => {
    if (gameStatus === "PLAYING") {
      setGameStatus("PAUSED");
    } else if (gameStatus === "PAUSED") {
      setGameStatus("PLAYING");
    }
  };

  return (
    <div id="arcade-cabinet" className="relative w-full max-w-4xl mx-auto flex flex-col items-center bg-[#0d0221]/90 backdrop-blur-md border-4 border-[#00ffff] rounded-lg overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.25)] md:p-6 p-4 z-10 transition-all duration-300">
      {/* Vaporwave Neon Header Grid */}
      <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-[#ff00ff] via-[#d400ff] to-[#00ffff] z-20" />

      {/* Stats Board */}
      <div className="w-full flex justify-between items-center bg-[#090615]/85 rounded-lg border border-[#00ffff]/30 md:px-6 md:py-3 px-3 py-2 mb-4 text-[#ff00ff]">
        <div className="flex flex-col">
          <span className="font-mono text-[9px] tracking-[0.2em] font-bold uppercase text-[#00ffff]">Score</span>
          <span className="font-mono text-xl font-bold text-white drop-shadow-[0_0_8px_rgba(255,0,255,0.6)]" style={{ textShadow: "0 0 10px #ff00ff" }}>
            {score.toString().padStart(6, "0")}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="font-mono text-[9px] tracking-[0.2em] font-bold uppercase text-[#ea97ff] flex items-center gap-1">
            <Award className="w-3 h-3 text-[#ffc600]" /> High Score
          </span>
          <span className="font-mono text-xl font-bold text-[#ffc600] drop-shadow-[0_0_8px_rgba(255,198,0,0.5)]">
            {highScore.toString().padStart(6, "0")}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="font-mono text-[9px] tracking-[0.2em] font-bold uppercase text-[#00ffff]">Wave Level</span>
          <span className="font-mono text-xl font-bold text-[#ff00ff]" style={{ textShadow: "0 0 10px #ff00ff" }}>
            Level: {level.toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Arcade Screen Frame */}
      <div ref={containerRef} className="relative w-full aspect-[8/5] bg-black/90 border-4 border-[#00ffff] rounded-sm overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.15)]">
        {/* Render actual Space invaders canvas */}
        <canvas
          id="space-invaders-canvas"
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block object-contain"
        />

        {/* Scanlines Effect Overlay (classic vaporwave pixel vibe) */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-70 z-10" />

        {/* Start Game Modal */}
        {gameStatus === "START" && (
          <div className="absolute inset-0 bg-[#070512b7] backdrop-blur-[6px] flex flex-col justify-center items-center p-6 text-center z-10">
            <h2 className="font-sans text-4xl md:text-5xl font-extrabold tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-b from-[#00ffff] to-[#d400ff] drop-shadow-[0_4px_12px_rgba(0,255,255,0.3)] mb-4">
              Synthwave Invaders
            </h2>
            <p className="max-w-md font-sans text-sm text-[#ea97ff] leading-relaxed mb-6">
              Defend the celestial synth grid against incoming multi-dimensional neon invaders. Use keys to shift and fire!
            </p>

            <button
              onClick={handleStartGame}
              className="px-8 py-3 bg-gradient-to-r from-[#ff007f] to-[#d400ff] hover:from-[#d400ff] hover:to-[#ff007f] text-white font-mono rounded-lg border border-[#f559bc] tracking-widest uppercase transition-all duration-300 transform hover:scale-105 cursor-pointer shadow-[0_0_20px_rgba(255,0,127,0.5)]"
            >
              Start Game Loop
            </button>
            <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono justify-center text-gray-500">
              <span>⬅️ / A : Left</span>
              <span>➡️ / D : Right</span>
              <span>[SPACE] : Glow Fire</span>
            </div>
          </div>
        )}

        {/* Paused Screen Overlay */}
        {gameStatus === "PAUSED" && (
          <div className="absolute inset-0 bg-[#070512af] backdrop-blur-[4px] flex flex-col justify-center items-center z-10">
            <div className="p-1 rounded-full bg-[#d400ff]/10 border border-[#d400ff]/30 animate-pulse mb-3">
              <Pause className="w-10 h-10 text-[#d400ff]" />
            </div>
            <h3 className="font-mono text-2xl tracking-widest text-[#d400ff] uppercase font-bold">GRID PAUSED</h3>
            <span className="font-sans text-xs text-gray-400 mt-2">Press button below to resume action</span>
            <button
              onClick={handlePauseToggle}
              className="mt-4 px-6 py-2 bg-[#d400ff]/20 hover:bg-[#d400ff]/40 text-white font-mono text-xs rounded border border-[#d400ff] uppercase transition"
            >
              Resume
            </button>
          </div>
        )}

        {/* Victory Screen Overlay */}
        {gameStatus === "VICTORY" && (
          <div className="absolute inset-0 bg-[#070512cf] backdrop-blur-[6px] flex flex-col justify-center items-center p-6 text-center z-10">
            <h2 className="font-sans text-4xl font-extrabold uppercase text-[#00ffff] animate-pulse drop-shadow-[0_0_15px_rgba(0,255,255,0.7)] mb-3">
              WAVE CLEAR!
            </h2>
            <p className="text-sm font-mono text-gray-400 max-w-sm mb-6 leading-relaxed">
              Grid sector cleared. Prepare for incoming wave {level} containing hyper speed hyper fire invaders!
            </p>
            <button
              onClick={() => {
                initGame(false); // keep score, level up
                setGameStatus("PLAYING");
              }}
              className="px-6 py-3 bg-gradient-to-r from-[#00ffff] to-[#00aa99] text-[#090615] font-mono rounded-lg border border-white tracking-widest uppercase transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(0,255,255,0.5)] cursor-pointer font-bold"
            >
              Engage Next Wave Lvl {level}
            </button>
          </div>
        )}

        {/* Game Over Screen Overlay */}
        {gameStatus === "GAMEOVER" && (
          <div className="absolute inset-0 bg-[#0d071acf] backdrop-blur-[6px] flex flex-col justify-center items-center p-6 text-center z-10">
            <h2 className="font-sans text-4xl font-extrabold tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#ff0055] to-[#8a0050] drop-shadow-[0_0_12px_rgba(255,0,85,0.6)] mb-2">
              GAME OVER
            </h2>
            <span className="text-[#ff00a2] font-mono text-sm mb-2">System Crashed. Final Grid Score:</span>
            <span className="text-[#00ffff] font-mono text-3xl font-extrabold drop-shadow-[0_0_15px_rgba(0,255,255,0.6)] mb-6">
              {score}
            </span>

            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-gradient-to-r from-[#ff007f] to-[#ff00aa] hover:from-[#ff00aa] hover:to-[#ff007f] text-white font-mono rounded-lg border border-[#f559bc] tracking-widest uppercase transition-all duration-300 transform hover:scale-105 cursor-pointer shadow-[0_0_20px_rgba(255,0,127,0.4)] flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 animate-spin-reverse" /> Insert Coin (Restart)
            </button>
          </div>
        )}
      </div>

      {/* Bottom Interface Dashboard for lives and ship shield charge */}
      <div className="w-full flex justify-between items-center bg-[#090615]/80 rounded-lg border border-[#ff00ff]/30 px-4 py-3 mt-4 text-[#ff00ff] font-mono text-xs">
        {/* Lives Counter as Neon Diamonds */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 uppercase tracking-widest text-[9px] font-bold">Defenders:</span>
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rotate-45 border transition-all ${
                  i < lives
                    ? "bg-[#00ffff] border-white shadow-[0_0_8px_rgba(0,255,255,0.8)]"
                    : "bg-transparent border-gray-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Shield integrity gauge buffer bar */}
        <div className="flex items-center gap-3 w-1/2 justify-end">
          <span className="text-gray-400 uppercase tracking-widest text-[9px] font-bold hidden sm:inline">Deflector shield:</span>
          <div className="flex items-center gap-1 w-32 bg-gray-950 h-3 rounded overflow-hidden border border-[#00ffff]/30">
            <div
              className={`h-full transition-all duration-300 ${
                shieldCharge <= 25
                  ? "bg-[#ff0055] shadow-[0_0_6px_#ff0055]"
                  : "bg-[#00ffff] shadow-[0_0_6px_#00ffff]"
              }`}
              style={{ width: `${shieldCharge}%` }}
            />
          </div>
          <span className="text-[#00ffff] font-semibold text-xs min-w-[28px] text-right">{shieldCharge}%</span>
        </div>
      </div>

      {/* Quick Pause Controller for active playing state */}
      {gameStatus === "PLAYING" && (
        <button
          onClick={handlePauseToggle}
          className="mt-3 px-4 py-1.5 bg-[#ff00ff]/10 hover:bg-[#ff00ff]/20 text-[#ff00ff] font-mono text-[10px] tracking-widest rounded border border-[#ff00ff]/30 uppercase transition flex items-center gap-1 cursor-pointer"
        >
          <Pause className="w-3 h-3" /> Quick Pause
        </button>
      )}
    </div>
  );
};
