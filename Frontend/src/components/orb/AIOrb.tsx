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

/* ── Main component ── */
export default function AIOrb({ orbState, audioLevel = 0, size = 300, showLabel = true }: {
  orbState: OrbState; audioLevel?: number; size?: number; showLabel?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sphereRef = useRef<Particle[]>(createSphereParticles());
  const ringsRef = useRef(createRingData());
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

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
    const scale = w / 5;

    ctx.clearRect(0, 0, w, h);

    const speedMult = orbState === 'thinking' ? 3 : orbState === 'listening' ? 2 : orbState === 'speaking' ? 1.2 : 0.5;
    const audioMult = 1 + audioLevel * 0.4;
    timeRef.current += 0.016 * speedMult;
    const t = timeRef.current;

    // Global slow rotation
    const globalRotY = t * 0.15;
    const globalRotX = Math.sin(t * 0.08) * 0.15;

    // Draw center glow
    const glowRadius = (60 + audioLevel * 30) * (w / 300);
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    if (orbState === 'error') {
      coreGrad.addColorStop(0, 'rgba(239,68,68,0.35)');
      coreGrad.addColorStop(0.5, 'rgba(239,68,68,0.08)');
      coreGrad.addColorStop(1, 'rgba(239,68,68,0)');
    } else {
      coreGrad.addColorStop(0, 'rgba(252,211,77,0.4)');
      coreGrad.addColorStop(0.3, 'rgba(245,158,11,0.15)');
      coreGrad.addColorStop(0.7, 'rgba(217,119,6,0.04)');
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
      const r = p.radius * audioMult;
      let x = r * Math.sin(p.phi) * Math.cos(theta);
      let y = r * Math.cos(p.phi);
      let z = r * Math.sin(p.phi) * Math.sin(theta);

      [x, y, z] = rotateY(x, y, z, globalRotY);
      [x, y, z] = rotateX(x, y, z, globalRotX);

      const [sx, sy, factor] = project(x, y, z, cx, cy, scale);
      const depth = (z + 2) / 4; // 0..1
      const alpha = 0.3 + depth * 0.7;
      const sz = p.size * factor * (w / 300);

      drawPoints.push({ x: sx, y: sy, z, size: sz, color: p.color, alpha });
    }

    // Ring particles
    const rings = ringsRef.current;
    for (const ring of rings) {
      for (const p of ring.particles) {
        const angle = p.angle + t * p.speed;
        let x = p.rx * audioMult * Math.cos(angle);
        let y = p.ry * audioMult * Math.sin(angle);
        let z = 0;

        // Apply ring tilt
        [x, y, z] = rotateX(x, y, z, p.tiltX);
        [x, y, z] = rotateZ(x, y, z, p.tiltZ);

        // Apply global rotation
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

      // Glow for larger particles
      if (pt.size > 2) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${pt.alpha * 0.15})`;
        ctx.fill();
      }
    }

    // Draw faint orbit ring outlines
    for (const ring of rings) {
      ctx.beginPath();
      const segs = 100;
      for (let i = 0; i <= segs; i++) {
        const angle = (i / segs) * Math.PI * 2;
        let x = ring.rx * audioMult * Math.cos(angle);
        let y = ring.ry * audioMult * Math.sin(angle);
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
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.08)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Inner core dot
    const coreSize = (4 + audioLevel * 8) * (w / 300);
    const coreColor = orbState === 'error' ? '239,68,68' : '252,211,77';
    const coreGrad2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
    coreGrad2.addColorStop(0, `rgba(${coreColor},0.9)`);
    coreGrad2.addColorStop(0.5, `rgba(${coreColor},0.3)`);
    coreGrad2.addColorStop(1, `rgba(${coreColor},0)`);
    ctx.fillStyle = coreGrad2;
    ctx.beginPath();
    ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
    ctx.fill();

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
        animate={{ scale: orbState === 'thinking' ? 1.05 : 1 }}
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
