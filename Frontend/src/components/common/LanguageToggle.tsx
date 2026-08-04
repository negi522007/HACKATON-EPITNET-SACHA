'use client';

import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
    const { language, setLanguage } = useAppStore();
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background/80 backdrop-blur-sm text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted transition-colors"
        >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase text-[10px]">{language}</span>
        </motion.button>
    );
}