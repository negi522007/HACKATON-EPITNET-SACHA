'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, MessageSquare, Rocket, Globe, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useChatStore } from '@/store/useChatStore';
import { t } from '@/lib/i18n';

const DEPLOY_STEPS = [
  { key: 'stepBuild', icon: null },
  { key: 'stepContainer', icon: null },
  { key: 'stepProvision', icon: null },
  { key: 'stepDns', icon: null },
  { key: 'stepLive', icon: null },
];

export default function PreviewPanel({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const { language, setOrbState } = useAppStore();
  const { setConversationDeployedUrl } = useChatStore();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(-1);
  const [isDeployed, setIsDeployed] = useState(false);

  const startDeploy = () => {
    setIsDeploying(true);
    setDeployStep(0);
    setOrbState('thinking');
    const intervals = [1000, 1500, 2000, 1500, 1000];
    let step = 0;
    const advance = () => {
      step++;
      if (step < DEPLOY_STEPS.length) {
        setTimeout(() => { setDeployStep(step); advance(); }, intervals[step]);
      } else {
        setTimeout(() => {
          setIsDeployed(true); setIsDeploying(false); setOrbState('idle');
          setConversationDeployedUrl(conversationId, 'https://my-site.sacha.ai');
        }, 800);
      }
    };
    setTimeout(() => advance(), intervals[0]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <h3 className="text-xs font-medium text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t('preview.title', language)}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4 text-muted-foreground/60" /></button>
      </div>

      <div className="flex-1 p-3">
        <div className="w-full h-full rounded-xl overflow-hidden border border-border">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted border-b border-border">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="px-3 py-0.5 rounded-md bg-card border border-border text-[10px] text-muted-foreground/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {isDeployed ? 'https://my-site.sacha.ai' : 'localhost:3000'}
              </div>
            </div>
          </div>
          {/* Simulated site */}
          <div className="bg-card p-6 h-full">
            <div className="space-y-4">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-8 w-48 bg-gradient-to-r from-[#F59E0B]/20 to-[#D97706]/20 rounded-lg" />
              <div className="h-2 w-full bg-muted rounded" />
              <div className="h-2 w-3/4 bg-muted rounded" />
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-24 rounded-lg bg-muted border border-border flex items-center justify-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F59E0B]/20 to-[#D97706]/20" />
                  </div>
                ))}
              </div>
              <div className="mt-4 h-10 w-32 rounded-lg bg-gradient-to-r from-[#F59E0B]/30 to-[#D97706]/30" />
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 pb-3 space-y-3">
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:bg-muted">
            <RefreshCw className="w-3.5 h-3.5" />{t('preview.regenerate', language)}
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:bg-muted">
            <MessageSquare className="w-3.5 h-3.5" />{t('preview.edit', language)}
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={startDeploy} disabled={isDeploying || isDeployed}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-40 ${
              isDeployed ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#F59E0B] to-[#D97706]'
            }`}>
            {isDeployed ? <><Globe className="w-3.5 h-3.5" /> {t('preview.live', language)}</> : <><Rocket className="w-3.5 h-3.5" /> {t('preview.deploy', language)}</>}
          </motion.button>
        </div>

        <AnimatePresence>
          {isDeploying && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{t('preview.deploySteps', language)}</p>
              <div className="space-y-1.5">
                {DEPLOY_STEPS.map((step, i) => {
                  const isActive = i === deployStep;
                  const isDone = i < deployStep;
                  return (
                    <motion.div key={step.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className={`flex items-center gap-2 text-xs py-1 ${isActive ? 'text-[#D97706]' : isDone ? 'text-emerald-500' : 'text-muted-foreground/30'}`}>
                      <span className="w-5 text-center flex items-center justify-center">{isDone ? <Globe className="w-3 h-3" /> : isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />}</span>
                      <span>{t(`preview.${step.key}`, language)}</span>
                      {isActive && (
                        <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-muted">
                          <motion.div className="h-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full"
                            initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 1.2, ease: 'linear' }} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}