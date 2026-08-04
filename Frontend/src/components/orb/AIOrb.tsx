'use client';

import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OrbState } from '@/store/useAppStore';

/* ── Config ── */
const SPHERE_COUNT = 300;
const ORBIT_RINGS = 5;
const RING_PARTICLES = 80;

const COLORS = [
  [252, 211, 77],  // #FCD34D gold
  [245, 158, 11],  // #F59E0B amber
  [217, 119, 6],   // #D97706 orange
  [251, 191, 36],  // #FBBF24 yellow
  [180, 83, 9],    // #B45309 deep orange
];

interface Particle {
  theta: number;
  phi: number;
  radius: number;
  speed: number;
  size: number;
  color: number[];
  offset: number;
}

interface RingParticle {
  angle: number;
  rx: number;
  ry: number;
  tiltX: number;
  tiltZ: number;
  speed: number;
  size: number;
  color: number[];
}

/* ── Create sphere particles ── */
function createSphereParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < SPHERE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 0.85 + Math.random() * 0.15;
    particles.push({
      theta,
      phi,
      radius: r,
      speed: 0.15 + Math.random() * 0.35,
      size: 1 + Math.random() * 2.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      offset: Math.random() * Math.PI * 2,
    });
  }
  return particles;
}

/* ── Create orbit ring configs + particles ── */
function createRingData() {
  const rings: {
    rx: number; ry: number; tiltX: number; tiltZ: number; speed: number; color: number[];
    particles: RingParticle[];
  }[] = [];
  const configs = [
    { rx: 1.6, ry: 0.5, tiltX: 0.5, tiltZ: 0.2, speed: 0.4 },
    { rx: 1.3, ry: 0.4, tiltX: -0.4, tiltZ: 0.8, speed: -0.55 },
    { rx: 1.8, ry: 0.6, tiltX: 1.1, tiltZ: -0.3, speed: 0.25 },
    { rx: 1.1, ry: 0.35, tiltX: 0.8, tiltZ: 0.5, speed: -0.7 },
    { rx: 2.0, ry: 0.7, tiltX: -0.2, tiltZ: -0.6, speed: 0.18 },
  ];
  configs.forEach((cfg, i) => {
    const particles: RingParticle[] = [];
    for (let j = 0; j < RING_PARTICLES; j++) {
      particles.push({
        angle: (j / RING_PARTICLES) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
        rx: cfg.rx,
        ry: cfg.ry,
        tiltX: cfg.tiltX,
        tiltZ: cfg.tiltZ,
        speed: cfg.speed * (0.8 + Math.random() * 0.4),
        size: 1 + Math.random() * 2,
        color: COLORS[i % COLORS.length],
      });
    }
    rings.push({ ...cfg, color: COLORS[i % COLORS.length], particles });
  });
  return rings;
}

/* ── 3D projection ── */
function project(x: number, y: number, z: number, cx: number, cy: number, scale: number): [number, number, number] {
  const perspective = 4;
  const factor = perspective / (perspective + z);
  return [cx + x * scale * factor, cy + y * scale * factor, factor];
}

function rotateY(x: number, y: number, z: number, angle: number): [number, number, number] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [x * c - z * s, y, x * s + z * c];
}

function rotateX(x: number, y: number, z: number, angle: number): [number, number, number] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [x, y * c - z * s, y * s + z * c];
}

function rotateZ(x: number, y: number, z: number, angle: number): [number, number, number] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [x * c - y * s, x * s + y * c, z];
}

/* ── Smooth value helper ── */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* ── Main component ── */
export default function AIOrb({ orbState, audioLevel = 0, size = 300, showLabel = true }: {
  orbState: OrbState; audioLevel?: number; size?: number; showLabel?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sphereRef = useRef<Particle[]>(createSphereParticles());
  const ringsRef = useRef(createRingData());
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  // Smoothed audio for reactive animation
  const smoothAudioRef = useRef(0);
  // Voice-reactive rotation accumulator
  const voiceRotYRef = useRef(0);
  const voiceRotXRef = useRef(0);
  // Scale multiplier for zoom effect
  const scaleRef = useRef(1);

  const stateLabels: Record<OrbState, string> = {
    idle: '',
    listening: 'En ecoute...',
    thinking: 'Analyse...',
    speaking: 'Generation...',
    error: 'Erreur',
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = size;
    const h = size;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const baseScale = w / 5;

    ctx.clearRect(0, 0, w, h);

    // Smooth the audio level to avoid jitter
    const audioSmoothFactor = 0.15;
    smoothAudioRef.current = lerp(smoothAudioRef.current, audioLevel, audioSmoothFactor);
    const smoothAudio = smoothAudioRef.current;

    // Voice-reactive rotation: orb turns based on voice intensity
    const isVoiceActive = orbState === 'listening' || orbState === 'speaking';
    if (isVoiceActive && smoothAudio > 0.05) {
      // Rotate faster and direction changes with audio intensity
      voiceRotYRef.current += smoothAudio * 0.12;
      voiceRotXRef.current += Math.sin(timeRef.current * 2) * smoothAudio * 0.04;
    } else {
      // Slowly return to neutral
      voiceRotXRef.current *= 0.95;
    }

    // Voice-reactive zoom: orb pulses/breathes with voice
    const targetScale = isVoiceActive
      ? 1 + smoothAudio * 0.35 // Zoom out up to 35% louder
      : 1;
    scaleRef.current = lerp(scaleRef.current, targetScale, 0.08);
    const voiceScale = scaleRef.current;

    const speedMult = orbState === 'thinking' ? 3 : orbState === 'listening' ? 2 : orbState === 'speaking' ? 1.2 : 0.5;
    const audioMult = 1 + smoothAudio * 0.5;
    timeRef.current += 0.016 * speedMult;
    const t = timeRef.current;

    // Global rotation = base slow rotation + voice-reactive rotation
    const globalRotY = t * 0.15 + voiceRotYRef.current;
    const globalRotX = Math.sin(t * 0.08) * 0.15 + voiceRotXRef.current;

    const scale = baseScale * voiceScale;

    // Draw center glow - pulses with voice
    const glowRadius = (60 + smoothAudio * 50) * (w / 300) * voiceScale;
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    if (orbState === 'error') {
      coreGrad.addColorStop(0, 'rgba(239,68,68,0.35)');
      coreGrad.addColorStop(0.5, 'rgba(239,68,68,0.08)');
      coreGrad.addColorStop(1, 'rgba(239,68,68,0)');
    } else {
      const glowAlpha = isVoiceActive ? 0.5 + smoothAudio * 0.3 : 0.4;
      coreGrad.addColorStop(0, `rgba(252,211,77,${glowAlpha})`);
      coreGrad.addColorStop(0.3, `rgba(245,158,11,${glowAlpha * 0.4})`);
      coreGrad.addColorStop(0.7, `rgba(217,119,6,${glowAlpha * 0.1})`);
      coreGrad.addColorStop(1, 'rgba(245,158,11,0)');
    }
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Collect all drawable points for depth sorting
    type DrawPoint = { x: number; y: number; z: number; size: number; color: number[]; alpha: number };
    const drawPoints: DrawPoint[] = [];

    // Sphere particles
    const sphereParticles = sphereRef.current;
    for (let i = 0; i < sphereParticles.length; i++) {
      const p = sphereParticles[i];
      const theta = p.theta + t * p.speed;
      const r = p.radius * audioMult * voiceScale;
      let x = r * Math.sin(p.phi) * Math.cos(theta);
      let y = r * Math.cos(p.phi);
      let z = r * Math.sin(p.phi) * Math.sin(theta);

      [x, y, z] = rotateY(x, y, z, globalRotY);
      [x, y, z] = rotateX(x, y, z, globalRotX);

      const [sx, sy, factor] = project(x, y, z, cx, cy, scale);
      const depth = (z + 2) / 4;
      const alpha = 0.3 + depth * 0.7;
      const sz = p.size * factor * (w / 300);

      drawPoints.push({ x: sx, y: sy, z, size: sz, color: p.color, alpha });
    }

    // Ring particles - also react to voice
    const rings = ringsRef.current;
    for (const ring of rings) {
      const ringSpeedBoost = isVoiceActive ? 1 + smoothAudio * 0.8 : 1;
      for (const p of ring.particles) {
        const angle = p.angle + t * p.speed * ringSpeedBoost;
        let x = p.rx * audioMult * voiceScale * Math.cos(angle);
        let y = p.ry * audioMult * voiceScale * Math.sin(angle);
        let z = 0;

        [x, y, z] = rotateX(x, y, z, p.tiltX);
        [x, y, z] = rotateZ(x, y, z, p.tiltZ);
        [x, y, z] = rotateY(x, y, z, globalRotY);
        [x, y, z] = rotateX(x, y, z, globalRotX);

        const [sx, sy, factor] = project(x, y, z, cx, cy, scale);
        const depth = (z + 2.5) / 5;
        const alpha = 0.2 + depth * 0.6;
        const sz = p.size * factor * (w / 300);

        drawPoints.push({ x: sx, y: sy, z, size: sz, color: p.color, alpha });
      }
    }

    // Sort back to front
    drawPoints.sort((a, b) => a.z - b.z);

    // Draw all points
    for (const pt of drawPoints) {
      const [r, g, b] = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${pt.alpha})`;
      ctx.fill();

      // Glow for larger particles - brighter when voice is active
      if (pt.size > 2) {
        const glowSizeMult = isVoiceActive ? 1 + smoothAudio * 1.5 : 1;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * 2.5 * glowSizeMult, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${pt.alpha * 0.15 * (isVoiceActive ? 1 + smoothAudio * 2 : 1)})`;
        ctx.fill();
      }
    }

    // Draw faint orbit ring outlines
    for (const ring of rings) {
      const ringSpeedBoost = isVoiceActive ? 1 + smoothAudio * 0.8 : 1;
      ctx.beginPath();
      const segs = 100;
      for (let i = 0; i <= segs; i++) {
        const angle = (i / segs) * Math.PI * 2;
        let x = ring.rx * audioMult * voiceScale * Math.cos(angle);
        let y = ring.ry * audioMult * voiceScale * Math.sin(angle);
        let z = 0;
        [x, y, z] = rotateX(x, y, z, ring.tiltX);
        [x, y, z] = rotateZ(x, y, z, ring.tiltZ);
        [x, y, z] = rotateY(x, y, z, globalRotY);
        [x, y, z] = rotateX(x, y, z, globalRotX);
        const [sx, sy] = project(x, y, z, cx, cy, scale);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      const [cr, cg, cb] = ring.color;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${isVoiceActive ? 0.08 + smoothAudio * 0.12 : 0.08})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Inner core dot - pulses with voice
    const coreSize = (4 + smoothAudio * 12) * (w / 300) * voiceScale;
    const coreColor = orbState === 'error' ? '239,68,68' : '252,211,77';
    const coreGrad2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
    const coreAlpha = isVoiceActive ? 0.95 : 0.9;
    coreGrad2.addColorStop(0, `rgba(${coreColor},${coreAlpha})`);
    coreGrad2.addColorStop(0.5, `rgba(${coreColor},0.3)`);
    coreGrad2.addColorStop(1, `rgba(${coreColor},0)`);
    ctx.fillStyle = coreGrad2;
    ctx.beginPath();
    ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
    ctx.fill();

    // Voice wave ring when listening
    if (isVoiceActive && smoothAudio > 0.1) {
      const waveRadius = (80 + smoothAudio * 40) * (w / 300) * voiceScale;
      ctx.beginPath();
      ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(245,158,11,${smoothAudio * 0.3})`;
      ctx.lineWidth = 1.5 + smoothAudio * 2;
      ctx.stroke();

      // Second ring
      const wave2Radius = (100 + smoothAudio * 50) * (w / 300) * voiceScale;
      ctx.beginPath();
      ctx.arc(cx, cy, wave2Radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(217,119,6,${smoothAudio * 0.15})`;
      ctx.lineWidth = 1 + smoothAudio;
      ctx.stroke();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [orbState, audioLevel, size]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <motion.div
        className="relative"
        style={{ width: size, height: size }}
        animate={{
          scale: orbState === 'thinking' ? 1.05 : 1,
        }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size, background: 'transparent' }}
        />
      </motion.div>
      <AnimatePresence>
        {showLabel && stateLabels[orbState] && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 text-xs font-medium tracking-[0.2em] uppercase text-[#D97706]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {stateLabels[orbState]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
