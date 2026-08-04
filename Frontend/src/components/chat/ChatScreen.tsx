'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mic, MicOff, Plus,
  ChevronLeft, ChevronRight, X, MessageSquare, RefreshCw,
  Palette, Rocket, Globe, Loader2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useChatStore } from '@/store/useChatStore';
import { t } from '@/lib/i18n';
import ThemeToggle from '@/components/common/ThemeToggle';
import LanguageToggle from '@/components/common/LanguageToggle';
import PreviewPanel from '@/components/preview/PreviewPanel';
import {
  getSpeechRecognition, startAudioAnalysis,
  getAudioLevel, stopAudioAnalysis, stopSpeechRecognition,
} from '@/lib/speech';
import dynamic from 'next/dynamic';

const AIOrb = dynamic(() => import('@/components/orb/AIOrb'), { ssr: false });

const SUGGESTIONS = ['chat.suggestion1','chat.suggestion2','chat.suggestion3','chat.suggestion4','chat.suggestion5','chat.suggestion6',];

const ART_QUESTIONS = [
  { key: 'art.style', options: ['art.minimal','art.bold','art.elegant','art.playful','art.corporate'] },
  { key: 'art.colorPalette', options: ['art.warm','art.cool','art.vibrant','art.muted','art.neutral'] },
  { key: 'art.typography', options: ['art.modern','art.classic','art.handwritten','art.mono'] },
  { key: 'art.layout', options: ['art.hero','art.split','art.centered','art.asymmetric'] },
  { key: 'art.mood', options: ['art.dark','art.light','art.warm','art.cool'] },
];

const AI_RESPONSES = [
  'Je vais créer un site vitrine moderne avec une section héro, des services, une galerie et un formulaire de contact. Le site est sécurisé (CSP headers, pas de données sensibles en clair) et optimisé pour le SEO.',
  'Parfait ! Je conçois un site élégant avec navigation fluide, portfolio interactif et section témoignages. Tout est responsive et sécurisé.',
  'Excellent choix ! Je génère une landing page optimisée pour la conversion avec CTA puissant et section features, le tout avec les meilleures pratiques de sécurité.',
];

export default function ChatScreen() {
  const {
    orbState, setOrbState, isVoiceMode, setVoiceMode,
    language, setScreen, sidebarOpen, setSidebarOpen,
  } = useAppStore();
  const {
    activeConversationId, addMessage, getActiveConversation,
    setConversationTitle, setConversationPreview, createConversation,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [artStep, setArtStep] = useState(-1);
  const [artAnswers, setArtAnswers] = useState<Record<string, string>>({});
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [showArtQuestions, setShowArtQuestions] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conv = getActiveConversation();
  const messages = conv?.messages || [];
  const isConversationEmpty = messages.length === 0;

  // Rotating suggestions
  useEffect(() => {
    if (!isConversationEmpty || input.trim()) return;
    const timer = setInterval(() => {
      setSuggestionIdx((i) => (i + 1) % SUGGESTIONS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isConversationEmpty, input.trim()]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, artStep]);

  const simulateAIResponse = useCallback((userMsg: string, convId: string) => {
    setOrbState('thinking');
    const title = userMsg.slice(0, 50) + (userMsg.length > 50 ? '...' : '');
    setConversationTitle(convId, title);

    setTimeout(() => {
      const response = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
      addMessage(convId, { role: 'assistant', content: '', isStreaming: true });
      setOrbState('speaking');
      let charIndex = 0;
      const streamInterval = setInterval(() => {
        charIndex += 3;
        if (charIndex >= response.length) {
          clearInterval(streamInterval);
          useChatStore.getState().updateLastAssistantMessage(convId, response);
          setOrbState('idle');
          setTimeout(() => {
            setConversationPreview(convId, 'generated');
            setShowPreview(true);
          }, 1000);
        } else {
          useChatStore.getState().updateLastAssistantMessage(convId, response.slice(0, charIndex) + '▌');
        }
      }, 30);
    }, 1500);
  }, [addMessage, setConversationTitle, setOrbState, setConversationPreview]);

  const sendMessage = useCallback((overrideInput?: string) => {
    const text = overrideInput || input.trim();
    if (!text) return;
    let convId = activeConversationId;
    if (!convId) convId = createConversation();
    addMessage(convId, { role: 'user', content: text, images: uploadedImages.length > 0 ? [...uploadedImages] : undefined });
    setInput('');
    setUploadedImages([]);
    setShowArtQuestions(true);
    setArtStep(0);
  }, [input, activeConversationId, createConversation, addMessage, uploadedImages]);

  const handleArtAnswer = (value: string) => {
    const currentQ = ART_QUESTIONS[artStep];
    setArtAnswers((prev) => ({ ...prev, [currentQ.key]: value }));
    if (artStep < ART_QUESTIONS.length - 1) {
      setArtStep(artStep + 1);
    } else {
      setShowArtQuestions(false);
      const artDesc = Object.entries({ ...artAnswers, [currentQ.key]: value })
        .map(([k, v]) => `${t(k, language)}: ${t(v, language)}`)
        .join(', ');
      const enhanced = `${input || useChatStore.getState().getActiveConversation()?.messages.findLast(m => m.role === 'user')?.content || ''}. Direction artistique : ${artDesc}. Le site doit être responsive, sécurisé (CSP, pas de données sensibles), optimisé SEO.`;
      let convId = activeConversationId;
      if (!convId) convId = createConversation();
      addMessage(convId, { role: 'user', content: enhanced });
      simulateAIResponse(enhanced, convId!);
    }
  };

  const skipArtQuestions = () => {
    setShowArtQuestions(false);
    const lastUserMsg = conv?.messages.findLast(m => m.role === 'user');
    if (lastUserMsg) {
      simulateAIResponse(lastUserMsg.content, conv!.id);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleVoice = useCallback(async () => {
    if (isListening) {
      stopSpeechRecognition(); stopAudioAnalysis();
      cancelAnimationFrame(animFrameRef.current);
      setIsListening(false); setOrbState('idle'); setVoiceMode(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert(t('chat.microNotSupported', language)); return; }
    try {
      const analyser = await startAudioAnalysis();
      if (!analyser) { alert(t('chat.microNotAllowed', language)); return; }
      analyserRef.current = analyser;
      const rec = getSpeechRecognition(
        (text, isFinal) => { if (isFinal) setInput((prev) => prev + text); },
        () => { cancelAnimationFrame(animFrameRef.current); setIsListening(false); setOrbState('idle'); setVoiceMode(false); stopAudioAnalysis(); },
        (error) => { if (error === 'not-allowed') alert(t('chat.microNotAllowed', language)); },
        language === 'fr' ? 'fr-FR' : 'en-US'
      );
      if (!rec) { alert(t('chat.microNotSupported', language)); stopAudioAnalysis(); return; }
      rec.start(); setIsListening(true); setVoiceMode(true); setOrbState('listening');
      const updateAudio = () => {
        if (analyserRef.current) {
          setAudioLevel(getAudioLevel(analyserRef.current));
          animFrameRef.current = requestAnimationFrame(updateAudio);
        }
      };
      updateAudio();
    } catch { alert(t('chat.microNotAllowed', language)); }
  }, [isListening, language, setOrbState, setVoiceMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 52 }}
        className="flex flex-col h-full border-r border-border bg-sidebar shrink-0 overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 h-14 border-b border-border">
          <button onClick={() => setScreen('dashboard')} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground/60" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-[10px]">S</span>
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="font-bold text-sm text-foreground overflow-hidden whitespace-nowrap"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Sacha
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {useChatStore.getState().conversations.slice(0, 15).map((c) => (
            <button
              key={c.id}
              onClick={() => useAppStore.getState().setCurrentProjectId(c.id)}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors truncate ${
                c.id === activeConversationId ? 'bg-secondary text-[#D97706]' : 'text-muted-foreground/60 hover:bg-muted'
              }`}
            >
              {sidebarOpen ? c.title : ''}
            </button>
          ))}
        </div>

        <div className="p-2 border-t border-border">
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </motion.aside>

      {/* Main chat */}
      <div className="flex-1 flex flex-col relative">
        {/* Voice mode overlay */}
        <AnimatePresence>
          {isVoiceMode && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
            >
              <button onClick={() => { setVoiceMode(false); if (isListening) toggleVoice(); }} className="absolute top-4 right-4 p-2 rounded-full border border-border hover:bg-muted transition-colors z-40">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <AIOrb orbState={isListening ? 'listening' : orbState} audioLevel={audioLevel} size={300} showLabel={true} />
              <p className="mt-4 text-sm text-muted-foreground">{isListening ? (language === 'fr' ? 'Parlez maintenant...' : 'Speak now...') : (language === 'fr' ? 'Appuyez sur le micro' : 'Press mic')}</p>
              {input && <p className="mt-2 text-sm text-[#D97706]">{input}</p>}
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={toggleVoice}
                className={`mt-6 p-4 rounded-full ${isListening ? 'bg-red-500/10 text-red-500' : 'bg-secondary text-[#D97706]'}`}
              >
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-muted">
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
              </button>
            )}
            <h2 className="text-sm font-medium text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {conv?.title || (language === 'fr' ? 'Nouveau projet' : 'New project')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {conv?.preview && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${showPreview ? 'bg-secondary text-[#D97706]' : 'text-muted-foreground/60 hover:bg-muted'}`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('preview.title', language)}</span>
              </motion.button>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Messages + Art Questions */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {isConversationEmpty && !showArtQuestions && (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-[#F59E0B]" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {language === 'fr' ? 'Créez votre site vitrine' : 'Create your showcase website'}
                  </h3>
                </div>
              )}

              <div className="space-y-4 pb-4">
                {messages.map((msg, i) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-secondary border border-primary/20 text-foreground rounded-br-md'
                        : 'bg-card border border-border text-foreground/80 rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                <div ref={chatEndRef} />
              </div>

              {/* Inline art questions */}
                <AnimatePresence>
                  {showArtQuestions && artStep >= 0 && artStep < ART_QUESTIONS.length && (
                    <motion.div
                      key={`art-${artStep}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="bg-card border border-border rounded-2xl p-5"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Palette className="w-4 h-4 text-[#D97706]" />
                        <p className="text-sm font-medium text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {t(ART_QUESTIONS[artStep].key, language)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ART_QUESTIONS[artStep].options.map((opt) => (
                          <motion.button
                            key={opt}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleArtAnswer(opt)}
                            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                              artAnswers[ART_QUESTIONS[artStep].key] === opt
                                ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white'
                                : 'border border-border text-muted-foreground hover:border-primary hover:text-[#D97706]'
                            }`}
                          >
                            {t(opt, language)}
                          </motion.button>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button onClick={skipArtQuestions} className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                          {t('chat.skipArt', language)}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              {/* Rotating suggestion in chat bar */}
              {isConversationEmpty && !input.trim() && !showArtQuestions && (
                <div className="pb-3 flex justify-center">
                  <motion.button
                    key={suggestionIdx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setInput(t(SUGGESTIONS[suggestionIdx], language))}
                    className="px-5 py-2 rounded-full border border-border text-xs text-muted-foreground/60 hover:border-primary hover:text-[#D97706] transition-colors"
                  >
                    {t(SUGGESTIONS[suggestionIdx], language)}
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Preview panel */}
          <AnimatePresence>
            {showPreview && conv?.preview && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '50%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-l border-border shrink-0"
              >
                <PreviewPanel conversationId={conv.id} onClose={() => setShowPreview(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border p-4">
          {uploadedImages.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto">
              {uploadedImages.map((img, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg border border-border overflow-hidden shrink-0">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setUploadedImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 text-white flex items-center justify-center text-[10px]"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.placeholder', language)}
                rows={1}
                className="w-full px-4 py-3 pr-24 rounded-xl bg-card border border-border text-sm outline-none resize-none max-h-32 overflow-y-auto focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40 text-foreground"
                style={{ minHeight: '48px' }}
              />
              {/* Image upload + Mic buttons */}
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-[#D97706] hover:bg-secondary transition-colors"
                  title="Ajouter une image"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleVoice}
                  className={`p-1.5 rounded-lg transition-all ${
                    isListening
                      ? 'bg-red-500/10 text-red-500'
                      : 'text-muted-foreground/40 hover:text-[#D97706] hover:bg-secondary'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              className="p-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white disabled:opacity-30 disabled:cursor-not-allowed warm-hover"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}