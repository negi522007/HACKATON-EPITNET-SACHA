'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowOnHover?: boolean;
  borderBeam?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', glowOnHover = false, borderBeam = false, onClick }: GlassCardProps) {
  return (
    <motion.div
      whileHover={glowOnHover ? { scale: 1.01, boxShadow: '0 0 30px rgba(0,240,255,0.1), 0 0 60px rgba(168,85,247,0.05)' } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`relative glass rounded-2xl overflow-hidden ${borderBeam ? 'border-beam' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
