'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { t } from '@/lib/i18n';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { language } = useAppStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background/80 backdrop-blur-sm">
        <div className="w-3.5 h-3.5" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background/80 backdrop-blur-sm text-foreground/50 hover:text-foreground/80 transition-colors"
      title={isDark ? t('theme.light', language) : t('theme.dark', language)}
    >
      {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline text-[10px]">{isDark ? t('theme.light', language) : t('theme.dark', language)}</span>
    </motion.button>
  );
}
