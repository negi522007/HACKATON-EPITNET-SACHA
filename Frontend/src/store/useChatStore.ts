import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  images?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  preview?: string;
  deployedUrl?: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  createConversation: () => string;
  addMessage: (convId: string, msg: Omit<Message, 'id' | 'timestamp'>) => void;
  updateLastAssistantMessage: (convId: string, content: string) => void;
  getActiveConversation: () => Conversation | undefined;
  setConversationTitle: (convId: string, title: string) => void;
  setConversationPreview: (convId: string, preview: string) => void;
  setConversationDeployedUrl: (convId: string, url: string) => void;
  deleteConversation: (convId: string) => void;
}

let msgCounter = 0;
const uid = () => `msg-${++msgCounter}-${Date.now()}`;
let convCounter = 0;
const cid = () => `conv-${++convCounter}-${Date.now()}`;

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,

  createConversation: () => {
    const id = cid();
    const conv: Conversation = {
      id,
      title: 'Nouveau projet',
      messages: [],
      createdAt: new Date(),
    };
    set((s) => ({
      conversations: [conv, ...s.conversations],
      activeConversationId: id,
    }));
    return id;
  },

  addMessage: (convId, msg) => {
    const message: Message = { ...msg, id: uid(), timestamp: new Date() };
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, messages: [...c.messages, message] } : c
      ),
    }));
  },

  updateLastAssistantMessage: (convId, content) => {
    set((s) => ({
      conversations: s.conversations.map((c) => {
        if (c.id !== convId) return c;
        const msgs = [...c.messages];
        const lastIdx = msgs.findLastIndex((m) => m.role === 'assistant');
        if (lastIdx >= 0) {
          msgs[lastIdx] = { ...msgs[lastIdx], content };
        }
        return { ...c, messages: msgs };
      }),
    }));
  },

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find((c) => c.id === activeConversationId);
  },

  setConversationTitle: (convId, title) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, title } : c
      ),
    }));
  },

  setConversationPreview: (convId, preview) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, preview } : c
      ),
    }));
  },

  setConversationDeployedUrl: (convId, url) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, deployedUrl: url } : c
      ),
    }));
  },

  deleteConversation: (convId) => {
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== convId),
      activeConversationId: s.activeConversationId === convId ? null : s.activeConversationId,
    }));
  },
}));
