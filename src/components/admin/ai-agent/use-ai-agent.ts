'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAdminAiAgentStatus,
  postAdminAiAgentChat,
  type AiAgentMessage,
  type AiAgentStatus,
} from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* IA-11 — session de conversation admin (mémoire locale uniquement, jamais
 * persistée ; historique borné transmis à chaque question). Présentation
 * isolée Desktop/Mobile. Refresh manuel (nouvelle conversation). */

export const AI_AGENT_SUGGESTIONS = [
  'Techniciens disponibles',
  'Activité aujourd’hui',
  'Nouvelles inscriptions',
  'Missions en cours',
  'Techniciens en route',
  'Surveillance IA',
  'Demandes récentes',
] as const;

export interface UseAiAgent {
  messages: AiAgentMessage[];
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  error: string | null;
  status: AiAgentStatus | null;
  statusLoading: boolean;
  send: (text?: string) => void;
  reset: () => void;
}

export function useAiAgent(): UseAiAgent {
  const [messages, setMessages] = useState<AiAgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AiAgentStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getAdminAiAgentStatus()
      .then((res) => {
        if (!cancelled) setStatus(res);
      })
      .catch(() => {
        if (!cancelled) setStatus({ available: false, model: null, promptVersion: 1, reason: 'Statut indisponible.' });
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(
    (text?: string) => {
      const question = (text ?? input).trim();
      if (!question || busyRef.current) return;
      busyRef.current = true;
      setSending(true);
      setError(null);
      const history = messages.slice(-10);
      setMessages((prev) => [...prev, { role: 'user', content: question }]);
      setInput('');
      postAdminAiAgentChat(question, history)
        .then((res) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
        })
        .catch((err) => {
          setError(toUserErrorMessage(err, 'Envoi impossible pour le moment.'));
        })
        .finally(() => {
          busyRef.current = false;
          setSending(false);
        });
    },
    [input, messages],
  );

  const reset = useCallback(() => {
    if (busyRef.current) return;
    setMessages([]);
    setInput('');
    setError(null);
  }, []);

  return { messages, input, setInput, sending, error, status, statusLoading, send, reset };
}
