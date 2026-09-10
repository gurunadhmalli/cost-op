import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Cpu,
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useChatSocket } from '../../hooks/useChatSocket';
import { EvidenceCard } from './EvidenceCard';

export const ChatDrawer: React.FC = () => {
  const { isOpen, setIsOpen, messages, isStreaming } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Only holds a live connection while the drawer is actually open.
  const { isConnected, activeTool, sendMessage } = useChatSocket(isOpen);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTool]);

  if (!isOpen) return null;

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const userText = input.trim();
    if (!userText || isStreaming) return;

    setInput('');
    useChatStore.getState().addMessage({
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
    });
    sendMessage(userText);
  };

  const samplePrompts = [
    'Why did Line 3 cost increase today?',
    'What are the top 3 energy saving actions?',
    'Run What-If: reduce chiller setpoint by 3°C',
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-[#EBF0F7] border-l border-slate-300 shadow-[-8px_0_24px_rgba(202,212,226,0.5)]">
      {/* Drawer Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-300/80 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-[3px_3px_8px_rgba(2,132,199,0.35)]">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-800 font-sans text-sm">AI Cost Co-Pilot</h3>
              <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[9px] font-mono font-bold text-sky-800 border border-sky-300">
                AI-Powered
              </span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`}
                title={isConnected ? 'Connected to backend' : 'Not connected'}
              />
            </div>
            <p className="text-[11px] text-slate-500 font-mono">Natural Language Assistant</p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="neu-btn rounded-xl p-2 text-slate-600 hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] rounded-2xl p-4 text-xs font-sans leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-[4px_4px_12px_rgba(2,132,199,0.35)]'
                  : 'neu-card text-slate-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>

              {m.evidenceCard && <EvidenceCard data={m.evidenceCard} />}
            </div>
            <span className="mt-1 text-[10px] font-mono text-slate-400 px-1">
              {new Date(m.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}

        {/* Real-time Tool Execution Indicator */}
        {activeTool && (
          <div className="flex items-center gap-2 rounded-xl bg-sky-100 p-3 text-xs font-mono text-sky-900 border border-sky-300 animate-pulse">
            <Cpu className="h-4 w-4 text-sky-600 animate-spin" />
            <span>Executing Engine Tool: {activeTool}</span>
          </div>
        )}

        {isStreaming && !activeTool && (
          <div className="flex items-center gap-2 rounded-xl bg-sky-100 p-3 text-xs font-mono text-sky-900 border border-sky-300 animate-pulse">
            <Cpu className="h-4 w-4 text-sky-600 animate-spin" />
            <span>Co-Pilot is thinking…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="border-t border-slate-300/80 p-3 bg-[#EBF0F7]">
        <div className="flex flex-wrap gap-1.5">
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(prompt);
              }}
              className="neu-btn rounded-xl px-2.5 py-1 text-[10px] font-mono font-semibold text-slate-600 hover:text-slate-900"
            >
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-slate-300/80 p-4 bg-[#EBF0F7]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about costs, anomalies, or savings..."
          className="flex-1 rounded-xl neu-inset px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="neu-btn-primary flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
