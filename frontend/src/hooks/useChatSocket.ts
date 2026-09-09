import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { wsUrl } from '../config';

// Backend wire protocol (backend/app/api/chat.py + app/agent/agent.py):
//   -> {"type": "user_message", "text": string}
//   <- {"type": "tool_call", "tool": string, "args": object}
//   <- {"type": "agent_text", "text": string}
//   <- {"type": "evidence_card", "data": {...}}
// See 15_Backend_Full_Specification.md Section 1.9.
function formatToolCall(tool: string, args: Record<string, any>): string {
  const parts = Object.entries(args || {}).map(
    ([k, v]) => `${k}=${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`
  );
  return `${tool}(${parts.join(', ')})`;
}

function buildChatWsUrl(): string {
  return wsUrl('/ws/chat');
}

/**
 * Shared connection to the Gemini-powered /ws/chat backend endpoint. Both
 * the floating ChatDrawer and the full /copilot page (CoPilotPage) use this
 * hook so they speak one implementation of the wire protocol and share one
 * message history via useChatStore — a message sent from either surface
 * shows up in both.
 *
 * `enabled` lets a caller open the socket only when it actually needs it
 * (ChatDrawer passes its own `isOpen` so a closed drawer doesn't hold a
 * connection open; CoPilotPage passes `true` since being on that route
 * means the user wants the assistant).
 */
export function useChatSocket(enabled: boolean = true) {
  const { addMessage, setIsStreaming, attachEvidenceCard } = useChatStore();
  const [isConnected, setIsConnected] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastAgentMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const ws = new WebSocket(buildChatWsUrl());
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event) => {
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === 'tool_call') {
        setActiveTool(formatToolCall(msg.tool, msg.args || {}));
      } else if (msg.type === 'agent_text') {
        setActiveTool(null);
        const id = `agent-${Date.now()}`;
        lastAgentMessageIdRef.current = id;
        addMessage({
          id,
          sender: 'agent',
          text: msg.text,
          timestamp: new Date().toISOString(),
        });
        setIsStreaming(false);
      } else if (msg.type === 'evidence_card' && lastAgentMessageIdRef.current) {
        attachEvidenceCard(lastAgentMessageIdRef.current, msg.data);
      }
    };

    ws.onerror = () => setIsConnected(false);
    ws.onclose = () => setIsConnected(false);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [enabled, addMessage, attachEvidenceCard, setIsStreaming]);

  const sendMessage = (text: string): boolean => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      addMessage({
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: "I can't reach the backend right now — make sure it's running (see backend/README.md) and try again.",
        timestamp: new Date().toISOString(),
      });
      return false;
    }
    setIsStreaming(true);
    lastAgentMessageIdRef.current = null;
    socket.send(JSON.stringify({ type: 'user_message', text }));
    return true;
  };

  return { isConnected, activeTool, sendMessage };
}
