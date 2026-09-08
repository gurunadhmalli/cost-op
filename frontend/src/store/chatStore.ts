import { create } from 'zustand';
import { ChatMessage } from '../types';

interface ChatStore {
  isOpen: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  currentToolCall: { tool: string; args: Record<string, any>; status: 'running' | 'completed' } | null;

  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  addMessage: (message: ChatMessage) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setCurrentToolCall: (toolCall: { tool: string; args: Record<string, any>; status: 'running' | 'completed' } | null) => void;
  attachEvidenceCard: (messageId: string, evidenceCard: ChatMessage['evidenceCard']) => void;
  clearHistory: () => void;
}

const initialMessages: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'agent',
    text: 'Hello! I am your **AI Industrial Cost Optimization Assistant**. I continuously monitor plant telemetry, activity-based unit costs, and root causes.\n\nHow can I help you optimize your operations today?',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const useChatStore = create<ChatStore>((set) => ({
  isOpen: false,
  messages: initialMessages,
  isStreaming: false,
  currentToolCall: null,

  setIsOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setCurrentToolCall: (currentToolCall) => set({ currentToolCall }),
  attachEvidenceCard: (messageId, evidenceCard) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, evidenceCard } : m
      ),
    })),
  clearHistory: () => set({ messages: initialMessages }),
}));
