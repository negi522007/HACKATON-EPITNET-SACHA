'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { t } from '@/lib/i18n';
import ThemeToggle from '@/components/common/ThemeToggle';
import LanguageToggle from '@/components/common/LanguageToggle';
import { useTheme } from 'next-themes';

export default function LandingPage() {
  const { setScreen, language } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = mounted ? resolvedTheme === 'dark' : false;

  useEffect(() => { setMounted(true); }, []);

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: 'url(/landing-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Subtle overlay for text readability */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, rgba(15,10,4,0.35) 0%, rgba(26,16,8,0.25) 50%, rgba(15,10,4,0.45) 100%)'
            : 'linear-gradient(180deg, rgba(255,251,245,0.15) 0%, rgba(255,247,237,0.10) 50%, rgba(254,243,199,0.20) 100%)',
        }}
      />

      {/* Top bar */}
      <header className="flex items-center justify-end px-6 sm:px-10 py-5 relative z-10">
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setScreen('auth')}
            className="px-5 py-2.5 text-sm font-medium border rounded-xl backdrop-blur-sm transition-colors"
            style={{
              borderColor: isDark ? 'rgba(255,248,240,0.25)' : 'rgba(0,0,0,0.15)',
              backgroundColor: isDark ? 'rgba(15,10,4,0.55)' : 'rgba(255,255,255,0.65)',
              color: isDark ? '#FFF8F0' : '#1A1A1A',
            }}
          >
            {t('landing.login', language)}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setScreen('auth')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-xl warm-hover"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {t('landing.signup', language)}
          </motion.button>
        </div>
      </header>

      {/* Hero - SACHA centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          {/* SACHA title with gradient + black border */}
          <h1
            className="mb-8 select-none"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(3.5rem, 10vw, 9rem)',
              lineHeight: 1,
              background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 40%, #D97706 70%, #B45309 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              WebkitTextStroke: '2px #000000',
              textShadow: '0 4px 30px rgba(245,158,11,0.3)',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))',
            }}
          >
            SACHA
          </h1>

          {/* Subtitle - MUCH larger */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-12 max-w-2xl mx-auto leading-snug font-medium"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(1.5rem, 4vw, 3rem)',
              color: isDark ? '#FFF8F0' : '#1A1A1A',
              textShadow: isDark
                ? '0 2px 20px rgba(245,158,11,0.25)'
                : '0 2px 20px rgba(255,255,255,0.8)',
            }}
          >
            {t('landing.subtitle', language)}
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setScreen('auth')}
            className="flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-[#F59E0B] via-[#E8930A] to-[#D97706] rounded-2xl warm-hover"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {t('landing.cta', language)}
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer
        className="py-5 text-center text-xs relative z-10"
        style={{ color: isDark ? 'rgba(255,248,240,0.3)' : 'rgba(26,26,26,0.35)' }}
      >
        &copy; {new Date().getFullYear()} Sacha
      </footer>
    </div>
  );
}