'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Chrome, Github, Gitlab, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { t } from '@/lib/i18n';
import ThemeToggle from '@/components/common/ThemeToggle';
import LanguageToggle from '@/components/common/LanguageToggle';

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
    `w-full px-4 py-3 rounded-xl bg-card border text-sm outline-none placeholder:text-muted-foreground/50 transition-colors text-card-foreground ${
      touched[field] && computedErrors[field]
        ? 'border-red-400'
        : touched[field] && !computedErrors[field]
        ? 'border-emerald-500'
        : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
    }`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl border border-border p-8">
          {/* Back button */}
          <button
            onClick={() => setScreen('landing')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('auth.back', language)}
          </button>

          {/* Toggle */}
          <div className="relative flex mb-8 rounded-xl bg-muted p-1 border border-border">
            <motion.div
              className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#D97706]"
              style={{ width: 'calc(50% - 4px)' }}
              animate={{ x: isLogin ? 4 : 'calc(100% + 0px)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            <button
              onClick={() => setIsLogin(true)}
              className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${isLogin ? 'text-white' : 'text-muted-foreground'}`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {t('auth.login', language)}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!isLogin ? 'text-white' : 'text-muted-foreground'}`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {t('auth.signup', language)}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} onBlur={() => handleBlur('fullName')} placeholder={t('auth.fullName', language)} className={`${inputCls('fullName')} pl-10`} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => handleBlur('email')} placeholder={t('auth.email', language)} className={`${inputCls('email')} pl-10`} />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => handleBlur('password')} placeholder={t('auth.password', language)} className={`${inputCls('password')} pl-10 pr-10`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div key="confirm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onBlur={() => handleBlur('confirmPassword')} placeholder={t('auth.confirmPassword', language)} className={`${inputCls('confirmPassword')} pl-10 pr-10`} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#F59E0B] to-[#D97706] warm-hover"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {isLogin ? t('auth.loginButton', language) : t('auth.signupButton', language)}
            </motion.button>
          </form>

          {/* OAuth */}
          <div className="mt-6">
            <div className="relative flex items-center mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="px-3 text-xs text-muted-foreground/60">{t('auth.orContinueWith', language)}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Chrome, label: t('auth.google', language), color: '#EA4335' },
                { icon: Github, label: t('auth.github', language), color: '#FFF8F0' },
                { icon: Gitlab, label: t('auth.gitlab', language), color: '#FC6D26' },
              ].map((p) => (
                <motion.button
                  key={p.label}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setUser({ name: p.label + ' User', email: 'user@example.com' }); setAuthenticated(true); }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                >
                  <p.icon className="w-4 h-4" style={{ color: p.color }} />
                  <span className="text-xs text-muted-foreground hidden sm:inline">{p.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <p className="text-center mt-6 text-xs text-muted-foreground/60">
            {isLogin ? t('auth.noAccount', language) : t('auth.hasAccount', language)}{' '}
            <button onClick={() => { setIsLogin(!isLogin); setErrors({}); setTouched({}); }} className="text-[#D97706] hover:underline">
              {isLogin ? t('auth.signup', language) : t('auth.login', language)}
            </button>
          </p>
        </div>

        <div className="flex justify-center mt-4 gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </motion.div>
    </div>
  );
}