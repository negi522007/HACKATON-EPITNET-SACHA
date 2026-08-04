'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import LandingPage from '@/components/landing/LandingPage';
import AuthScreen from '@/components/auth/AuthScreen';
import DashboardScreen from '@/components/dashboard/DashboardScreen';
import ChatScreen from '@/components/chat/ChatScreen';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};
const pageTransition = { duration: 0.3, ease: 'easeOut' as const };

export default function Home() {
  const { screen } = useAppStore();

  return (
    <main className="min-h-screen bg-background text-foreground" style={{ minHeight: '100vh' }}>
      <AnimatePresence mode="wait">
        {screen === 'landing' && (
          <motion.div key="landing" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <LandingPage />
          </motion.div>
        )}
        {screen === 'auth' && (
          <motion.div key="auth" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <AuthScreen />
          </motion.div>
        )}
        {screen === 'dashboard' && (
          <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <DashboardScreen />
          </motion.div>
        )}
        {screen === 'chat' && (
          <motion.div key="chat" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <ChatScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}