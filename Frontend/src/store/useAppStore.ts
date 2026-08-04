import { create } from 'zustand';

export type Screen = 'landing' | 'auth' | 'dashboard' | 'chat';
export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
export type Language = 'fr' | 'en';

interface AppState {
  screen: Screen;
  setScreen: (s: Screen) => void;
  isAuthenticated: boolean;
  setAuthenticated: (v: boolean) => void;
  user: { name: string; email: string; avatar?: string } | null;
  setUser: (u: AppState['user']) => void;
  orbState: OrbState;
  setOrbState: (s: OrbState) => void;
  isVoiceMode: boolean;
  setVoiceMode: (v: boolean) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'landing',
  setScreen: (s) => set({ screen: s }),
  isAuthenticated: false,
  setAuthenticated: (v) => set({ isAuthenticated: v, screen: v ? 'dashboard' : 'landing' }),
  user: null,
  setUser: (u) => set({ user: u }),
  orbState: 'idle',
  setOrbState: (s) => set({ orbState: s }),
  isVoiceMode: false,
  setVoiceMode: (v) => set({ isVoiceMode: v }),
  language: 'fr',
  setLanguage: (l) => set({ language: l }),
  sidebarOpen: true,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  currentProjectId: null,
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
}));
