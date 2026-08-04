'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Chrome, Github, Gitlab, ArrowLeft, Shield, Zap, Palette, Globe, Rocket } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { t } from '@/lib/i18n';
import ThemeToggle from '@/components/common/ThemeToggle';
import LanguageToggle from '@/components/common/LanguageToggle';
import { useTheme } from 'next-themes';
import { useMousePosition } from '@/hooks/useMousePosition';
const FLOATING_TAGS = [
  { icon: Shield, label: 'Securise', x: -160, y: -120 },
  { icon: Zap, label: 'Rapide', x: 145, y: -140 },
  { icon: Palette, label: 'Design', x: -145, y: 100 },
  { icon: Globe, label: 'Deploy', x: 160, y: 80 },
  { icon: Rocket, label: 'IA', x: 0, y: -170 },
];

export default function AuthScreen() {
  const { setAuthenticated, setUser, language, setScreen } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted ? resolvedTheme === 'dark' : false;
  const mouse = useMousePosition();

  useEffect(() => { setMounted(true); }, []);

  const getErrors = useCallback(() => {
    const e: Record<string, string> = {};
    if (!email.includes('@')) e.email = t('auth.invalidEmail', language);
    if (password.length < 8) e.password = t('auth.passwordMin', language);
    if (!isLogin && password !== confirmPassword) e.confirmPassword = t('auth.passwordMatch', language);
    if (!isLogin && !fullName.trim()) e.fullName = t('auth.required', language);
    return e;
  }, [email, password, confirmPassword, fullName, isLogin, language]);

  const anyTouched = touched.email || touched.password || touched.confirmPassword || touched.fullName;
  const computedErrors = anyTouched ? getErrors() : errors;

  const handleBlur = (field: string) => {
    setTouched((s) => ({ ...s, [field]: true }));
    setErrors(getErrors());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true, confirmPassword: true, fullName: true });
    setErrors(getErrors());
    if (Object.keys(getErrors()).length > 0) return;
    setUser({ name: isLogin ? email.split('@')[0] : fullName, email });
    setAuthenticated(true);
  };

  const inputCls = (field: string) =>
    'w-full px-4 py-3 rounded-xl bg-card border text-sm outline-none placeholder:text-muted-foreground/50 transition-colors text-card-foreground ' +
    (touched[field] && computedErrors[field]
      ? 'border-red-400'
      : touched[field] && !computedErrors[field]
      ? 'border-emerald-500'
      : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20');

  return (
    <div className='relative min-h-screen flex items-center justify-end p-4 pr-[42%] md:pr-[44%] overflow-hidden'>
      {/* Cursor glow */}
      <div className='fixed pointer-events-none z-[9999]' style={{ left: mouse.x - 150, top: mouse.y - 150, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)', filter: 'blur(20px)', transition: 'left 0.08s ease-out, top 0.08s ease-out' }} />
      <div className='fixed pointer-events-none z-[9998]' style={{ left: mouse.x - 3, top: mouse.y - 3, width: 6, height: 6, borderRadius: '50%', background: 'rgba(245,158,11,0.3)', boxShadow: '0 0 10px rgba(245,158,11,0.3)', transition: 'left 0.05s linear, top 0.05s linear' }} />

      {/* Warm gradient background */}
      <div className='absolute inset-0 pointer-events-none'>
        <div className='absolute w-[600px] h-[600px] rounded-full transition-transform duration-[2000ms] ease-out' style={{ top: '-20%', left: '-10%', transform: 'translate(' + (mouse.nx * 25) + 'px,' + (mouse.ny * 15) + 'px)', background: 'radial-gradient(circle,' + (isDark ? 'rgba(245,158,11,0.08)' : 'rgba(252,211,77,0.35)') + ' 0%,transparent 65%)', filter: 'blur(90px)' }} />
        <div className='absolute w-[500px] h-[500px] rounded-full transition-transform duration-[2500ms] ease-out' style={{ top: '40%', right: '-15%', transform: 'translate(' + (mouse.nx * -20) + 'px,' + (mouse.ny * 20) + 'px)', background: 'radial-gradient(circle,' + (isDark ? 'rgba(217,119,6,0.06)' : 'rgba(245,158,11,0.25)') + ' 0%,transparent 65%)', filter: 'blur(100px)' }} />
        <div className='absolute w-[400px] h-[400px] rounded-full transition-transform duration-[3000ms] ease-out' style={{ bottom: '-15%', left: '25%', transform: 'translate(' + (mouse.nx * 15) + 'px,' + (mouse.ny * -20) + 'px)', background: 'radial-gradient(circle,' + (isDark ? 'rgba(180,83,9,0.05)' : 'rgba(217,119,6,0.20)') + ' 0%,transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      {/* Avatar + Floating tags (bottom right) */}
      <ShyAvatarWithTags isDark={isDark} mouseNx={mouse.nx} mouseNy={mouse.ny} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className='w-full max-w-md relative z-10'
      >
        <div className='bg-card rounded-2xl border border-border p-8' style={{ backdropFilter: 'blur(20px)', transform: 'perspective(800px) rotateY(' + (mouse.nx * 2) + 'deg) rotateX(' + (mouse.ny * -1.5) + 'deg)', transition: 'transform 0.4s ease-out' }}>
          <button
            onClick={() => setScreen('landing')}
            className='flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors'
          >
            <ArrowLeft className='w-4 h-4' />
            {t('auth.back', language)}
          </button>

          <div className='relative flex mb-8 rounded-xl bg-muted p-1 border border-border'>
            <motion.div
              className='absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#D97706]'
              style={{ width: 'calc(50% - 4px)' }}
              animate={{ x: isLogin ? 4 : 'calc(100% + 0px)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            <button onClick={() => setIsLogin(true)} className={'relative z-10 flex-1 py-2 text-sm font-medium rounded-lg transition-colors ' + (isLogin ? 'text-white' : 'text-muted-foreground')} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t('auth.login', language)}</button>
            <button onClick={() => setIsLogin(false)} className={'relative z-10 flex-1 py-2 text-sm font-medium rounded-lg transition-colors ' + (!isLogin ? 'text-white' : 'text-muted-foreground')} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t('auth.signup', language)}</button>
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <AnimatePresence mode='wait'>
              {!isLogin && (
                <motion.div key='name' initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className='relative'>
                    <User className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40' />
                    <input type='text' value={fullName} onChange={(e) => setFullName(e.target.value)} onBlur={() => handleBlur('fullName')} placeholder={t('auth.fullName', language)} className={inputCls('fullName') + ' pl-10'} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className='relative'>
              <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40' />
              <input type='email' value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => handleBlur('email')} placeholder={t('auth.email', language)} className={inputCls('email') + ' pl-10'} />
            </div>
            <div className='relative'>
              <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40' />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => handleBlur('password')} placeholder={t('auth.password', language)} className={inputCls('password') + ' pl-10 pr-10'} />
              <button type='button' onClick={() => setShowPassword(!showPassword)} className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground'>
                {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
              </button>
            </div>
            <AnimatePresence mode='wait'>
              {!isLogin && (
                <motion.div key='confirm' initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className='relative'>
                    <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40' />
                    <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onBlur={() => handleBlur('confirmPassword')} placeholder={t('auth.confirmPassword', language)} className={inputCls('confirmPassword') + ' pl-10 pr-10'} />
                    <button type='button' onClick={() => setShowConfirm(!showConfirm)} className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground'>
                      {showConfirm ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button type='submit' whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className='w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#F59E0B] to-[#D97706] warm-hover' style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{isLogin ? t('auth.loginButton', language) : t('auth.signupButton', language)}</motion.button>
          </form>

          <div className='mt-6'>
            <div className='relative flex items-center mb-4'><div className='flex-1 h-px bg-border' /><span className='px-3 text-xs text-muted-foreground/60'>{t('auth.orContinueWith', language)}</span><div className='flex-1 h-px bg-border' /></div>
            <div className='grid grid-cols-3 gap-3'>
              {[{ icon: Chrome, label: t('auth.google', language), color: '#EA4335' }, { icon: Github, label: t('auth.github', language), color: '#FFF8F0' }, { icon: Gitlab, label: t('auth.gitlab', language), color: '#FC6D26' }].map((p) => (
                <motion.button key={p.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { setUser({ name: p.label + ' User', email: 'user@example.com' }); setAuthenticated(true); }} className='flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors'>
                  <p.icon className='w-4 h-4' style={{ color: p.color }} />
                  <span className='text-xs text-muted-foreground hidden sm:inline'>{p.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
          <p className='text-center mt-6 text-xs text-muted-foreground/60'>
            {isLogin ? t('auth.noAccount', language) : t('auth.hasAccount', language)}{' '}
            <button onClick={() => { setIsLogin(!isLogin); setErrors({}); setTouched({}); }} className='text-[#D97706] hover:underline'>{isLogin ? t('auth.signup', language) : t('auth.login', language)}</button>
          </p>
        </div>
        <div className='flex justify-center mt-4 gap-2'><LanguageToggle /><ThemeToggle /></div>
      </motion.div>
    </div>
  );
}

/* ───────── Shy Avatar with floating tags — avoids cursor ───────── */
function ShyAvatarWithTags({ isDark, mouseNx, mouseNy }: { isDark: boolean; mouseNx: number; mouseNy: number }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 + posRef.current.x;
      const cy = rect.top + rect.height / 2 + posRef.current.y;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = 260;
      if (dist < threshold) {
        const strength = (1 - dist / threshold) * 60;
        targetRef.current.x = -(dx / (dist || 1)) * strength;
        targetRef.current.y = -(dy / (dist || 1)) * strength;
      } else {
        targetRef.current.x *= 0.92;
        targetRef.current.y *= 0.92;
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    const tick = () => {
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.08;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.08;
      if (containerRef.current) {
        containerRef.current.style.transform =
          'translate(' + posRef.current.x + 'px,' + posRef.current.y + 'px)';
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const halfSize = 240; // half of ~480px avatar

  return (
    <div
      ref={containerRef}
      className='absolute pointer-events-none hidden md:flex flex-col items-center justify-center'
      style={{ right: '2%', bottom: '2%', transform: 'none' }}
    >
      <div className='relative' style={{ width: 480, height: 480 }}>
        {/* Avatar image */}
        <img
          ref={imgRef}
          src='/avatar.png'
          alt='SACHA'
          className='w-full h-full object-contain'
          style={{ filter: 'drop-shadow(0 0 50px rgba(245,158,11,0.4))' }}
        />
        {/* Glow behind avatar */}
        <div className='absolute inset-0 -z-10' style={{ borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 60%)', filter: 'blur(50px)', transform: 'scale(1.8)' }} />
        {/* Floating tags around avatar */}
        {FLOATING_TAGS.map((tag, i) => (
          <motion.div
            key={tag.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
            className='absolute flex items-center gap-2 px-4 py-2.5 rounded-full pointer-events-auto'
            style={{
              left: halfSize + tag.x + mouseNx * (8 + i * 2),
              top: halfSize + tag.y + mouseNy * (6 + i * 2),
              border: '1px solid ' + (isDark ? 'rgba(245,158,11,0.25)' : 'rgba(217,119,6,0.2)'),
              background: isDark ? 'rgba(26,15,6,0.7)' : 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(12px)',
              transition: 'left 0.4s ease-out, top 0.4s ease-out',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <tag.icon className='w-4 h-4' style={{ color: '#D97706' }} />
            <span className='text-xs font-semibold' style={{ color: isDark ? '#F5E6D0' : '#1A1A1A', fontFamily: "'Space Grotesk', sans-serif" }}>{tag.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
