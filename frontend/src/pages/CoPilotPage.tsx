import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Cpu,
} from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useChatSocket } from '../hooks/useChatSocket';
import { EvidenceCard } from '../components/copilot/EvidenceCard';

export const CoPilotPage: React.FC = () => {
  const { messages, isStreaming } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Always connected while this page is mounted — being on /copilot means
  // the user wants the live assistant, not the drawer's open/closed gating.
  const { isConnected, activeTool, sendMessage } = useChatSocket(true);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTool]);

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
    'Why did Line 3 cost spike this morning?',
    'What are our top 3 energy saving opportunities?',
    'Run What-If analysis on extruder temperature trim',
    'Show verified savings from last week’s actions',
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col neu-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-300/80 px-6 py-4 bg-[#EBF0F7]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-[3px_3px_8px_rgba(2,132,199,0.35)]">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-800 font-sans">
                AI Industrial Cost Co-Pilot
              </h2>
              <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-800 border border-sky-300">
                AI-Powered
              </span>
              <span
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold border ${
                  isConnected
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border-slate-300'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {isConnected ? 'LIVE' : 'CONNECTING…'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Natural Language Assistant with Prescriptive Evidence
            </p>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#EBF0F7]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs font-sans leading-relaxed ${
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

        {activeTool && (
          <div className="flex items-center gap-2 rounded-xl bg-sky-100 p-3 text-xs font-mono text-sky-900 border border-sky-300 animate-pulse">
            <Cpu className="h-4 w-4 text-sky-600 animate-spin" />
            <span>Executing Engine Tool: {activeTool}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="border-t border-slate-300/80 p-3 bg-[#EBF0F7]">
        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setInput(prompt)}
              className="neu-btn rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-700 hover:text-slate-900"
            >
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-3 border-t border-slate-300/80 p-4 bg-[#EBF0F7]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about industrial costs, anomalies, or root causes..."
          className="flex-1 rounded-xl neu-inset px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="neu-btn-primary flex h-11 px-5 items-center gap-2 rounded-xl text-xs font-bold disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          <span>Ask Co-Pilot</span>
        </button>
      </form>
    </div>
  );
};
