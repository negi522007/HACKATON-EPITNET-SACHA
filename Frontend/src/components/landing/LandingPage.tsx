'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  ChevronRight, ChevronDown, Zap, Globe, Shield, Palette, MessageSquare, Rocket,
  Sparkles, Layers, Code2, Smartphone, ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { t } from '@/lib/i18n';
import ThemeToggle from '@/components/common/ThemeToggle';
import LanguageToggle from '@/components/common/LanguageToggle';
import { useTheme } from 'next-themes';
import { useMousePosition } from '@/hooks/useMousePosition';

type Lang = 'fr' | 'en';

/* ───────── Wavy Aura Canvas (section-level, no rectangle) ───────── */
function WavyAura({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const mouseRef = useRef({ nx: 0, ny: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const onMouse = (e: MouseEvent) => {
      mouseRef.current.nx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.ny = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });
    let raf: number;
    const tick = () => {
      const mNx = mouseRef.current.nx;
      const mNy = mouseRef.current.ny;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      timeRef.current += 0.012;
      const ti = timeRef.current;
      ctx.clearRect(0, 0, w, h);
      const waveLayers = [
        { freq: 0.008, amp: 25 + mNy * 8, speed: 0.6, yOff: 0.45 + mNx * 0.03, color: [252, 211, 77], alpha: isDark ? 0.25 : 0.3, blur: 50 },
        { freq: 0.012, amp: 18 + mNy * 5, speed: -0.8, yOff: 0.55 + mNx * -0.02, color: [245, 158, 11], alpha: isDark ? 0.20 : 0.25, blur: 40 },
        { freq: 0.006, amp: 30 + mNy * 10, speed: 0.4, yOff: 0.50 + mNx * 0.02, color: [217, 119, 6], alpha: isDark ? 0.15 : 0.18, blur: 60 },
        { freq: 0.015, amp: 12 + mNy * 4, speed: -1.0, yOff: 0.48 + mNx * -0.03, color: [251, 191, 36], alpha: isDark ? 0.18 : 0.22, blur: 35 },
        { freq: 0.010, amp: 22 + mNy * 7, speed: 0.5, yOff: 0.52 + mNx * 0.025, color: [180, 83, 9], alpha: isDark ? 0.10 : 0.12, blur: 55 },
      ];
      for (const layer of waveLayers) {
        ctx.save();
        ctx.filter = 'blur(' + layer.blur + 'px)';
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 4) {
          const wave1 = Math.sin(x * layer.freq + ti * layer.speed) * layer.amp;
          const wave2 = Math.sin(x * layer.freq * 1.5 + ti * layer.speed * 0.7 + 1.2) * layer.amp * 0.4;
          const wave3 = Math.cos(x * layer.freq * 0.5 + ti * layer.speed * 1.3 + 2.8) * layer.amp * 0.3;
          const y = h * layer.yOff + wave1 + wave2 + wave3;
          if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(w + 20, h); ctx.lineTo(-20, h); ctx.closePath();
        const [r, g, b] = layer.color;
        const grad = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.9);
        grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + layer.alpha + ')');
        grad.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',' + (layer.alpha * 0.6) + ')');
        grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }
      for (let i = 0; i < 8; i++) {
        const phase = (i / 8) * Math.PI * 2;
        const ox = w * 0.1 + w * 0.8 * ((Math.sin(ti * 0.3 + phase) + 1) / 2);
        const oy = h * 0.5 + Math.sin(ti * 0.5 + phase * 1.5) * 30;
        const orbR = 30 + Math.sin(ti * 0.8 + phase) * 15;
        const orbAlpha = 0.08 + Math.sin(ti * 0.6 + phase) * 0.04;
        ctx.save(); ctx.filter = 'blur(25px)';
        const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, orbR);
        og.addColorStop(0, 'rgba(245,158,11,' + orbAlpha + ')');
        og.addColorStop(1, 'rgba(245,158,11,0)');
        ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ox, oy, orbR, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', onMouse); };
  }, [isDark]);

  return <canvas ref={canvasRef} className='absolute inset-0 pointer-events-none' style={{ width: '100%', height: '100%', zIndex: 1 }} />;
}

/* ───────── 3D Depth Card with mouse parallax ───────── */
function DepthCard(props: { children: React.ReactNode; isDark: boolean; className?: string; mouseNx?: number; mouseNy?: number }) {
  const { children, isDark, className, mouseNx = 0, mouseNy = 0 } = props;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { margin: '-8% 0px -8% 0px', amount: 0.2 });
  const [hovered, setHovered] = useState(false);
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const onMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setMx((e.clientX - r.left) / r.width - 0.5);
    setMy((e.clientY - r.top) / r.height - 0.5);
  }, []);
  const rx = hovered ? -my * 15 : mouseNy * -3;
  const ry = hovered ? mx * 15 : mouseNx * 3;
  const sc = isInView ? (hovered ? 1.03 : 1) : 0.9;
  const bl = isInView ? 0 : 6;
  const op = isInView ? 1 : 0.4;
  return (
    <div ref={ref} onMouseMove={onMove} onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setMx(0); setMy(0); }} className={'transition-all duration-700 ease-out ' + (className || '')} style={{ perspective: '1200px', perspectiveOrigin: 'center center', transform: 'translateZ(' + (isInView ? 0 : -100) + 'px) scale(' + sc + ')', filter: 'blur(' + bl + 'px)', opacity: op }}>
      <div className='rounded-2xl overflow-hidden' style={{ transform: 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)', transformStyle: 'preserve-3d', transition: 'transform 0.3s ease-out, box-shadow 0.5s ease', border: '1px solid ' + (isDark ? 'rgba(61,36,18,0.8)' : 'rgba(217,119,6,0.2)'), background: isDark ? 'linear-gradient(145deg, rgba(26,15,6,0.92), rgba(44,24,8,0.75))' : 'linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,247,237,0.92))', backdropFilter: 'blur(20px)', boxShadow: hovered ? '0 0 3px rgba(245,158,11,0.7), 0 0 25px rgba(245,158,11,0.25), 0 0 80px rgba(245,158,11,0.1)' : '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div className='p-8 sm:p-10'>{children}</div>
      </div>
    </div>
  );
}

function ScrollSection(props: { children: React.ReactNode; className?: string; delay?: number }) {
  const { children, className, delay } = props;
  const ref = useRef<HTMLDivElement>(null);
  const v = useInView(ref, { margin: '-60px 0px', amount: 0.1 });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 80, scale: 0.94 }} animate={v ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 80, scale: 0.94 }} transition={{ duration: 0.9, delay: delay || 0, ease: [0.22, 0.61, 0.36, 1] }} className={className}>{children}</motion.div>
  );
}

const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };
const staggerItem = { hidden: { opacity: 0, y: 40, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.22, 0.61, 0.36, 1] } } };

function TemplateCard({ title, desc, img, isDark, mouseNx, mouseNy }: { title: string; desc: string; img: string; isDark: boolean; lang: Lang; mouseNx?: number; mouseNy?: number }) {
  const [hovered, setHovered] = useState(false);
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setMx((e.clientX - r.left) / r.width - 0.5);
    setMy((e.clientY - r.top) / r.height - 0.5);
  }, []);
  const tiltX = hovered ? -my * 8 : (mouseNy || 0) * -2;
  const tiltY = hovered ? mx * 8 : (mouseNx || 0) * 2;
  return (
    <motion.div ref={ref} variants={staggerItem} onMouseMove={onMove} onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setMx(0); setMy(0); }} className='rounded-2xl overflow-hidden'
      style={{ transform: 'perspective(1000px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg) scale(' + (hovered ? 1.03 : 1) + ')', transition: 'transform 0.4s ease-out', border: '1px solid ' + (isDark ? 'rgba(61,36,18,0.6)' : 'rgba(217,119,6,0.15)'), boxShadow: hovered ? '0 0 3px rgba(245,158,11,0.5), 0 0 20px rgba(245,158,11,0.15), 0 8px 32px rgba(0,0,0,0.12)' : '0 4px 16px rgba(0,0,0,0.06)', background: isDark ? 'rgba(26,15,6,0.9)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' }}>
      <div className='flex items-center gap-2 px-3 py-2' style={{ background: isDark ? 'rgba(13,8,4,0.6)' : 'rgba(245,240,235,0.8)', borderBottom: '1px solid ' + (isDark ? 'rgba(61,36,18,0.4)' : 'rgba(231,224,216,0.6)') }}>
        <div className='flex gap-1'><div className='w-2 h-2 rounded-full' style={{ background: '#EF4444' }} /><div className='w-2 h-2 rounded-full' style={{ background: '#FBBF24' }} /><div className='w-2 h-2 rounded-full' style={{ background: '#22C55E' }} /></div>
        <div className='flex-1 flex justify-center'><div className='px-3 py-0.5 rounded text-[9px] font-mono' style={{ background: isDark ? 'rgba(44,24,8,0.5)' : 'rgba(0,0,0,0.04)', color: isDark ? 'rgba(245,230,208,0.35)' : 'rgba(0,0,0,0.3)' }}>www.{title.toLowerCase().replace(/\s/g, '-')}.com</div></div>
      </div>
      <div className='relative overflow-hidden' style={{ height: '200px' }}><img src={img} alt={title} className='w-full h-full object-cover' loading='lazy' /></div>
      <div className='px-5 py-4' style={{ borderTop: '1px solid ' + (isDark ? 'rgba(61,36,18,0.4)' : 'rgba(231,224,216,0.6)') }}>
        <h4 className='text-sm font-bold' style={{ fontFamily: "'Space Grotesk', sans-serif", color: isDark ? '#F5E6D0' : '#1A1A1A' }}>{title}</h4>
        <p className='text-[11px] mt-0.5' style={{ color: isDark ? 'rgba(245,230,208,0.45)' : 'rgba(26,26,26,0.4)' }}>{desc}</p>
      </div>
    </motion.div>
  );
}

const FEATS = [
  { icon: Zap, color: '#FCD34D', ft: 'Generation Instantanee', et: 'Instant Generation', fd: 'Decrivez votre projet en langage naturel et regardez votre site prendre vie en quelques secondes. Aucune competence technique requise.', ed: 'Describe your project in natural language and watch your site come to life in seconds.' },
  { icon: Palette, color: '#F59E0B', ft: 'Design Personnalise', et: 'Custom Design', fd: 'Choisissez votre style, palette de couleurs et typographie. Chaque site genere est unique et reflecte votre identite.', ed: 'Choose your style, color palette, and typography. Every generated site is unique and reflects your identity.' },
  { icon: Smartphone, color: '#D97706', ft: '100% Responsive', et: '100% Responsive', fd: 'Vos sites s adaptent parfaitement a tous les ecrans, du mobile au desktop.', ed: 'Your sites adapt perfectly to all screens, from mobile to desktop.' },
  { icon: Shield, color: '#B45309', ft: 'Securise par Defaut', et: 'Secure by Default', fd: 'CSP headers, sanitisation HTML et meilleures pratiques de securite integrees.', ed: 'CSP headers, HTML sanitization and best security practices built-in.' },
  { icon: Globe, color: '#FBBF24', ft: 'Deploiement en un Clic', et: 'One-Click Deploy', fd: 'Publiez votre site sur internet en quelques secondes.', ed: 'Publish your site online in seconds.' },
  { icon: Code2, color: '#FCA311', ft: 'Code Propre', et: 'Clean Code', fd: 'Code optimise, semantique et SEO-friendly.', ed: 'Optimized, semantic, and SEO-friendly code.' },
];
const STEPS = [
  { step: '01', icon: MessageSquare, color: '#FCD34D', ft: 'Decrivez', et: 'Describe', fd: 'Expliquez votre projet a l IA en quelques mots.', ed: 'Explain your project to AI in a few words.' },
  { step: '02', icon: Sparkles, color: '#F59E0B', ft: 'Personnalisez', et: 'Customize', fd: 'Choisissez votre direction artistique.', ed: 'Choose your artistic direction.' },
  { step: '03', icon: Rocket, color: '#D97706', ft: 'Lancez', et: 'Launch', fd: 'Apercu en temps reel et deploiement en un clic.', ed: 'Real-time preview and deploy in one click.' },
];
const STATS = [
  { v: '30s', fl: 'pour generer un site', el: 'to generate a site' },
  { v: '100%', fl: 'responsive design', el: 'responsive design' },
  { v: '0', fl: 'connaissance technique requise', el: 'technical knowledge required' },
  { v: '24/7', fl: 'disponible pour creer', el: 'available to create' },
];
const TEMPLATES = [
  { title: 'Restaurant Gourmet', desc: 'Site vitrine gastronomique', img: '/templates/restaurant.png' },
  { title: 'Studio Creatif', desc: 'Portfolio design moderne', img: '/templates/studio.png' },
  { title: 'Tech Startup', desc: 'Landing page SaaS', img: '/templates/startup.png' },
  { title: 'Cabinet Avocat', desc: 'Site professionnel juridique', img: '/templates/avocat.png' },
  { title: 'Photographe Pro', desc: 'Galerie photo minimaliste', img: '/templates/photographe.png' },
  { title: 'Agence Digitale', desc: 'Site agence impactant', img: '/templates/agence.png' },
];

function MouseGlow() {
  const { x, y, nx, ny } = useMousePosition();
  const size = 300 + Math.abs(nx) * 80 + Math.abs(ny) * 60;
  const alpha = 0.06 + (Math.abs(nx) + Math.abs(ny)) * 0.02;
  return (
    <>
      <div className='fixed pointer-events-none z-[9999]' style={{ left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,' + alpha + ') 0%, transparent 70%)', filter: 'blur(20px)', transition: 'left 0.08s ease-out, top 0.08s ease-out, width 0.3s, height 0.3s' }} />
      <div className='fixed pointer-events-none z-[9998]' style={{ left: x - 4, top: y - 4, width: 8, height: 8, borderRadius: '50%', background: 'rgba(245,158,11,0.35)', boxShadow: '0 0 12px rgba(245,158,11,0.4), 0 0 30px rgba(245,158,11,0.15)', transition: 'left 0.05s linear, top 0.05s linear' }} />
    </>
  );
}

export default function LandingPage() {
  const { setScreen, language } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = mounted ? resolvedTheme === 'dark' : false;
  const mouse = useMousePosition();
  const { scrollYProgress } = useScroll();
  const hOp = useTransform(scrollYProgress, [0, 0.08], [1, 0]);
  const hSc = useTransform(scrollYProgress, [0, 0.08], [1, 0.94]);
  const hY = useTransform(scrollYProgress, [0, 0.08], [0, -80]);
  const bgOp = useTransform(scrollYProgress, [0, 0.05, 0.1], [1, 0.6, 0]);
  useEffect(() => { setMounted(true); }, []);
  const txtColor = isDark ? '#F5E6D0' : '#1A1A1A';
  const subColor = isDark ? 'rgba(245,230,208,0.55)' : 'rgba(26,26,26,0.55)';

  return (
    <div className='relative min-h-screen' style={{ background: isDark ? '#0D0804' : '#FFFBF5' }}>
      <MouseGlow />
      <div className='fixed inset-0 pointer-events-none overflow-hidden z-0'>
        <div className='absolute w-[900px] h-[900px] rounded-full transition-transform duration-[2000ms] ease-out' style={{ top: '-25%', left: '-20%', transform: 'translate(' + (mouse.nx * 30) + 'px,' + (mouse.ny * 20) + 'px)', background: 'radial-gradient(circle,' + (isDark ? 'rgba(245,158,11,0.10)' : 'rgba(252,211,77,0.40)') + ' 0%,transparent 65%)', filter: 'blur(90px)' }} />
        <div className='absolute w-[800px] h-[800px] rounded-full transition-transform duration-[2500ms] ease-out' style={{ top: '25%', right: '-20%', transform: 'translate(' + (mouse.nx * -25) + 'px,' + (mouse.ny * 15) + 'px)', background: 'radial-gradient(circle,' + (isDark ? 'rgba(217,119,6,0.08)' : 'rgba(245,158,11,0.30)') + ' 0%,transparent 65%)', filter: 'blur(100px)' }} />
        <div className='absolute w-[700px] h-[700px] rounded-full transition-transform duration-[3000ms] ease-out' style={{ top: '60%', left: '15%', transform: 'translate(' + (mouse.nx * 20) + 'px,' + (mouse.ny * -25) + 'px)', background: 'radial-gradient(circle,' + (isDark ? 'rgba(180,83,9,0.06)' : 'rgba(217,119,6,0.25)') + ' 0%,transparent 65%)', filter: 'blur(90px)' }} />
        <div className='absolute w-[500px] h-[500px] rounded-full transition-transform duration-[2200ms] ease-out' style={{ top: '80%', right: '10%', transform: 'translate(' + (mouse.nx * -15) + 'px,' + (mouse.ny * -20) + 'px)', background: 'radial-gradient(circle,' + (isDark ? 'rgba(251,191,36,0.05)' : 'rgba(251,191,36,0.30)') + ' 0%,transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <section className='relative min-h-screen flex flex-col items-center justify-center px-6 text-center pt-20'>
        <motion.div className='absolute inset-0' style={{ opacity: bgOp, zIndex: 0 }}>
          <img src='/landing-bg.jpg' alt='' className='absolute inset-0 w-full h-full object-cover' />
          <div className='absolute inset-0' style={{ background: isDark ? 'linear-gradient(180deg,rgba(13,8,4,0.70) 0%,rgba(13,8,4,0.55) 40%,rgba(13,8,4,0.75) 100%)' : 'linear-gradient(180deg,rgba(255,247,237,0.50) 0%,rgba(255,247,237,0.60) 40%,rgba(255,251,245,0.80) 100%)' }} />
          <div className='absolute inset-0' style={{ background: 'radial-gradient(ellipse at 50% 30%,rgba(245,158,11,0.18) 0%,transparent 70%)' }} />
        </motion.div>
        <WavyAura isDark={isDark} />
        <motion.div style={{ opacity: hOp, scale: hSc, y: hY }} className='relative z-10 flex flex-col items-center'>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.8, type: 'spring', stiffness: 100 }}>
            <h1 style={{ fontFamily: "'Lobster', cursive", fontWeight: 400, fontSize: 'clamp(5rem, 15vw, 12rem)', lineHeight: 1.2, background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 30%, #D97706 60%, #FBBF24 80%, #FCD34D 100%)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 40px rgba(245,158,11,0.5)) drop-shadow(0 0 80px rgba(217,119,6,0.25)) drop-shadow(0 4px 8px rgba(0,0,0,0.1))', animation: 'gradient-shift 4s ease infinite' }}>SACHA</h1>
          </motion.div>
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }} className='mt-8 mb-12 max-w-2xl mx-auto leading-snug font-medium' style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.5rem, 4vw, 3rem)', color: isDark ? '#F5E6D0' : '#1A1A1A', textShadow: isDark ? '0 2px 20px rgba(0,0,0,0.5)' : '0 2px 20px rgba(255,255,255,0.8)' }}>{t('landing.subtitle', language)}</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} className='flex flex-col sm:flex-row items-center gap-4'>
            <motion.button whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(245,158,11,0.4)' }} whileTap={{ scale: 0.95 }} onClick={() => setScreen('auth')} className='flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-[#F59E0B] via-[#E8930A] to-[#D97706] rounded-2xl warm-hover' style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t('landing.cta', language)}<ChevronRight className='w-5 h-5' /></motion.button>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }} className='mt-16 flex flex-col items-center gap-2'>
            <span className='text-[10px] uppercase tracking-[0.2em]' style={{ color: isDark ? 'rgba(245,230,208,0.3)' : 'rgba(26,26,26,0.3)', fontFamily: "'JetBrains Mono', monospace" }}>{language === 'fr' ? 'Decouvrir' : 'Discover'}</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}><ChevronDown className='w-5 h-5' style={{ color: '#D97706' }} /></motion.div>
          </motion.div>
        </motion.div>
      </section>

      <section className='relative z-10 py-20 px-6' style={{ background: isDark ? 'linear-gradient(180deg,rgba(13,8,4,0.95),rgba(26,15,6,0.9))' : 'linear-gradient(180deg,rgba(255,251,245,0.95),rgba(255,247,237,0.95))' }}>
        <motion.div variants={staggerContainer} initial='hidden' whileInView='visible' viewport={{ margin: '-60px 0px', amount: 0.2 }} className='max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6'>
          {STATS.map((s, i) => (<motion.div key={i} variants={staggerItem} className='text-center' whileHover={{ scale: 1.08 }}><p className='text-4xl sm:text-5xl font-bold mb-2' style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#F59E0B' }}>{s.v}</p><p className='text-sm' style={{ color: subColor }}>{language === 'fr' ? s.fl : s.el}</p></motion.div>))}
        </motion.div>
      </section>

      <section className='relative z-10 py-24 px-6'>
        <ScrollSection><div className='text-center mb-16'><p className='text-xs uppercase tracking-[0.3em] mb-4' style={{ color: '#D97706', fontFamily: "'JetBrains Mono', monospace" }}>Templates</p><h2 className='text-3xl sm:text-4xl font-bold' style={{ fontFamily: "'Space Grotesk', sans-serif", color: txtColor }}>{language === 'fr' ? 'Des sites professionnels, generes en un instant' : 'Professional sites, generated instantly'}</h2></div></ScrollSection>
        <motion.div variants={staggerContainer} initial='hidden' whileInView='visible' viewport={{ margin: '-40px 0px', amount: 0.1 }} className='max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {TEMPLATES.map((tpl, i) => (<TemplateCard key={i} title={tpl.title} desc={tpl.desc} img={tpl.img} isDark={isDark} lang={language} mouseNx={mouse.nx} mouseNy={mouse.ny} />))}
        </motion.div>
      </section>

      <section className='relative z-10 py-24 px-6'>
        <ScrollSection><div className='text-center mb-16'><p className='text-xs uppercase tracking-[0.3em] mb-4' style={{ color: '#D97706', fontFamily: "'JetBrains Mono', monospace" }}>{language === 'fr' ? 'Comment ca marche' : 'How it works'}</p><h2 className='text-3xl sm:text-4xl font-bold' style={{ fontFamily: "'Space Grotesk', sans-serif", color: txtColor }}>{language === 'fr' ? 'Trois etapes, zero complication' : 'Three steps, zero complexity'}</h2></div></ScrollSection>
        <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8'>
          {STEPS.map((s, i) => (<ScrollSection key={i} delay={i * 0.15}><DepthCard isDark={isDark} mouseNx={mouse.nx} mouseNy={mouse.ny}><div className='text-center'><div className='inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6' style={{ background: 'linear-gradient(135deg,' + s.color + '22,' + s.color + '11)' }}><s.icon className='w-7 h-7' style={{ color: s.color }} /></div><span className='text-xs mb-2 block' style={{ color: '#D97706', fontFamily: "'JetBrains Mono', monospace" }}>{s.step}</span><h3 className='text-xl font-bold mb-3' style={{ fontFamily: "'Space Grotesk', sans-serif", color: txtColor }}>{language === 'fr' ? s.ft : s.et}</h3><p className='text-sm leading-relaxed' style={{ color: subColor }}>{language === 'fr' ? s.fd : s.ed}</p></div></DepthCard></ScrollSection>))}
        </div>
      </section>

      <section className='relative z-10 py-24 px-6'>
        <ScrollSection><div className='text-center mb-16'><p className='text-xs uppercase tracking-[0.3em] mb-4' style={{ color: '#D97706', fontFamily: "'JetBrains Mono', monospace" }}>{language === 'fr' ? 'Fonctionnalites' : 'Features'}</p><h2 className='text-3xl sm:text-4xl font-bold' style={{ fontFamily: "'Space Grotesk', sans-serif", color: txtColor }}>{language === 'fr' ? 'Tout ce dont vous avez besoin' : 'Everything you need'}</h2></div></ScrollSection>
        <motion.div variants={staggerContainer} initial='hidden' whileInView='visible' viewport={{ margin: '-40px 0px', amount: 0.1 }} className='max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'>
          {FEATS.map((f, i) => (<motion.div key={i} variants={staggerItem}><DepthCard isDark={isDark} mouseNx={mouse.nx} mouseNy={mouse.ny}><div className='flex items-start gap-4'><div className='shrink-0 w-12 h-12 rounded-xl flex items-center justify-center' style={{ background: 'linear-gradient(135deg,' + f.color + '22,' + f.color + '11)' }}><f.icon className='w-6 h-6' style={{ color: f.color }} /></div><div><h3 className='text-base font-bold mb-2' style={{ fontFamily: "'Space Grotesk', sans-serif", color: txtColor }}>{language === 'fr' ? f.ft : f.et}</h3><p className='text-sm leading-relaxed' style={{ color: subColor }}>{language === 'fr' ? f.fd : f.ed}</p></div></div></DepthCard></motion.div>))}
        </motion.div>
      </section>

      <section className='relative z-10 py-24 px-6'>
        <ScrollSection>
          <div className='max-w-5xl mx-auto'>
            <DepthCard isDark={isDark} mouseNx={mouse.nx} mouseNy={mouse.ny}>
              <div className='flex flex-col md:flex-row items-center gap-10'>
                <div className='flex-1'>
                  <p className='text-xs uppercase tracking-[0.3em] mb-4' style={{ color: '#D97706', fontFamily: "'JetBrains Mono', monospace" }}>{language === 'fr' ? 'Apercu en direct' : 'Live Preview'}</p>
                  <h2 className='text-2xl sm:text-3xl font-bold mb-4' style={{ fontFamily: "'Space Grotesk', sans-serif", color: txtColor }}>{language === 'fr' ? 'Visualisez votre site avant de le publier' : 'Visualize your site before publishing'}</h2>
                  <p className='text-sm leading-relaxed mb-6' style={{ color: subColor }}>{language === 'fr' ? 'Apercu en temps reel dans le chat.' : 'Real-time preview right in the chat.'}</p>
                  <div className='flex flex-wrap gap-3'>{['HTML/CSS', 'Responsive', 'SEO', 'Securise', 'Rapide'].map(tag => <span key={tag} className='px-3 py-1.5 rounded-full text-xs font-medium' style={{ border: '1px solid ' + (isDark ? 'rgba(245,158,11,0.3)' : 'rgba(217,119,6,0.25)'), color: '#D97706', background: 'rgba(245,158,11,0.05)' }}>{tag}</span>)}</div>
                </div>
                <div className='flex-1 w-full'>
                  <div className='rounded-xl overflow-hidden' style={{ border: '1px solid ' + (isDark ? 'rgba(61,36,18,0.6)' : 'rgba(231,224,216,0.8)'), background: isDark ? '#1A0F06' : '#FFF' }}>
                    <div className='flex items-center gap-2 px-4 py-2.5' style={{ background: isDark ? 'rgba(26,15,6,0.8)' : '#F5F0EB' }}>
                      <div className='flex gap-1.5'><div className='w-2.5 h-2.5 rounded-full bg-red-400' /><div className='w-2.5 h-2.5 rounded-full bg-yellow-400' /><div className='w-2.5 h-2.5 rounded-full bg-green-400' /></div>
                      <div className='flex-1 flex justify-center'><div className='px-4 py-0.5 rounded-md text-[10px]' style={{ fontFamily: "'JetBrains Mono', monospace", color: isDark ? 'rgba(245,230,208,0.4)' : 'rgba(26,26,26,0.4)' }}>votre-site.sacha.ai</div></div>
                    </div>
                    <div className='p-5 space-y-3' style={{ background: isDark ? '#150D06' : '#FFFBF5' }}>
                      <div className='h-3 w-24 rounded' style={{ background: isDark ? '#2C1808' : '#F5F0EB' }} />
                      <div className='h-8 w-40 rounded-lg' style={{ background: 'linear-gradient(90deg,rgba(245,158,11,0.15),rgba(217,119,6,0.15))' }} />
                      <div className='h-2 w-full rounded' style={{ background: isDark ? '#2C1808' : '#F5F0EB' }} />
                      <div className='h-2 w-3/4 rounded' style={{ background: isDark ? '#2C1808' : '#F5F0EB' }} />
                    </div>
                  </div>
                </div>
              </div>
            </DepthCard>
          </div>
        </ScrollSection>
      </section>

      <section className='relative z-10 py-24 px-6'>
        <ScrollSection><div className='max-w-3xl mx-auto text-center'><DepthCard isDark={isDark} mouseNx={mouse.nx} mouseNy={mouse.ny}><div className='py-4'><div className='inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6' style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(217,119,6,0.1))', boxShadow: '0 0 40px rgba(245,158,11,0.15)' }}><Layers className='w-8 h-8' style={{ color: '#F59E0B' }} /></div><h2 className='text-3xl sm:text-4xl font-bold mb-4' style={{ fontFamily: "'Space Grotesk', sans-serif", color: txtColor }}>{language === 'fr' ? 'Pret a creer votre site ?' : 'Ready to build your site?'}</h2><p className='text-base mb-8 max-w-lg mx-auto' style={{ color: subColor }}>{language === 'fr' ? "Rejoignez des dizaines d'utilisateurs." : 'Join dozens of users.'}</p><motion.button whileHover={{ scale: 1.04, boxShadow: '0 0 30px rgba(245,158,11,0.4)' }} whileTap={{ scale: 0.96 }} onClick={() => setScreen('auth')} className='inline-flex items-center gap-2 px-10 py-4 text-base font-semibold text-white bg-gradient-to-r from-[#F59E0B] via-[#E8930A] to-[#D97706] rounded-2xl warm-hover' style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t('landing.cta', language)}<ChevronRight className='w-5 h-5' /></motion.button></div></DepthCard></div></ScrollSection>
      </section>

      <footer className='relative z-10 py-10 text-center' style={{ borderTop: '1px solid ' + (isDark ? 'rgba(61,36,18,0.4)' : 'rgba(217,119,6,0.1)') }}>
        <p className='text-xs' style={{ color: subColor, fontFamily: "'Space Grotesk', sans-serif" }}>{new Date().getFullYear()} SACHA</p>
      </footer>

      <header className='fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4' style={{ background: isDark ? 'rgba(13,8,4,0.75)' : 'rgba(255,251,245,0.75)', backdropFilter: 'blur(16px)', borderBottom: '1px solid ' + (isDark ? 'rgba(61,36,18,0.3)' : 'rgba(217,119,6,0.1)') }}>
        <div className='flex items-center gap-2'><div className='w-8 h-8 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center'><span className='text-white font-bold text-sm' style={{ fontFamily: "'Space Grotesk', sans-serif" }}>S</span></div><span className='font-bold text-lg' style={{ fontFamily: "'Space Grotesk', sans-serif", color: txtColor }}>Sacha</span></div>
        <div className='flex items-center gap-3'><LanguageToggle /><ThemeToggle />
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setScreen('auth')} className='px-5 py-2.5 text-sm font-medium border rounded-xl' style={{ borderColor: isDark ? 'rgba(255,248,240,0.2)' : 'rgba(0,0,0,0.12)', backgroundColor: isDark ? 'rgba(13,8,4,0.5)' : 'rgba(255,255,255,0.6)', color: txtColor }}>{t('landing.login', language)}</motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setScreen('auth')} className='px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-xl warm-hover' style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t('landing.signup', language)}</motion.button>
        </div>
      </header>
    </div>
  );
}
