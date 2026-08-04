'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, MessageSquare, Globe, Rocket, Settings,
  LogOut, ChevronLeft, ChevronRight, Clock, Trash2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useChatStore } from '@/store/useChatStore';
import { t } from '@/lib/i18n';
import ThemeToggle from '@/components/common/ThemeToggle';
import LanguageToggle from '@/components/common/LanguageToggle';
import { useTheme } from 'next-themes';

function DashboardBackground({ isDark }: { isDark: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {isDark ? (
        <>
          <div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{ top: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)', filter: 'blur(100px)' }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{ top: '50%', right: '-10%', background: 'radial-gradient(circle, rgba(217,119,6,0.06) 0%, transparent 70%)', filter: 'blur(90px)' }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{ bottom: '-10%', left: '30%', background: 'radial-gradient(circle, rgba(180,83,9,0.05) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{ top: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(252,211,77,0.35) 0%, transparent 70%)', filter: 'blur(100px)' }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{ top: '40%', right: '-10%', background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)', filter: 'blur(100px)' }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{ bottom: '-15%', left: '25%', background: 'radial-gradient(circle, rgba(217,119,6,0.20) 0%, transparent 70%)', filter: 'blur(90px)' }}
          />
          <div
            className="absolute w-[350px] h-[350px] rounded-full"
            style={{ top: '20%', left: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.20) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
          <div
            className="absolute w-[300px] h-[300px] rounded-full"
            style={{ top: '60%', left: '10%', background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)', filter: 'blur(70px)' }}
          />
        </>
      )}
    </div>
  );
}

export default function DashboardScreen() {
  const {
    setScreen, setAuthenticated, setUser,
    sidebarOpen, setSidebarOpen, language, setCurrentProjectId,
  } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = mounted ? resolvedTheme === 'dark' : false;

  useEffect(() => { setMounted(true); }, []);
  const { conversations, activeConversationId, createConversation, deleteConversation } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  const openChat = (convId?: string) => {
    if (!convId) {
      const id = createConversation();
      setCurrentProjectId(id);
    } else {
      setCurrentProjectId(convId);
    }
    setScreen('chat');
  };

  const timeAgo = (date: Date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return language === 'fr' ? 'à l\'instant' : 'just now';
    if (mins < 60) return language === 'fr' ? `il y a ${mins}m` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return language === 'fr' ? `il y a ${hrs}h` : `${hrs}h ago`;
    return language === 'fr' ? `il y a ${Math.floor(hrs / 24)}j` : `${Math.floor(hrs / 24)}d ago`;
  };

  const stats = [
    { label: t('dash.sitesGenerated', language), value: conversations.filter((c) => c.preview).length, color: '#F59E0B', icon: Globe },
    { label: t('dash.activeDeploys', language), value: conversations.filter((c) => c.deployedUrl).length, color: '#D97706', icon: Rocket },
    { label: t('dash.totalConversations', language), value: conversations.length, color: '#B45309', icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 280 : 60 }}
        className="relative flex flex-col h-full border-r border-border overflow-hidden shrink-0 bg-sidebar"
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold text-lg overflow-hidden whitespace-nowrap text-foreground"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Sacha
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="p-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openChat()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#F59E0B] to-[#D97706] warm-hover"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Plus className="w-4 h-4" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden whitespace-nowrap">
                  {t('dash.newProject', language)}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-3 mb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('dash.search', language)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-xs outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/40 text-foreground"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {sidebarOpen && (
            <p className="px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {t('dash.recentProjects', language)}
            </p>
          )}
          {filteredConversations.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-foreground/40 text-center">{t('dash.noProjects', language)}</p>
          )}
          {filteredConversations.map((conv, i) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`group relative flex items-center rounded-lg transition-colors ${conv.id === activeConversationId ? 'bg-secondary' : 'hover:bg-muted'}`}
            >
              <button onClick={() => openChat(conv.id)} className={`flex-1 text-left px-3 py-2.5 ${!sidebarOpen ? 'flex justify-center' : ''}`}>
                <div className={`flex items-center gap-2 ${!sidebarOpen ? '' : ''}`}>
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{conv.title}</p>
                      <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(conv.createdAt)}
                      </p>
                    </div>
                  )}
                </div>
              </button>
              {sidebarOpen && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 text-muted-foreground/30 transition-all"
                  title={t('dash.delete', language)}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          ))}
        </div>

        <div className="border-t border-border p-3 space-y-2">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center text-xs font-bold text-white shrink-0">
              {useAppStore.getState().user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs font-medium text-foreground truncate">{useAppStore.getState().user?.name || 'User'}</p>
                  <p className="text-[10px] text-muted-foreground/50 truncate">{useAppStore.getState().user?.email || ''}</p>
                </div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground/50">
              <Settings className="w-3.5 h-3.5" />
              {sidebarOpen && <span className="text-[10px]">{t('dash.settings', language)}</span>}
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground/50"
              onClick={() => { setAuthenticated(false); setUser(null); }}
            >
              <LogOut className="w-3.5 h-3.5" />
              {sidebarOpen && <span className="text-[10px]">{t('dash.logout', language)}</span>}
            </motion.button>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center z-20 hover:bg-muted"
        >
          {sidebarOpen ? <ChevronLeft className="w-3 h-3 text-muted-foreground/50" /> : <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
        </button>
      </motion.aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <DashboardBackground isDark={isDark} />
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {language === 'fr' ? 'Tableau de bord' : 'Dashboard'}
          </h1>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="p-5 rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: s.color }}>{s.value}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary">
                  <s.icon className="w-5 h-5 text-[#D97706]" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => openChat()}
          className="w-full p-6 rounded-xl border border-border bg-card hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B]/20 to-[#D97706]/20 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t('dash.openChat', language)}</h3>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {language === 'fr' ? 'Décrivez votre site et laissez l\'IA le construire' : 'Describe your site and let AI build it'}
            </p>
          </div>
        </motion.button>
      </main>
    </div>
  );
}